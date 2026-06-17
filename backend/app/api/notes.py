"""
Endpoints Notes — CRUD complet pour professeurs et administrateurs.
"""
from datetime import datetime, date
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, ConfigDict
from sqlalchemy import and_
from sqlalchemy.orm import Session

from app.auth.security import get_current_user
from app.db.multi_tenant import get_tenant_session
from app.models.school import (
    Note, Professeur, Classe, Matiere, AttributionProfesseur,
    Eleve, PeriodeSaisieNotes
)

router = APIRouter(prefix="/notes", tags=["Notes"])


# ──────────────────────────────────────────────────────────
# Schémas Pydantic
# ──────────────────────────────────────────────────────────

class NoteCreate(BaseModel):
    eleve_id: int
    matiere_id: int
    valeur: float
    coefficient: Optional[float] = 1.0
    commentaire: Optional[str] = None


class NoteUpdate(BaseModel):
    valeur: Optional[float] = None
    coefficient: Optional[float] = None
    commentaire: Optional[str] = None


class NoteResponse(BaseModel):
    id: int
    eleve_id: int
    matiere_id: int
    professeur_id: int
    valeur: float
    coefficient: float
    commentaire: Optional[str]
    date_creation: datetime
    date_saisie: datetime

    model_config = ConfigDict(from_attributes=True)


class PeriodeCreate(BaseModel):
    classe_id: int
    matiere_id: int
    date_debut: date
    date_fin: date
    justification_autorisee: Optional[bool] = True


class PeriodeResponse(BaseModel):
    id: int
    classe_id: int
    matiere_id: int
    date_debut: date
    date_fin: date
    justification_autorisee: bool
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


class SaisieVerificationResponse(BaseModel):
    peut_saisir: bool
    raison: Optional[str] = None
    periode: Optional[PeriodeResponse] = None


# ──────────────────────────────────────────────────────────
# Helpers
# ──────────────────────────────────────────────────────────

def _note_to_response(note: Note) -> dict:
    return {
        "id": note.id,
        "eleve_id": note.eleve_id,
        "matiere_id": note.matiere_id,
        "professeur_id": note.professeur_id,
        "valeur": note.valeur,
        "coefficient": note.coefficient,
        "commentaire": note.description,
        "date_creation": note.date_creation,
        "date_saisie": note.date_saisie,
    }


def _verifier_periode_saisie(db: Session, classe_id: int, matiere_id: int) -> SaisieVerificationResponse:
    """Vérifie si la saisie des notes est autorisée pour une classe/matière donnée."""
    periode = db.query(PeriodeSaisieNotes).filter(
        and_(
            PeriodeSaisieNotes.classe_id == classe_id,
            PeriodeSaisieNotes.matiere_id == matiere_id,
            PeriodeSaisieNotes.date_debut <= date.today(),
            PeriodeSaisieNotes.date_fin >= date.today(),
        )
    ).first()

    if not periode:
        return SaisieVerificationResponse(
            peut_saisir=False,
            raison="Aucune période de saisie configurée pour cette classe et matière"
        )

    return SaisieVerificationResponse(
        peut_saisir=True,
        periode=PeriodeResponse(
            id=periode.id,
            classe_id=periode.classe_id,
            matiere_id=periode.matiere_id,
            date_debut=periode.date_debut,
            date_fin=periode.date_fin,
            justification_autorisee=periode.justification_autorisee,
            created_at=periode.created_at,
            updated_at=periode.updated_at,
        )
    )


def _require_professor_or_admin(current_user: dict):
    role = current_user.get("role")
    if role not in ["professeur", "admin"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Accès réservé aux professeurs et administrateurs"
        )


# ──────────────────────────────────────────────────────────
# Notes — Lecture
# ──────────────────────────────────────────────────────────

