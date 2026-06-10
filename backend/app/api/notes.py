"""
Endpoints Notes — CRUD complet pour professeurs et administrateurs.
"""
import csv
import io
from datetime import datetime, date
from typing import List, Optional, Literal

from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.responses import StreamingResponse
from pydantic import BaseModel, ConfigDict, field_validator
from sqlalchemy import and_
from sqlalchemy.orm import Session

from app.auth.security import get_current_user
from app.db.multi_tenant import get_tenant_session
from app.models.school import (
    Note, Professeur, Classe, Matiere, AttributionProfesseur,
    Eleve, PeriodeSaisieNotes
)

router = APIRouter(prefix="/notes", tags=["Notes"])

VALID_TYPES = {"sequence_1", "sequence_2", "trimestre"}
TYPE_LABELS = {
    "sequence_1": "1ère séquence",
    "sequence_2": "2ème séquence",
    "trimestre": "Note trimestrielle",
}


# ──────────────────────────────────────────────────────────
# Schémas Pydantic
# ──────────────────────────────────────────────────────────

class NoteCreate(BaseModel):
    eleve_id: int
    matiere_id: int
    valeur: float
    coefficient: Optional[float] = 1.0
    commentaire: Optional[str] = None
    trimestre: int = 1
    type_evaluation: str = "sequence_1"

    @field_validator("trimestre")
    @classmethod
    def validate_trimestre(cls, v: int) -> int:
        if v not in (1, 2, 3):
            raise ValueError("Le trimestre doit être 1, 2 ou 3")
        return v

    @field_validator("type_evaluation")
    @classmethod
    def validate_type(cls, v: str) -> str:
        if v not in VALID_TYPES:
            raise ValueError("type_evaluation invalide")
        return v


class NoteUpdate(BaseModel):
    valeur: Optional[float] = None
    coefficient: Optional[float] = None
    commentaire: Optional[str] = None
    trimestre: Optional[int] = None
    type_evaluation: Optional[str] = None


class NoteResponse(BaseModel):
    id: int
    eleve_id: int
    matiere_id: int
    professeur_id: int
    valeur: float
    coefficient: float
    commentaire: Optional[str]
    trimestre: int
    type_evaluation: str
    date_creation: datetime
    date_saisie: datetime

    model_config = ConfigDict(from_attributes=True)


class PeriodeCreate(BaseModel):
    classe_id: int
    matiere_id: int
    date_debut: date
    date_fin: date
    justification_autorisee: Optional[bool] = True


class PeriodeBulkCreate(BaseModel):
    date_debut: date
    date_fin: date
    scope: Literal["single", "classe_all_matieres", "matiere_all_classes", "all"] = "single"
    classe_id: Optional[int] = None
    matiere_id: Optional[int] = None
    justification_autorisee: Optional[bool] = False


class PeriodeBulkResult(BaseModel):
    created: int
    updated: int
    total: int


class PeriodeResponse(BaseModel):
    id: int
    classe_id: int
    matiere_id: int
    date_debut: date
    date_fin: date
    justification_autorisee: bool
    created_at: datetime
    updated_at: datetime
    statut: Literal["ouverte", "a_venir", "expiree"]
    statut_label: str
    peut_saisir: bool


class PeriodeListResponse(BaseModel):
    server_date: date
    items: List[PeriodeResponse]


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
        "trimestre": getattr(note, "trimestre", 1) or 1,
        "type_evaluation": getattr(note, "type_evaluation", "sequence_1") or "sequence_1",
        "date_creation": note.date_creation,
        "date_saisie": note.date_saisie,
    }


def _calc_moyenne_trimestre(seq1: Optional[Note], seq2: Optional[Note]) -> Optional[float]:
    if not seq1 or not seq2:
        return None
    c1 = seq1.coefficient or 1.0
    c2 = seq2.coefficient or 1.0
    total_coef = c1 + c2
    if total_coef <= 0:
        return None
    return round((seq1.valeur * c1 + seq2.valeur * c2) / total_coef, 2)


def _find_note(
    db: Session,
    eleve_id: int,
    matiere_id: int,
    trimestre: int,
    type_evaluation: str,
    professeur_id: Optional[int] = None,
) -> Optional[Note]:
    query = db.query(Note).filter(
        and_(
            Note.eleve_id == eleve_id,
            Note.matiere_id == matiere_id,
            Note.trimestre == trimestre,
            Note.type_evaluation == type_evaluation,
        )
    )
    if professeur_id is not None:
        query = query.filter(Note.professeur_id == professeur_id)
    return query.first()


