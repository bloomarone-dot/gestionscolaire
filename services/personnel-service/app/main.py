"""personnel-service — enseignants (§7.1) et direction (§7.2).

Le compte de connexion (téléphone + mot de passe) est créé dans auth-service ;
ce service ne stocke que le profil métier + l'`account_id`.
"""
from fastapi import Depends, FastAPI, HTTPException, status
from sqlalchemy.orm import Session, sessionmaker

from common.db import Base, get_engine, init_engine
from common.tenant import TenantContext, require_roles, require_tenant

from app import auth_client, crud
from app.auth_client import AuthClientError
from app.config import settings
from app.models import ROLE_DIRECTION, ROLE_ENSEIGNANT, Personnel
from app.schemas import (
    DirectionCreate,
    EnseignantCreate,
    PersonnelDetail,
    PersonnelRow,
    PersonnelUpdate,
)

app = FastAPI(title="personnel-service — SaaS Scolaire", version="0.1.0")

_SessionLocal = None


@app.on_event("startup")
def _startup() -> None:
    global _SessionLocal
    init_engine(settings.database_url)
    Base.metadata.create_all(bind=get_engine())  # Alembic en Phase 5
    _SessionLocal = sessionmaker(bind=get_engine(), future=True)


def get_db() -> Session:
    db = _SessionLocal()
    try:
        yield db
    finally:
        db.close()


def _row(p: Personnel) -> PersonnelRow:
    return PersonnelRow(
        id=p.id, role_type=p.role_type, nom=p.nom, prenom=p.prenom, phone=p.phone,
        email=p.email, fonction=p.fonction, matieres=crud.subject_labels(p),
        is_active=p.is_active,
    )


def _detail(p: Personnel) -> PersonnelDetail:
    return PersonnelDetail(
        **_row(p).model_dump(), sexe=p.sexe, phone2=p.phone2,
        specialite=p.specialite, diplome=p.diplome, account_id=p.account_id,
        created_at=p.created_at,
    )


@app.get("/health", tags=["infra"])
def health() -> dict:
    return {"status": "ok", "service": "personnel-service"}


# ════════════════════════════════ ENSEIGNANTS ════════════════════════════════
@app.post("/personnel/enseignants", status_code=status.HTTP_201_CREATED, tags=["enseignants"])
def create_enseignant(
    payload: EnseignantCreate,
    db: Session = Depends(get_db),
    ctx: TenantContext = Depends(require_tenant),
    _: TenantContext = Depends(require_roles("admin")),
):
    account = None
    try:
        account = auth_client.create_login_account(
            ctx, phone=payload.phone, role="enseignant",
            first_name=payload.prenom, last_name=payload.nom,
            phone2=payload.phone2, email=payload.email, password=payload.password,
        )
        p = crud.create_enseignant(db, ctx.tenant_id, payload, account.get("id"))
    except AuthClientError as e:
        raise HTTPException(e.status_code, e.detail)
    except Exception as e:
        if account and account.get("id"):
            auth_client.delete_login_account(ctx, account["id"])
        raise HTTPException(status.HTTP_500_INTERNAL_SERVER_ERROR, f"Création enseignant impossible : {e}") from e
    return {"personnel": _detail(p).model_dump(), "generated_password": account.get("generated_password")}


@app.get("/personnel/enseignants", response_model=list[PersonnelRow], tags=["enseignants"])
def list_enseignants(db: Session = Depends(get_db), ctx: TenantContext = Depends(require_tenant)):
    return [_row(p) for p in crud.list_personnel(db, ctx.tenant_id, ROLE_ENSEIGNANT)]


# ════════════════════════════ DIRECTION / ADMIN ══════════════════════════════
@app.post("/personnel/direction", status_code=status.HTTP_201_CREATED, tags=["direction"])
def create_direction(
    payload: DirectionCreate,
    db: Session = Depends(get_db),
    ctx: TenantContext = Depends(require_tenant),
    _: TenantContext = Depends(require_roles("admin")),
):
    account = None
    try:
        account = auth_client.create_login_account(
            ctx, phone=payload.phone, role="direction",
            first_name=payload.prenom, last_name=payload.nom,
            phone2=payload.phone2, email=payload.email, password=payload.password,
        )
        p = crud.create_direction(db, ctx.tenant_id, payload, account.get("id"))
    except AuthClientError as e:
        raise HTTPException(e.status_code, e.detail)
    except Exception as e:
        if account and account.get("id"):
            auth_client.delete_login_account(ctx, account["id"])
        raise HTTPException(status.HTTP_500_INTERNAL_SERVER_ERROR, f"Création direction impossible : {e}") from e
    return {"personnel": _detail(p).model_dump(), "generated_password": account.get("generated_password")}


@app.get("/personnel/direction", response_model=list[PersonnelRow], tags=["direction"])
def list_direction(db: Session = Depends(get_db), ctx: TenantContext = Depends(require_tenant)):
    return [_row(p) for p in crud.list_personnel(db, ctx.tenant_id, ROLE_DIRECTION)]


# ════════════════════════════ TOUT LE PERSONNEL ══════════════════════════════
@app.get("/personnel", response_model=list[PersonnelRow], tags=["personnel"])
def list_all_personnel(db: Session = Depends(get_db), ctx: TenantContext = Depends(require_tenant)):
    """Liste l'ensemble du personnel (enseignants + direction/administration)."""
    return [_row(p) for p in crud.list_personnel(db, ctx.tenant_id)]


@app.get("/personnel/me", response_model=PersonnelDetail, tags=["personnel"])
def my_personnel(db: Session = Depends(get_db), ctx: TenantContext = Depends(require_tenant)):
    """Fiche personnel de l'utilisateur connecté (pour filtrer ses classes/matières)."""
    p = crud.get_by_account(db, ctx.tenant_id, ctx.user_id)
    if not p:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Aucune fiche personnel pour ce compte")
    return _detail(p)


# ════════════════════════════════ COMMUN ═════════════════════════════════════
@app.get("/personnel/{personnel_id}", response_model=PersonnelDetail, tags=["personnel"])
def get_personnel(
    personnel_id: int,
    db: Session = Depends(get_db),
    ctx: TenantContext = Depends(require_tenant),
):
    try:
        return _detail(crud.get_personnel(db, ctx.tenant_id, personnel_id))
    except crud.NotFound as e:
        raise HTTPException(status.HTTP_404_NOT_FOUND, str(e))


@app.put("/personnel/{personnel_id}", response_model=PersonnelDetail, tags=["personnel"])
def update_personnel(
    personnel_id: int,
    payload: PersonnelUpdate,
    db: Session = Depends(get_db),
    ctx: TenantContext = Depends(require_tenant),
):
    try:
        return _detail(crud.update_personnel(db, ctx.tenant_id, personnel_id, payload))
    except crud.NotFound as e:
        raise HTTPException(status.HTTP_404_NOT_FOUND, str(e))


@app.delete("/personnel/{personnel_id}", status_code=status.HTTP_204_NO_CONTENT, tags=["personnel"])
def delete_personnel(
    personnel_id: int,
    db: Session = Depends(get_db),
    ctx: TenantContext = Depends(require_tenant),
    _: TenantContext = Depends(require_roles("admin")),
):
    try:
        p = crud.get_personnel(db, ctx.tenant_id, personnel_id)
        account_id = p.account_id
        crud.delete_personnel(db, ctx.tenant_id, personnel_id)
        if account_id:
            auth_client.delete_login_account(ctx, account_id)
    except crud.NotFound as e:
        raise HTTPException(status.HTTP_404_NOT_FOUND, str(e))