@router.get("/", response_model=List[NoteResponse])
def list_notes(
    eleve_id: Optional[int] = None,
    classe_id: Optional[int] = None,
    matiere_id: Optional[int] = None,
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_tenant_session),
):
    """Liste les notes avec filtres optionnels."""
    _require_professor_or_admin(current_user)
    role = current_user.get("role")
    professeur_id = current_user.get("id")

    query = db.query(Note)

    if eleve_id:
        query = query.filter(Note.eleve_id == eleve_id)
    if matiere_id:
        query = query.filter(Note.matiere_id == matiere_id)

    if role == "professeur":
        query = query.filter(Note.professeur_id == professeur_id)
        if classe_id:
            eleves_classe = db.query(Eleve.id).filter(Eleve.classe_id == classe_id).subquery()
            query = query.filter(Note.eleve_id.in_(eleves_classe))
    elif role == "admin" and classe_id:
        eleves_classe = db.query(Eleve.id).filter(Eleve.classe_id == classe_id).subquery()
        query = query.filter(Note.eleve_id.in_(eleves_classe))

    notes = query.order_by(Note.date_saisie.desc()).all()
    return [_note_to_response(n) for n in notes]


@router.get("/{note_id}", response_model=NoteResponse)
def get_note(
    note_id: int,
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_tenant_session),
):
    """Récupère une note par ID."""
    _require_professor_or_admin(current_user)
    role = current_user.get("role")
    professeur_id = current_user.get("id")

    note = db.query(Note).filter(Note.id == note_id).first()
    if not note:
        raise HTTPException(status_code=404, detail="Note non trouvée")

    if role == "professeur" and note.professeur_id != professeur_id:
        raise HTTPException(status_code=403, detail="Accès refusé")

    return _note_to_response(note)


# ──────────────────────────────────────────────────────────
# Notes — Création
# ──────────────────────────────────────────────────────────

@router.post("/", response_model=NoteResponse, status_code=status.HTTP_201_CREATED)
def create_note(
    note_data: NoteCreate,
    justification: Optional[str] = None,
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_tenant_session),
):
    """Crée une note (vérifie la période de saisie hors délai)."""
    _require_professor_or_admin(current_user)
    role = current_user.get("role")
    professeur_id = current_user.get("id")

    if note_data.valeur < 0 or note_data.valeur > 20:
        raise HTTPException(status_code=400, detail="La note doit être comprise entre 0 et 20")

    eleve = db.query(Eleve).filter(Eleve.id == note_data.eleve_id).first()
    if not eleve or not eleve.classe_id:
        raise HTTPException(status_code=404, detail="Élève non trouvé ou non assigné à une classe")

    attribution = db.query(AttributionProfesseur).filter(
        and_(
            AttributionProfesseur.classe_id == eleve.classe_id,
            AttributionProfesseur.matiere_id == note_data.matiere_id,
            AttributionProfesseur.is_active == True,
        )
    ).first()
    if not attribution:
        raise HTTPException(status_code=400, detail="Aucune attribution pour cette classe/matière")

    if role == "professeur":
        prof_attribution = db.query(AttributionProfesseur).filter(
            and_(
                AttributionProfesseur.professeur_id == professeur_id,
                AttributionProfesseur.classe_id == eleve.classe_id,
                AttributionProfesseur.matiere_id == note_data.matiere_id,
                AttributionProfesseur.is_active == True,
            )
        ).first()
        if not prof_attribution:
            raise HTTPException(status_code=403, detail="Matière non assignée à ce professeur")

    verification = _verifier_periode_saisie(db, eleve.classe_id, note_data.matiere_id)
    if not verification.peut_saisir:
        if role == "professeur" and verification.periode and verification.periode.justification_autorisee:
            if not justification or len(justification.strip()) < 10:
                raise HTTPException(
                    status_code=403,
                    detail=f"Saisie hors délai. {verification.raison}. Une justification d'au moins 10 caractères est requise."
                )
        else:
            raise HTTPException(
                status_code=403,
                detail=f"Saisie non autorisée. {verification.raison}"
            )

    effective_professeur_id = professeur_id if role == "professeur" else attribution.professeur_id

    existing_note = db.query(Note).filter(
        and_(
            Note.eleve_id == note_data.eleve_id,
            Note.matiere_id == note_data.matiere_id,
            Note.professeur_id == effective_professeur_id,
        )
    ).first()

    if existing_note:
        existing_note.valeur = note_data.valeur
        existing_note.coefficient = note_data.coefficient
        existing_note.description = note_data.commentaire
        existing_note.date_saisie = datetime.utcnow()
        db.commit()
        db.refresh(existing_note)
        return _note_to_response(existing_note)

    new_note = Note(
        eleve_id=note_data.eleve_id,
        matiere_id=note_data.matiere_id,
        professeur_id=effective_professeur_id,
        valeur=note_data.valeur,
        coefficient=note_data.coefficient,
        description=note_data.commentaire,
        date_creation=datetime.utcnow(),
        date_saisie=datetime.utcnow(),
    )
    db.add(new_note)
    db.commit()
    db.refresh(new_note)
    return _note_to_response(new_note)