def _coerce_date(value) -> date:
    """Normalise une date SQLAlchemy/SQLite (date, datetime ou chaîne ISO)."""
    if value is None:
        raise ValueError("Date manquante")
    if isinstance(value, datetime):
        return value.date()
    if isinstance(value, date):
        return value
    if isinstance(value, str):
        return date.fromisoformat(value.split("T")[0])
    return value


def _compute_periode_statut(
    debut: date,
    fin: date,
    today: Optional[date] = None,
) -> tuple[Literal["ouverte", "a_venir", "expiree"], str, bool]:
    """Calcule le statut d'une période selon la date du serveur (TZ configurée)."""
    ref = today or date.today()
    if ref < debut:
        return "a_venir", "À venir", False
    if ref > fin:
        return "expiree", "Expirée", False
    return "ouverte", "Ouverte", True


def _periode_to_response(periode: PeriodeSaisieNotes) -> PeriodeResponse:
    debut = _coerce_date(periode.date_debut)
    fin = _coerce_date(periode.date_fin)
    statut, statut_label, peut_saisir = _compute_periode_statut(debut, fin)
    return PeriodeResponse(
        id=periode.id,
        classe_id=periode.classe_id,
        matiere_id=periode.matiere_id,
        date_debut=debut,
        date_fin=fin,
        justification_autorisee=periode.justification_autorisee,
        created_at=periode.created_at,
        updated_at=periode.updated_at,
        statut=statut,
        statut_label=statut_label,
        peut_saisir=peut_saisir,
    )


def _verifier_periode_saisie(db: Session, classe_id: int, matiere_id: int) -> SaisieVerificationResponse:
    """Vérifie si la saisie des notes est autorisée pour une classe/matière donnée."""
    periode = db.query(PeriodeSaisieNotes).filter(
        and_(
            PeriodeSaisieNotes.classe_id == classe_id,
            PeriodeSaisieNotes.matiere_id == matiere_id,
        )
    ).first()

    if not periode:
        return SaisieVerificationResponse(
            peut_saisir=False,
            raison="Aucune période de saisie configurée pour cette classe et matière",
        )

    periode_resp = _periode_to_response(periode)
    today = date.today()
    debut = _coerce_date(periode.date_debut)
    fin = _coerce_date(periode.date_fin)

    if today < debut:
        return SaisieVerificationResponse(
            peut_saisir=False,
            raison=f"La saisie ouvre le {debut.strftime('%d/%m/%Y')}",
            periode=periode_resp,
        )

    if today > fin:
        return SaisieVerificationResponse(
            peut_saisir=False,
            raison=f"Le délai est expiré (échéance : {fin.strftime('%d/%m/%Y')})",
            periode=periode_resp,
        )

    return SaisieVerificationResponse(
        peut_saisir=True,
        periode=periode_resp,
    )


def _require_professor_or_admin(current_user: dict):
    role = current_user.get("role")
    if role not in ["professeur", "admin"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Accès réservé aux professeurs et administrateurs"
        )


def _require_admin(current_user: dict):
    if current_user.get("role") != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Accès réservé aux administrateurs",
        )


def _enforce_professor_deadline(role: str, verification: SaisieVerificationResponse) -> None:
    """Bloque le professeur hors période — aucune exception ni justification."""
    if role != "professeur":
        return
    if not verification.peut_saisir:
        fin = ""
        if verification.periode:
            fin = f" (échéance : {verification.periode.date_fin.strftime('%d/%m/%Y')})"
        raise HTTPException(
            status_code=403,
            detail=f"Délai de saisie dépassé{fin}. Contactez l'administrateur.",
        )


# ──────────────────────────────────────────────────────────
# Notes — Lecture
# ──────────────────────────────────────────────────────────

