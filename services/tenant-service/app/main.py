"""tenant-service — profil école, filtre amont (§14), canaux de notification (§12.2)."""
from fastapi import Depends, FastAPI, HTTPException, status
from sqlalchemy.orm import Session, sessionmaker

from common.db import Base, add_missing_columns, get_engine, init_engine
from common.tenant import TenantContext, get_context, require_roles

from app import crud
from app.config import settings
from app.schemas import (
    ProfileUpdate,
    SchoolCreate,
    SchoolListItem,
    SchoolProfile,
    SchoolUpdate,
)

app = FastAPI(title="tenant-service — SaaS Scolaire", version="0.1.0")

_SessionLocal = None


@app.on_event("startup")
def _startup() -> None:
    global _SessionLocal
    init_engine(settings.database_url)
    Base.metadata.create_all(bind=get_engine())  # Alembic en Phase 5
    add_missing_columns("schools", {
        "bulletin_delegation_regional": "VARCHAR(255)",
        "bulletin_delegation_departementale": "VARCHAR(255)",
        "bulletin_next_term_note": "VARCHAR(255)",
    })
    _SessionLocal = sessionmaker(bind=get_engine(), future=True)


def get_db() -> Session:
    db = _SessionLocal()
    try:
        yield db
    finally:
        db.close()


def _ensure_can_access(ctx: TenantContext, school_id: int) -> None:
    """Superadmin : tout ; autres : uniquement leur propre école."""
    if ctx.role == "superadmin":
        return
    if ctx.tenant_id != school_id:
        raise HTTPException(status.HTTP_403_FORBIDDEN, "Accès à une autre école interdit")


@app.get("/health", tags=["infra"])
def health() -> dict:
    return {"status": "ok", "service": "tenant-service"}


@app.post("/tenants/schools", response_model=SchoolProfile,
          status_code=status.HTTP_201_CREATED, tags=["tenant"])
def create_school(
    payload: SchoolCreate,
    db: Session = Depends(get_db),
    _: TenantContext = Depends(require_roles("superadmin")),
):
    school = crud.create_school(db, payload)
    return crud.to_profile(school)


@app.get("/tenants/schools", response_model=list[SchoolListItem], tags=["tenant"])
def list_schools(db: Session = Depends(get_db), ctx: TenantContext = Depends(get_context)):
    only = None if ctx.role == "superadmin" else ctx.tenant_id
    return crud.list_schools(db, only_id=only)


@app.get("/tenants/me", response_model=SchoolProfile, tags=["tenant"])
def my_school(db: Session = Depends(get_db), ctx: TenantContext = Depends(get_context)):
    if ctx.tenant_id is None:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "Aucune école associée au compte")
    school = crud.get_school(db, ctx.tenant_id)
    if not school:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "École introuvable")
    return crud.to_profile(school)


@app.get("/tenants/schools/{school_id}", response_model=SchoolProfile, tags=["tenant"])
def get_school(
    school_id: int,
    db: Session = Depends(get_db),
    ctx: TenantContext = Depends(get_context),
):
    _ensure_can_access(ctx, school_id)
    school = crud.get_school(db, school_id)
    if not school:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "École introuvable")
    return crud.to_profile(school)


@app.put("/tenants/schools/{school_id}", response_model=SchoolProfile, tags=["tenant"])
def update_school(
    school_id: int,
    payload: SchoolUpdate,
    db: Session = Depends(get_db),
    ctx: TenantContext = Depends(get_context),
):
    _ensure_can_access(ctx, school_id)
    school = crud.get_school(db, school_id)
    if not school:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "École introuvable")
    for field, value in payload.model_dump(exclude_unset=True).items():
        setattr(school, field, value)
    db.commit()
    db.refresh(school)
    return crud.to_profile(school)


@app.delete("/tenants/schools/{school_id}", status_code=status.HTTP_204_NO_CONTENT, tags=["tenant"])
def delete_school(
    school_id: int,
    db: Session = Depends(get_db),
    _: TenantContext = Depends(require_roles("superadmin")),
):
    if not crud.delete_school(db, school_id):
        raise HTTPException(status.HTTP_404_NOT_FOUND, "École introuvable")


@app.put("/tenants/schools/{school_id}/profile", response_model=SchoolProfile, tags=["tenant"])
def update_profile(
    school_id: int,
    payload: ProfileUpdate,
    db: Session = Depends(get_db),
    ctx: TenantContext = Depends(get_context),
):
    """Met à jour le filtre amont (sous-systèmes/types) et les canaux de notif."""
    _ensure_can_access(ctx, school_id)
    school = crud.get_school(db, school_id)
    if not school:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "École introuvable")
    crud.set_profile(db, school, payload.subsystems, payload.teaching_types, payload.channels)
    return crud.to_profile(school)