# ──────────────────────────────────────────────────────────
# Notes — Modification
# ──────────────────────────────────────────────────────────

@router.put("/{note_id}", response_model=NoteResponse)
def update_note(
    note_id: int,
    note_update: NoteUpdate,
    justification: Optional[str] = None,
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_tenant_session),
):
    """Modifie une note existante."""
    _require_professor_or_admin(current_user)
    role = current_user.get("role")
    professeur_id = current_user.get("id")

    note = db.query(Note).filter(Note.id == note_id).first()
    if not note:
        raise HTTPException(status_code=404, detail="Note non trouvée")

    eleve = db.query(Eleve).filter(Eleve.id == note.eleve_id).first()
    if not eleve or not eleve.classe_id:
        raise HTTPException(status_code=404, detail="Élève non trouvé")

    if role == "professeur" and note.professeur_id != professeur_id:
        raise HTTPException(status_code=403, detail="Vous ne pouvez modifier que vos propres notes")

    if note_update.valeur is not None and (note_update.valeur < 0 or note_update.valeur > 20):
        raise HTTPException(status_code=400, detail="La note doit être comprise entre 0 et 20")

    verification = _verifier_periode_saisie(db, eleve.classe_id, note.matiere_id)
    if not verification.peut_saisir:
        if role == "professeur" and verification.periode and verification.periode.justification_autorisee:
            if not justification or len(justification.strip()) < 10:
                raise HTTPException(
                    status_code=403,
                    detail=f"Modification hors délai. {verification.raison}. Une justification d'au moins 10 caractères est requise."
                )
        else:
            raise HTTPException(
                status_code=403,
                detail=f"Modification non autorisée. {verification.raison}"
            )

    update_data = note_update.dict(exclude_unset=True)
    for field, value in update_data.items():
        setattr(note, field, value)
    note.date_saisie = datetime.utcnow()

    db.commit()
    db.refresh(note)
    return _note_to_response(note)


# ──────────────────────────────────────────────────────────
# Notes — Suppression (admin uniquement)
# ──────────────────────────────────────────────────────────

@router.delete("/{note_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_note(
    note_id: int,
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_tenant_session),
):
    """Supprime une note (admin uniquement)."""
    if current_user.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Seul un administrateur peut supprimer des notes")

    note = db.query(Note).filter(Note.id == note_id).first()
    if not note:
        raise HTTPException(status_code=404, detail="Note non trouvée")

    db.delete(note)
    db.commit()


# ──────────────────────────────────────────────────────────
# Période de saisie — CRUD (admin uniquement)
# ──────────────────────────────────────────────────────────

