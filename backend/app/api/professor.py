from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import and_
from sqlalchemy.orm import Session
from datetime import datetime
from pydantic import BaseModel, Field, ConfigDict
from typing import List, Optional

from app.auth.security import get_current_user
from app.db.multi_tenant import get_tenant_session
from app.models.school import (
    Professeur, Classe, Matiere, AttributionProfesseur,
    Eleve, Note, Bulletin, AnneeScolaire
)

router = APIRouter(prefix="/professor", tags=["Professor"])


def _note_to_response(note: Note) -> dict:
    return {
        "id": note.id,
        "eleve_id": note.eleve_id,
        "matiere_id": note.matiere_id,
        "valeur": note.valeur,
        "coefficient": note.coefficient,
        "commentaire": note.description,
        "date_creation": note.date_creation,
        "professeur_id": note.professeur_id,
    }


def _bulletin_to_response(bulletin: Bulletin) -> dict:
    return {
        "id": bulletin.id,
        "eleve_id": bulletin.eleve_id,
        "classe_id": bulletin.classe_id,
        "moyenne_generale": bulletin.moyenne_generale,
        "observations": bulletin.appreciation,
        "date_generation": bulletin.date_generation,
    }


class ClasseListResponse(BaseModel):
    id: int
    nom: str
    niveau: str
    capacite: int
    salle: Optional[str] = None

    model_config = ConfigDict(from_attributes=True)


class EleveResponse(BaseModel):
    id: int
    nom: str
    prenom: str
    matricule: str
    classe_id: int

    model_config = ConfigDict(from_attributes=True)


class NoteCreate(BaseModel):
    eleve_id: int
    matiere_id: int
    valeur: float
    coefficient: Optional[float] = 1.0
    commentaire: Optional[str] = None


class NoteResponse(BaseModel):
    id: int
    eleve_id: int
    matiere_id: int
    valeur: float
    coefficient: float
    commentaire: Optional[str]
    date_creation: datetime
    professeur_id: int


class BulletinResponse(BaseModel):
    id: int
    eleve_id: int
    classe_id: int
    moyenne_generale: float
    observations: Optional[str]
    date_generation: datetime


@router.get("/classes", response_model=List[ClasseListResponse])
async def get_professor_classes(
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_tenant_session),
):
    if current_user.get("role") != "professeur":
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Accès refusé")

    professeur_id = current_user.get("id")

    attributions = db.query(AttributionProfesseur).filter(
        and_(
            AttributionProfesseur.professeur_id == professeur_id,
            AttributionProfesseur.is_active == True,
        )
    ).all()

    classes_ids = list({attr.classe_id for attr in attributions})
    if not classes_ids:
        return []

    return db.query(Classe).filter(Classe.id.in_(classes_ids)).all()


@router.get("/classes/{classe_id}/eleves", response_model=List[EleveResponse])
async def get_class_eleves(
    classe_id: int,
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_tenant_session),
):
    if current_user.get("role") != "professeur":
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Accès refusé")

    attribution = db.query(AttributionProfesseur).filter(
        and_(
            AttributionProfesseur.professeur_id == current_user.get("id"),
            AttributionProfesseur.classe_id == classe_id,
        )
    ).first()

    if not attribution:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Classe non assignée")

    return db.query(Eleve).filter(Eleve.classe_id == classe_id).all()


@router.get("/classes/{classe_id}/matieres")
async def get_class_matieres(
    classe_id: int,
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_tenant_session),
):
    if current_user.get("role") != "professeur":
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Accès refusé")

    attributions = db.query(AttributionProfesseur).filter(
        and_(
            AttributionProfesseur.professeur_id == current_user.get("id"),
            AttributionProfesseur.classe_id == classe_id,
        )
    ).all()

    matieres_ids = [attr.matiere_id for attr in attributions]
    if not matieres_ids:
        return []

    return db.query(Matiere).filter(Matiere.id.in_(matieres_ids)).all()