@router.get("/", response_model=List[NoteResponse])
def list_notes(
    eleve_id: Optional[int] = None,
    classe_id: Optional[int] = None,
    matiere_id: Optional[int] = None,
    trimestre: Optional[int] = None,
    type_evaluation: Optional[str] = None,
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
    if trimestre:
        query = query.filter(Note.trimestre == trimestre)
    if type_evaluation:
        if type_evaluation not in VALID_TYPES:
            raise HTTPException(status_code=400, detail="type_evaluation invalide")
        query = query.filter(Note.type_evaluation == type_evaluation)

    if role == "professeur":
        query = query.filter(Note.professeur_id == professeur_id)
        if classe_id:
            eleves_classe = db.query(Eleve.id).filter(Eleve.classe_id == classe_id).subquery()
            query = query.filter(Note.eleve_id.in_(eleves_classe))
    elif role == "admin" and classe_id:
        eleves_classe = db.query(Eleve.id).filter(Eleve.classe_id == classe_id).subquery()
        query = query.filter(Note.eleve_id.in_(eleves_classe))

    notes = query.order_by(Note.trimestre, Note.type_evaluation, Note.date_saisie.desc()).all()
    return [_note_to_response(n) for n in notes]


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

    if role == "professeur":
        verification = _verifier_periode_saisie(db, eleve.classe_id, note_data.matiere_id)
        _enforce_professor_deadline(role, verification)

    effective_professeur_id = professeur_id if role == "professeur" else attribution.professeur_id

    existing_note = _find_note(
        db,
        note_data.eleve_id,
        note_data.matiere_id,
        note_data.trimestre,
        note_data.type_evaluation,
        professeur_id=effective_professeur_id,
    )

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
        trimestre=note_data.trimestre,
        type_evaluation=note_data.type_evaluation,
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
# Période de saisie — CRUD (admin uniquement)
# ──────────────────────────────────────────────────────────

@router.get("/periode-saisie", response_model=PeriodeListResponse)
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

    periodes = query.order_by(PeriodeSaisieNotes.date_debut.desc()).all()
    return PeriodeListResponse(
        server_date=date.today(),
        items=[_periode_to_response(p) for p in periodes],
    )


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

    return _periode_to_response(periode)


def _upsert_periode(
    db: Session,
    classe_id: int,
    matiere_id: int,
    date_debut: date,
    date_fin: date,
    justification_autorisee: bool,
):
    """Crée ou met à jour une période. Retourne (periode, created?)."""
    existing = db.query(PeriodeSaisieNotes).filter(
        and_(
            PeriodeSaisieNotes.classe_id == classe_id,
            PeriodeSaisieNotes.matiere_id == matiere_id,
        )
    ).first()

    if existing:
        existing.date_debut = date_debut
        existing.date_fin = date_fin
        existing.justification_autorisee = justification_autorisee
        existing.updated_at = datetime.utcnow()
        return existing, False

    periode = PeriodeSaisieNotes(
        classe_id=classe_id,
        matiere_id=matiere_id,
        date_debut=date_debut,
        date_fin=date_fin,
        justification_autorisee=justification_autorisee,
    )
    db.add(periode)
    return periode, True


@router.post("/periode-saisie/bulk", response_model=PeriodeBulkResult)
def create_periodes_bulk(
    payload: PeriodeBulkCreate,
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_tenant_session),
):
    """Crée ou met à jour des délais pour plusieurs couples classe/matière."""
    if current_user.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Accès réservé aux administrateurs")

    if payload.date_fin < payload.date_debut:
        raise HTTPException(status_code=400, detail="La date de fin doit être postérieure ou égale à la date de début")

    classes = db.query(Classe).all()
    matieres = db.query(Matiere).all()
    if not classes or not matieres:
        raise HTTPException(status_code=400, detail="Créez d'abord des classes et des matières")

    pairs: list[tuple[int, int]] = []
    if payload.scope == "single":
        if not payload.classe_id or not payload.matiere_id:
            raise HTTPException(status_code=400, detail="Classe et matière requises")
        pairs = [(payload.classe_id, payload.matiere_id)]
    elif payload.scope == "classe_all_matieres":
        if not payload.classe_id:
            raise HTTPException(status_code=400, detail="Classe requise")
        pairs = [(payload.classe_id, m.id) for m in matieres]
    elif payload.scope == "matiere_all_classes":
        if not payload.matiere_id:
            raise HTTPException(status_code=400, detail="Matière requise")
        pairs = [(c.id, payload.matiere_id) for c in classes]
    else:
        pairs = [(c.id, m.id) for c in classes for m in matieres]

    created = 0
    updated = 0
    for classe_id, matiere_id in pairs:
        _periode, is_new = _upsert_periode(
            db,
            classe_id,
            matiere_id,
            payload.date_debut,
            payload.date_fin,
            payload.justification_autorisee or False,
        )
        if is_new:
            created += 1
        else:
            updated += 1

    db.commit()
    return PeriodeBulkResult(created=created, updated=updated, total=created + updated)


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
        raise HTTPException(status_code=400, detail="La date de fin doit être postérieure ou égale à la date de début")

    periode, _ = _upsert_periode(
        db,
        periode_data.classe_id,
        periode_data.matiere_id,
        periode_data.date_debut,
        periode_data.date_fin,
        periode_data.justification_autorisee or False,
    )
    db.commit()
    db.refresh(periode)
    return _periode_to_response(periode)


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