@router.get("/periode-saisie", response_model=List[PeriodeResponse])
def list_periodes(
    classe_id: Optional[int] = None,
    matiere_id: Optional[int] = None,
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_tenant_session),
):
    """Liste les périodes de saisie configurées (admin)."""
    if current_user.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Accès réservé aux administrateurs")

    query = db.query(PeriodeSaisieNotes)
    if classe_id:
        query = query.filter(PeriodeSaisieNotes.classe_id == classe_id)
    if matiere_id:
        query = query.filter(PeriodeSaisieNotes.matiere_id == matiere_id)

    return query.order_by(PeriodeSaisieNotes.date_debut.desc()).all()


@router.get("/periode-saisie/{periode_id}", response_model=PeriodeResponse)
def get_periode(
    periode_id: int,
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_tenant_session),
):
    """Récupère une période de saisie par ID."""
    if current_user.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Accès réservé aux administrateurs")

    periode = db.query(PeriodeSaisieNotes).filter(PeriodeSaisieNotes.id == periode_id).first()
    if not periode:
        raise HTTPException(status_code=404, detail="Période non trouvée")

    return PeriodeResponse(
        id=periode.id,
        classe_id=periode.classe_id,
        matiere_id=periode.matiere_id,
        date_debut=periode.date_debut,
        date_fin=periode.date_fin,
        justification_autorisee=periode.justification_autorisee,
        created_at=periode.created_at,
        updated_at=periode.updated_at,
    )


@router.post("/periode-saisie", response_model=PeriodeResponse, status_code=status.HTTP_201_CREATED)
def create_periode(
    periode_data: PeriodeCreate,
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_tenant_session),
):
    """Crée ou remplace une période de saisie pour une classe/matière."""
    if current_user.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Accès réservé aux administrateurs")

    if periode_data.date_fin < periode_data.date_debut:
        raise HTTPException(status_code=400, detail="La date de fin doit être postérieure à la date de début")

    existing = db.query(PeriodeSaisieNotes).filter(
        and_(
            PeriodeSaisieNotes.classe_id == periode_data.classe_id,
            PeriodeSaisieNotes.matiere_id == periode_data.matiere_id,
        )
    ).first()

    if existing:
        existing.date_debut = periode_data.date_debut
        existing.date_fin = periode_data.date_fin
        existing.justification_autorisee = periode_data.justification_autorisee
        existing.updated_at = datetime.utcnow()
        db.commit()
        db.refresh(existing)
        return PeriodeResponse(
            id=existing.id,
            classe_id=existing.classe_id,
            matiere_id=existing.matiere_id,
            date_debut=existing.date_debut,
            date_fin=existing.date_fin,
            justification_autorisee=existing.justification_autorisee,
            created_at=existing.created_at,
            updated_at=existing.updated_at,
        )

    periode = PeriodeSaisieNotes(
        classe_id=periode_data.classe_id,
        matiere_id=periode_data.matiere_id,
        date_debut=periode_data.date_debut,
        date_fin=periode_data.date_fin,
        justification_autorisee=periode_data.justification_autorisee,
    )
    db.add(periode)
    db.commit()
    db.refresh(periode)
    return PeriodeResponse(
        id=periode.id,
        classe_id=periode.classe_id,
        matiere_id=periode.matiere_id,
        date_debut=periode.date_debut,
        date_fin=periode.date_fin,
        justification_autorisee=periode.justification_autorisee,
        created_at=periode.created_at,
        updated_at=periode.updated_at,
    )


@router.delete("/periode-saisie/{periode_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_periode(
    periode_id: int,
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_tenant_session),
):
    """Supprime une période de saisie (admin)."""
    if current_user.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Accès réservé aux administrateurs")

    periode = db.query(PeriodeSaisieNotes).filter(PeriodeSaisieNotes.id == periode_id).first()
    if not periode:
        raise HTTPException(status_code=404, detail="Période non trouvée")

    db.delete(periode)
    db.commit()


@router.get("/verifier-periode", response_model=SaisieVerificationResponse)
def verifier_periode(
    classe_id: int,
    matiere_id: int,
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_tenant_session),
):
    """Vérifie si la saisie est autorisée pour une classe/matière."""
    return _verifier_periode_saisie(db, classe_id, matiere_id)
