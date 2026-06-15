"""Logique métier evaluations-service (pure et testable)."""
from datetime import date
from typing import Optional

from sqlalchemy.orm import Session

from app.models import Note, PeriodeSaisie
from app.schemas import NoteBulkIn, NoteIn, PeriodeIn


class NotFound(Exception):
    pass


class EntryClosed(Exception):
    """Saisie hors de la fenêtre autorisée (délais de saisie)."""


def is_entry_open(
    db: Session, tenant_id: int, classe_id: int, matiere_id: Optional[int],
    when: Optional[date] = None,
) -> bool:
    """Vrai si la saisie est autorisée. Sans fenêtre définie → toujours autorisée."""
    when = when or date.today()
    periodes = (
        db.query(PeriodeSaisie)
        .filter(
            PeriodeSaisie.tenant_id == tenant_id,
            PeriodeSaisie.classe_id == classe_id,
            PeriodeSaisie.is_open.is_(True),
        )
        .all()
    )
    relevant = [
        p for p in periodes
        if p.matiere_id is None or p.matiere_id == matiere_id
    ]
    if not relevant:
        return True
    return any(p.date_debut <= when <= p.date_fin for p in relevant)


def _existing(db: Session, tenant_id: int, eleve_id: int, matiere_id: int,
              trimestre: int, type_evaluation: str) -> Optional[Note]:
    return (
        db.query(Note)
        .filter(
            Note.tenant_id == tenant_id, Note.eleve_id == eleve_id,
            Note.matiere_id == matiere_id, Note.trimestre == trimestre,
            Note.type_evaluation == type_evaluation,
        )
        .first()
    )


def upsert_note(db: Session, tenant_id: int, payload: NoteIn, *, enforce_window: bool = True) -> Note:
    if enforce_window and not is_entry_open(db, tenant_id, payload.classe_id, payload.matiere_id):
        raise EntryClosed("La période de saisie est fermée pour cette classe/matière.")
    note = _existing(db, tenant_id, payload.eleve_id, payload.matiere_id,
                     payload.trimestre, payload.type_evaluation)
    if note:
        note.valeur = payload.valeur
        note.description = payload.description
        if payload.enseignant_id is not None:
            note.enseignant_id = payload.enseignant_id
    else:
        note = Note(
            tenant_id=tenant_id, eleve_id=payload.eleve_id, classe_id=payload.classe_id,
            matiere_id=payload.matiere_id, enseignant_id=payload.enseignant_id,
            trimestre=payload.trimestre, type_evaluation=payload.type_evaluation,
            valeur=payload.valeur, description=payload.description,
        )
        db.add(note)
    db.commit()
    db.refresh(note)
    return note


def bulk_upsert(db: Session, tenant_id: int, payload: NoteBulkIn, *, enforce_window: bool = True) -> list[Note]:
    if enforce_window and not is_entry_open(db, tenant_id, payload.classe_id, payload.matiere_id):
        raise EntryClosed("La période de saisie est fermée pour cette classe/matière.")
    saved = []
    for item in payload.notes:
        saved.append(upsert_note(db, tenant_id, NoteIn(
            eleve_id=item.eleve_id, classe_id=payload.classe_id,
            matiere_id=payload.matiere_id, valeur=item.valeur,
            trimestre=payload.trimestre, type_evaluation=payload.type_evaluation,
            enseignant_id=payload.enseignant_id,
        ), enforce_window=False))
    return saved


def list_notes(
    db: Session, tenant_id: int, *, classe_id: Optional[int] = None,
    matiere_id: Optional[int] = None, eleve_id: Optional[int] = None,
    trimestre: Optional[int] = None, type_evaluation: Optional[str] = None,
) -> list[Note]:
    q = db.query(Note).filter(Note.tenant_id == tenant_id)
    if classe_id is not None:
        q = q.filter(Note.classe_id == classe_id)
    if matiere_id is not None:
        q = q.filter(Note.matiere_id == matiere_id)
    if eleve_id is not None:
        q = q.filter(Note.eleve_id == eleve_id)
    if trimestre is not None:
        q = q.filter(Note.trimestre == trimestre)
    if type_evaluation is not None:
        q = q.filter(Note.type_evaluation == type_evaluation)
    return q.order_by(Note.eleve_id, Note.matiere_id).all()


def delete_note(db: Session, tenant_id: int, note_id: int) -> None:
    note = db.query(Note).filter(Note.tenant_id == tenant_id, Note.id == note_id).first()
    if not note:
        raise NotFound("Note introuvable")
    db.delete(note)
    db.commit()


def create_periode(db: Session, tenant_id: int, payload: PeriodeIn) -> PeriodeSaisie:
    p = PeriodeSaisie(
        tenant_id=tenant_id, classe_id=payload.classe_id, matiere_id=payload.matiere_id,
        trimestre=payload.trimestre, type_evaluation=payload.type_evaluation,
        date_debut=payload.date_debut, date_fin=payload.date_fin,
    )
    db.add(p)
    db.commit()
    db.refresh(p)
    return p


def list_periodes(db: Session, tenant_id: int, classe_id: Optional[int] = None) -> list[PeriodeSaisie]:
    q = db.query(PeriodeSaisie).filter(PeriodeSaisie.tenant_id == tenant_id)
    if classe_id is not None:
        q = q.filter(PeriodeSaisie.classe_id == classe_id)
    return q.order_by(PeriodeSaisie.date_debut).all()