@router.get("/export/csv")
def export_notes_csv(
    classe_id: int,
    matiere_id: int,
    trimestre: Optional[int] = None,
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_tenant_session),
):
    """Exporte les notes d'une classe/matière au format CSV (admin uniquement)."""
    _require_admin(current_user)
    role = current_user.get("role")
    professeur_id = current_user.get("id")

    classe = db.query(Classe).filter(Classe.id == classe_id).first()
    matiere = db.query(Matiere).filter(Matiere.id == matiere_id).first()
    if not classe or not matiere:
        raise HTTPException(status_code=404, detail="Classe ou matière introuvable")

    eleves = db.query(Eleve).filter(Eleve.classe_id == classe_id).order_by(Eleve.nom, Eleve.prenom).all()
    if not eleves:
        raise HTTPException(status_code=404, detail="Aucun élève dans cette classe")

    trimestres = [trimestre] if trimestre else [1, 2, 3]

    query = db.query(Note).filter(
        and_(
            Note.matiere_id == matiere_id,
            Note.eleve_id.in_([e.id for e in eleves]),
        )
    )
    if trimestre:
        query = query.filter(Note.trimestre == trimestre)
    if role == "professeur":
        query = query.filter(Note.professeur_id == professeur_id)

    all_notes = query.all()
    notes_index = {}
    for n in all_notes:
        notes_index[(n.eleve_id, n.trimestre, n.type_evaluation)] = n

    output = io.StringIO()
    writer = csv.writer(output, delimiter=";")
    writer.writerow([
        "Nom", "Prénom", "Matricule", "Classe", "Matière", "Trimestre",
        "Note 1ère séq.", "Coef. 1ère séq.",
        "Note 2ème séq.", "Coef. 2ème séq.",
        "Note trimestrielle", "Coef. trim.",
        "Moyenne calculée",
    ])

    for eleve in eleves:
        for tri in trimestres:
            seq1 = notes_index.get((eleve.id, tri, "sequence_1"))
            seq2 = notes_index.get((eleve.id, tri, "sequence_2"))
            trim_note = notes_index.get((eleve.id, tri, "trimestre"))
            moyenne = _calc_moyenne_trimestre(seq1, seq2)
            writer.writerow([
                eleve.nom,
                eleve.prenom,
                eleve.matricule,
                classe.nom,
                matiere.nom,
                tri,
                seq1.valeur if seq1 else "",
                seq1.coefficient if seq1 else "",
                seq2.valeur if seq2 else "",
                seq2.coefficient if seq2 else "",
                trim_note.valeur if trim_note else "",
                trim_note.coefficient if trim_note else "",
                moyenne if moyenne is not None else "",
            ])

    output.seek(0)
    filename = f"notes_{classe.nom}_{matiere.code}_T{trimestre or 'all'}.csv"
    return StreamingResponse(
        iter([output.getvalue()]),
        media_type="text/csv; charset=utf-8",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )


# ──────────────────────────────────────────────────────────
# Notes — Détail / modification / suppression (routes dynamiques en dernier)
# ──────────────────────────────────────────────────────────

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

    if role == "professeur":
        verification = _verifier_periode_saisie(db, eleve.classe_id, note.matiere_id)
        _enforce_professor_deadline(role, verification)

    if note_update.valeur is not None:
        note.valeur = note_update.valeur
    if note_update.coefficient is not None:
        note.coefficient = note_update.coefficient
    if note_update.commentaire is not None:
        note.description = note_update.commentaire
    note.date_saisie = datetime.utcnow()

    db.commit()
    db.refresh(note)
    return _note_to_response(note)


@router.delete("/{note_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_note(
    note_id: int,
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_tenant_session),
):
    """Supprime une note (administrateur uniquement)."""
    _require_admin(current_user)

    note = db.query(Note).filter(Note.id == note_id).first()
    if not note:
        raise HTTPException(status_code=404, detail="Note non trouvée")

    db.delete(note)
    db.commit()