@router.post("/classes/{classe_id}/notes", response_model=NoteResponse)
async def create_note(
    classe_id: int,
    note_data: NoteCreate,
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_tenant_session),
):
    if current_user.get("role") != "professeur":
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Accès refusé")

    professeur_id = current_user.get("id")

    if note_data.valeur < 0 or note_data.valeur > 20:
        raise HTTPException(status_code=400, detail="Note doit être entre 0 et 20")

    attribution = db.query(AttributionProfesseur).filter(
        and_(
            AttributionProfesseur.professeur_id == professeur_id,
            AttributionProfesseur.classe_id == classe_id,
            AttributionProfesseur.matiere_id == note_data.matiere_id,
        )
    ).first()

    if not attribution:
        raise HTTPException(status_code=403, detail="Matière non assignée à cette classe")

    eleve = db.query(Eleve).filter(
        and_(Eleve.id == note_data.eleve_id, Eleve.classe_id == classe_id)
    ).first()

    if not eleve:
        raise HTTPException(status_code=404, detail="Élève non trouvé")

    existing_note = db.query(Note).filter(
        and_(
            Note.eleve_id == note_data.eleve_id,
            Note.matiere_id == note_data.matiere_id,
            Note.professeur_id == professeur_id,
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
        professeur_id=professeur_id,
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


@router.get("/classes/{classe_id}/notes")
async def get_class_notes(
    classe_id: int,
    matiere_id: Optional[int] = None,
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_tenant_session),
):
    if current_user.get("role") != "professeur":
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Accès refusé")

    professeur_id = current_user.get("id")

    eleves = db.query(Eleve).filter(Eleve.classe_id == classe_id).all()
    eleve_ids = [e.id for e in eleves]

    if not eleve_ids:
        return []

    query = db.query(Note).filter(
        and_(Note.eleve_id.in_(eleve_ids), Note.professeur_id == professeur_id)
    )

    if matiere_id:
        query = query.filter(Note.matiere_id == matiere_id)

    notes = query.all()
    return [_note_to_response(n) for n in notes]


@router.get("/bulletins/{eleve_id}", response_model=BulletinResponse)
async def get_eleve_bulletin(
    eleve_id: int,
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_tenant_session),
):
    if current_user.get("role") not in ["professeur", "admin"]:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Accès refusé")

    bulletin = db.query(Bulletin).filter(Bulletin.eleve_id == eleve_id).first()

    if not bulletin:
        raise HTTPException(status_code=404, detail="Bulletin non trouvé")

    return _bulletin_to_response(bulletin)


@router.post("/bulletins/{eleve_id}/generate")
async def generate_bulletin(
    eleve_id: int,
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_tenant_session),
):
    if current_user.get("role") not in ["admin"]:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Accès refusé")

    notes = db.query(Note).filter(Note.eleve_id == eleve_id).all()

    if not notes:
        raise HTTPException(status_code=400, detail="Aucune note pour cet élève")

    total_points = sum(n.valeur * n.coefficient for n in notes)
    total_coeff = sum(n.coefficient for n in notes)
    moyenne = total_points / total_coeff if total_coeff > 0 else 0

    eleve = db.query(Eleve).filter(Eleve.id == eleve_id).first()
    if not eleve:
        raise HTTPException(status_code=404, detail="Élève non trouvé")

    classe = db.query(Classe).filter(Classe.id == eleve.classe_id).first()
    annee_scolaire_id = classe.annee_scolaire_id if classe else None

    if not annee_scolaire_id:
        active_year = db.query(AnneeScolaire).filter(AnneeScolaire.is_active == True).first()
        if not active_year:
            raise HTTPException(
                status_code=400,
                detail="Aucune année scolaire active configurée",
            )
        annee_scolaire_id = active_year.id

    bulletin = db.query(Bulletin).filter(Bulletin.eleve_id == eleve_id).first()

    if bulletin:
        bulletin.moyenne_generale = round(moyenne, 2)
        bulletin.date_generation = datetime.utcnow()
    else:
        bulletin = Bulletin(
            eleve_id=eleve_id,
            classe_id=eleve.classe_id,
            annee_scolaire_id=annee_scolaire_id,
            moyenne_generale=round(moyenne, 2),
            date_generation=datetime.utcnow(),
        )
        db.add(bulletin)

    db.commit()
    db.refresh(bulletin)

    return {
        "success": True,
        "bulletin": _bulletin_to_response(bulletin),
        "moyenne": round(moyenne, 2),
    }


@router.get("/me")
async def get_professor_profile(
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_tenant_session),
):
    if current_user.get("role") != "professeur":
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Accès refusé")

    professor = db.query(Professeur).filter(Professeur.id == current_user.get("id")).first()

    if not professor:
        raise HTTPException(status_code=404, detail="Professeur non trouvé")

    return {
        "id": professor.id,
        "nom": professor.nom,
        "prenom": professor.prenom,
        "email": professor.email,
        "specialite": professor.specialite,
        "matricule": professor.matricule,
    }
