"""
Routes de compatibilité — redirigent vers la base tenant de l'établissement.
"""
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.auth.security import get_current_user
from app.db.multi_tenant import get_tenant_session
from app.models.school import Eleve

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
    trimestre: int = 1,
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_tenant_session),
):
    _require_authenticated(current_user)
    from app.services.bulletin_service import build_eleve_bulletin

    return build_eleve_bulletin(db, eleve_id, trimestre)
