"""planning-service — salles et emploi du temps (phase 6)."""
from fastapi import Depends, FastAPI, HTTPException, status
from sqlalchemy.orm import Session, sessionmaker

from common.db import Base, get_engine, init_engine
from common.roles import ESTABLISHMENT_STAFF, PLANNING_STAFF
from common.tenant import TenantContext, require_tenant

from app import crud
from app.config import settings
from app.schemas import (
    SalleCreate,
    SalleOut,
    SalleUpdate,
    SeanceCreate,
    SeanceOut,
    SeanceUpdate,
    SemaineOut,
)

app = FastAPI(title="planning-service — SaaS Scolaire", version="0.1.0")

_SessionLocal = None


@app.on_event("startup")
def _startup() -> None:
    global _SessionLocal
    init_engine(settings.database_url)
    Base.metadata.create_all(bind=get_engine())
    _SessionLocal = sessionmaker(bind=get_engine(), future=True)


def get_db() -> Session:
    db = _SessionLocal()
    try:
        yield db
    finally:
        db.close()


def require_planning_read(ctx: TenantContext = Depends(require_tenant)) -> TenantContext:
    if ctx.role not in ESTABLISHMENT_STAFF:
        raise HTTPException(status.HTTP_403_FORBIDDEN, "Accès planning non autorisé.")
    return ctx


def require_planning_write(ctx: TenantContext = Depends(require_tenant)) -> TenantContext:
    if ctx.role not in PLANNING_STAFF:
        raise HTTPException(status.HTTP_403_FORBIDDEN, "Modification du planning réservée au personnel autorisé.")
    return ctx


@app.get("/health", tags=["infra"])
def health() -> dict:
    return {"status": "ok", "service": "planning-service"}


# ── Salles ────────────────────────────────────────────────────────────────────
@app.get("/planning/salles", response_model=list[SalleOut], tags=["planning"])
def list_salles(
    actives_only: bool = False,
    db: Session = Depends(get_db),
    ctx: TenantContext = Depends(require_planning_read),
):
    return crud.list_salles(db, ctx.tenant_id, actives_only=actives_only)


@app.post("/planning/salles", response_model=SalleOut, status_code=status.HTTP_201_CREATED, tags=["planning"])
def create_salle(
    payload: SalleCreate,
    db: Session = Depends(get_db),
    ctx: TenantContext = Depends(require_planning_write),
):
    return crud.create_salle(db, ctx.tenant_id, payload)


@app.patch("/planning/salles/{salle_id}", response_model=SalleOut, tags=["planning"])
def update_salle(
    salle_id: int,
    payload: SalleUpdate,
    db: Session = Depends(get_db),
    ctx: TenantContext = Depends(require_planning_write),
):
    try:
        return crud.update_salle(db, ctx.tenant_id, salle_id, payload)
    except LookupError:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Salle introuvable") from None


@app.delete("/planning/salles/{salle_id}", status_code=status.HTTP_204_NO_CONTENT, tags=["planning"])
def delete_salle(
    salle_id: int,
    db: Session = Depends(get_db),
    ctx: TenantContext = Depends(require_planning_write),
):
    try:
        crud.delete_salle(db, ctx.tenant_id, salle_id)
    except LookupError:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Salle introuvable") from None


# ── Séances ───────────────────────────────────────────────────────────────────
@app.get("/planning/seances", response_model=list[SeanceOut], tags=["planning"])
def list_seances(
    classe_id: int | None = None,
    salle_id: int | None = None,
    jour_semaine: int | None = None,
    enseignant_id: int | None = None,
    db: Session = Depends(get_db),
    ctx: TenantContext = Depends(require_planning_read),
):
    return crud.list_seances(
        db, ctx.tenant_id,
        classe_id=classe_id, salle_id=salle_id,
        jour_semaine=jour_semaine, enseignant_id=enseignant_id,
    )


@app.get("/planning/semaine", response_model=SemaineOut, tags=["planning"])
def planning_semaine(
    classe_id: int | None = None,
    salle_id: int | None = None,
    db: Session = Depends(get_db),
    ctx: TenantContext = Depends(require_planning_read),
):
    days = crud.semaine(db, ctx.tenant_id, classe_id=classe_id, salle_id=salle_id)
    return SemaineOut(jours={str(k): [SeanceOut.model_validate(s) for s in v] for k, v in days.items()})


@app.post("/planning/seances", response_model=SeanceOut, status_code=status.HTTP_201_CREATED, tags=["planning"])
def create_seance(
    payload: SeanceCreate,
    db: Session = Depends(get_db),
    ctx: TenantContext = Depends(require_planning_write),
):
    try:
        return crud.create_seance(db, ctx.tenant_id, payload)
    except ValueError as exc:
        raise HTTPException(status.HTTP_409_CONFLICT, str(exc)) from exc


@app.patch("/planning/seances/{seance_id}", response_model=SeanceOut, tags=["planning"])
def update_seance(
    seance_id: int,
    payload: SeanceUpdate,
    db: Session = Depends(get_db),
    ctx: TenantContext = Depends(require_planning_write),
):
    try:
        return crud.update_seance(db, ctx.tenant_id, seance_id, payload)
    except LookupError:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Séance introuvable") from None
    except ValueError as exc:
        raise HTTPException(status.HTTP_409_CONFLICT, str(exc)) from exc


@app.delete("/planning/seances/{seance_id}", status_code=status.HTTP_204_NO_CONTENT, tags=["planning"])
def delete_seance(
    seance_id: int,
    db: Session = Depends(get_db),
    ctx: TenantContext = Depends(require_planning_write),
):
    try:
        crud.delete_seance(db, ctx.tenant_id, seance_id)
    except LookupError:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Séance introuvable") from None
