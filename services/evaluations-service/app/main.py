"""evaluations-service — saisie des notes (§11.1) et fenêtres de saisie."""
from fastapi import Depends, FastAPI, HTTPException, status
from sqlalchemy.orm import Session, sessionmaker

from common.db import Base, get_engine, init_engine
from common.events import EventPublisher
from common.tenant import TenantContext, require_tenant

from app import crud
from app.config import settings
from app.schemas import (
    NoteBulkIn,
    NoteIn,
    NoteOut,
    PeriodeIn,
    PeriodeOut,
)

app = FastAPI(title="evaluations-service — SaaS Scolaire", version="0.1.0")

_SessionLocal = None
_publisher: EventPublisher | None = None


@app.on_event("startup")
def _startup() -> None:
    global _SessionLocal, _publisher
    init_engine(settings.database_url)
    Base.metadata.create_all(bind=get_engine())  # Alembic en Phase 5
    _SessionLocal = sessionmaker(bind=get_engine(), future=True)
    _publisher = EventPublisher(settings.rabbitmq_url, settings.events_exchange)


def get_db() -> Session:
    db = _SessionLocal()
    try:
        yield db
    finally:
        db.close()


# Saisie réservée au personnel (enseignant, direction/censeur, admin) — pas les parents.
STAFF_ROLES = {"admin", "direction", "enseignant", "superadmin"}


def require_staff(ctx: TenantContext = Depends(require_tenant)) -> TenantContext:
    if ctx.role not in STAFF_ROLES:
        raise HTTPException(status.HTTP_403_FORBIDDEN, "Saisie des notes réservée au personnel.")
    return ctx


@app.get("/health", tags=["infra"])
def health() -> dict:
    return {"status": "ok", "service": "evaluations-service"}


# ════════════════════════════════ NOTES ══════════════════════════════════════
@app.post("/evaluations/notes", response_model=NoteOut, status_code=status.HTTP_201_CREATED, tags=["notes"])
def create_note(payload: NoteIn, db: Session = Depends(get_db), ctx: TenantContext = Depends(require_staff)):
    try:
        note = crud.upsert_note(db, ctx.tenant_id, payload)
    except crud.EntryClosed as e:
        raise HTTPException(status.HTTP_403_FORBIDDEN, str(e))
    if _publisher:
        _publisher.publish("GradesEntered", {
            "tenant_id": ctx.tenant_id, "classe_id": note.classe_id, "matiere_id": note.matiere_id,
        })
    return note


@app.post("/evaluations/notes/bulk", response_model=list[NoteOut], tags=["notes"])
def bulk_notes(payload: NoteBulkIn, db: Session = Depends(get_db), ctx: TenantContext = Depends(require_staff)):
    try:
        notes = crud.bulk_upsert(db, ctx.tenant_id, payload)
    except crud.EntryClosed as e:
        raise HTTPException(status.HTTP_403_FORBIDDEN, str(e))
    if _publisher and notes:
        _publisher.publish("GradesEntered", {
            "tenant_id": ctx.tenant_id, "classe_id": payload.classe_id, "matiere_id": payload.matiere_id,
        })
    return notes


@app.get("/evaluations/notes", response_model=list[NoteOut], tags=["notes"])
def list_notes(
    classe_id: int | None = None,
    matiere_id: int | None = None,
    eleve_id: int | None = None,
    trimestre: int | None = None,
    type_evaluation: str | None = None,
    db: Session = Depends(get_db),
    ctx: TenantContext = Depends(require_tenant),
):
    return crud.list_notes(
        db, ctx.tenant_id, classe_id=classe_id, matiere_id=matiere_id,
        eleve_id=eleve_id, trimestre=trimestre, type_evaluation=type_evaluation,
    )


@app.delete("/evaluations/notes/{note_id}", status_code=status.HTTP_204_NO_CONTENT, tags=["notes"])
def delete_note(note_id: int, db: Session = Depends(get_db), ctx: TenantContext = Depends(require_staff)):
    try:
        crud.delete_note(db, ctx.tenant_id, note_id)
    except crud.NotFound as e:
        raise HTTPException(status.HTTP_404_NOT_FOUND, str(e))


# ════════════════════════ FENÊTRES DE SAISIE ═════════════════════════════════
@app.post("/evaluations/periodes", response_model=PeriodeOut, status_code=status.HTTP_201_CREATED, tags=["periodes"])
def create_periode(payload: PeriodeIn, db: Session = Depends(get_db), ctx: TenantContext = Depends(require_staff)):
    return crud.create_periode(db, ctx.tenant_id, payload)


@app.get("/evaluations/periodes", response_model=list[PeriodeOut], tags=["periodes"])
def list_periodes(classe_id: int | None = None, db: Session = Depends(get_db), ctx: TenantContext = Depends(require_tenant)):
    return crud.list_periodes(db, ctx.tenant_id, classe_id)


@app.get("/evaluations/verifier-periode", tags=["periodes"])
def verifier_periode(
    classe_id: int,
    matiere_id: int | None = None,
    db: Session = Depends(get_db),
    ctx: TenantContext = Depends(require_tenant),
):
    return {"open": crud.is_entry_open(db, ctx.tenant_id, classe_id, matiere_id)}
