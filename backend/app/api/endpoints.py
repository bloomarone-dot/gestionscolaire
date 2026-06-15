from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.db.connection import get_db_session
from app.models.school import Eleve, Note, Matiere, Professeur
from app.auth.security import get_current_user

router = APIRouter()


@router.post("/eleves/")
def creer_eleve(nom: str, prenom: str, matricule: str, db: Session = Depends(get_db_session)):
    nouvel_eleve = Eleve(nom=nom, prenom=prenom, matricule=matricule)
    db.add(nouvel_eleve)
    db.commit()
    db.refresh(nouvel_eleve)
    return {"message": "Élève créé avec succès", "id": nouvel_eleve.id}


@router.get("/eleves/")
def lister_eleves(db: Session = Depends(get_db_session)):
    return db.query(Eleve).all()


def _get_or_create_matiere(db: Session, matiere_nom: str) -> Matiere:
    matiere_obj = db.query(Matiere).filter(Matiere.nom == matiere_nom).first()
    if matiere_obj:
        return matiere_obj

    code = matiere_nom[:20].upper().replace(" ", "_").replace("-", "_")
    matiere_obj = Matiere(nom=matiere_nom, code=code)
    db.add(matiere_obj)
    db.flush()
    return matiere_obj


@router.post("/notes/")
def ajouter_note(eleve_id: int, matiere: str, valeur: float, db: Session = Depends(get_db_session)):
    prof = db.query(Professeur).first()
    if not prof:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Aucun professeur configuré. Créez un professeur via l'admin.",
        )

    matiere_obj = _get_or_create_matiere(db, matiere)

    nouvelle_note = Note(
        eleve_id=eleve_id,
        matiere_id=matiere_obj.id,
        professeur_id=prof.id,
        valeur=valeur,
    )
    db.add(nouvelle_note)
    db.commit()
    return {"message": "Note ajoutée"}


@router.get("/bulletin/{eleve_id}")
def generer_bulletin(eleve_id: int, db: Session = Depends(get_db_session)):
    eleve = db.query(Eleve).filter(Eleve.id == eleve_id).first()
    if not eleve:
        return {"error": "Élève non trouvé"}

    notes = db.query(Note).filter(Note.eleve_id == eleve_id).all()

    if not notes:
        moyenne = 0
    else:
        moyenne = sum(n.valeur for n in notes) / len(notes)

    details = []
    for n in notes:
        matiere = db.query(Matiere).filter(Matiere.id == n.matiere_id).first()
        details.append({"matiere": matiere.nom if matiere else "?", "note": n.valeur})

    return {
        "eleve": f"{eleve.nom} {eleve.prenom}",
        "moyenne_generale": round(moyenne, 2),
        "details_notes": details,
    }


def role_required(required_role: str):
    def check_role(current_user=Depends(get_current_user)):
        if current_user.get("role") != required_role:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Vous n'avez pas les droits nécessaires",
            )
        return current_user

    return check_role
