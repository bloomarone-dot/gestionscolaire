"""
Routes de compatibilité — redirigent vers la base tenant de l'établissement.
"""
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.auth.security import get_current_user
from app.db.multi_tenant import get_tenant_session
from app.models.school import Eleve, Note, Matiere

router = APIRouter()


def _require_authenticated(current_user: dict):
    if not current_user.get("role"):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentification requise",
        )


@router.post("/eleves/")
def creer_eleve(
    nom: str,
    prenom: str,
    matricule: str,
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_tenant_session),
):
    _require_authenticated(current_user)
    if current_user.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Accès réservé aux administrateurs")

    existing = db.query(Eleve).filter(Eleve.matricule == matricule).first()
    if existing:
        raise HTTPException(status_code=400, detail="Ce matricule existe déjà")

    nouvel_eleve = Eleve(nom=nom, prenom=prenom, matricule=matricule)
    db.add(nouvel_eleve)
    db.commit()
    db.refresh(nouvel_eleve)
    return {"message": "Élève créé avec succès", "id": nouvel_eleve.id}


@router.get("/eleves/")
def lister_eleves(
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_tenant_session),
):
    _require_authenticated(current_user)
    return db.query(Eleve).all()


@router.get("/bulletin/{eleve_id}")
def generer_bulletin(
    eleve_id: int,
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_tenant_session),
):
    _require_authenticated(current_user)
    eleve = db.query(Eleve).filter(Eleve.id == eleve_id).first()
    if not eleve:
        return {"error": "Élève non trouvé"}

    notes = db.query(Note).filter(Note.eleve_id == eleve_id).all()
    moyenne = sum(n.valeur for n in notes) / len(notes) if notes else 0

    details = []
    for n in notes:
        matiere = db.query(Matiere).filter(Matiere.id == n.matiere_id).first()
        details.append({"matiere": matiere.nom if matiere else "?", "note": n.valeur})

    return {
        "eleve": f"{eleve.nom} {eleve.prenom}",
        "moyenne_generale": round(moyenne, 2),
        "details_notes": details,
    }
