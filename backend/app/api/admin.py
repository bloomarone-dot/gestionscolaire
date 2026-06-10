"""
Endpoints pour gestion Professeurs, Classes, Matières (Admin établissement)
"""
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from pydantic import BaseModel, EmailStr, ConfigDict, Field
from typing import List, Optional
from datetime import datetime

from app.db.connection import get_db_session
from app.db.multi_tenant import get_tenant_session
from app.auth.security import get_current_user, hash_password

router = APIRouter(prefix="/admin", tags=["Admin Management"])


# ════════════════════════════════════════════════════════════
# Schémas Pydantic
# ════════════════════════════════════════════════════════════

class ProfesseurCreate(BaseModel):
    nom: str
    prenom: str
    email: EmailStr
    phone: Optional[str] = None
    specialite: Optional[str] = None
    matricule: str
    username: Optional[str] = None
    password: Optional[str] = None


class ProfesseurUpdate(BaseModel):
    nom: Optional[str] = None
    prenom: Optional[str] = None
    email: Optional[EmailStr] = None
    phone: Optional[str] = None
    specialite: Optional[str] = None


class ProfesseurResponse(BaseModel):
    id: int
    nom: str
    prenom: str
    email: str
    phone: Optional[str] = None
    specialite: Optional[str] = None
    matricule: str
    is_active: bool
    created_at: datetime = Field(validation_alias="date_creation")

    model_config = ConfigDict(from_attributes=True, populate_by_name=True)


class AttributionProfCreate(BaseModel):
    professeur_id: int
    classe_id: int
    matiere_id: int


class AttributionProfResponse(BaseModel):
    id: int
    professeur_id: int
    classe_id: int
    matiere_id: int
    is_active: bool

    model_config = ConfigDict(from_attributes=True)


class AnneeScolaireCreate(BaseModel):
    annee: str
    date_debut: datetime
    date_fin: datetime
    is_active: Optional[bool] = True


class AnneeScolaireResponse(BaseModel):
    id: int
    annee: str
    date_debut: datetime
    date_fin: datetime
    is_active: bool

    model_config = ConfigDict(from_attributes=True)


class EleveCreate(BaseModel):
    nom: str
    prenom: str
    matricule: str
    classe_id: Optional[int] = None


class EleveUpdate(BaseModel):
    nom: Optional[str] = None
    prenom: Optional[str] = None
    classe_id: Optional[int] = None


class EleveResponse(BaseModel):
    id: int
    nom: str
    prenom: str
    matricule: str
    classe_id: Optional[int] = None
    date_inscription: datetime
    classe_nom: Optional[str] = None

    model_config = ConfigDict(from_attributes=True)


class ClasseCreate(BaseModel):
    nom: str
    niveau: str
    annee_scolaire_id: Optional[int] = None
    capacite: Optional[int] = 30
    salle: Optional[str] = None


class ClasseResponse(BaseModel):
    id: int
    nom: str
    niveau: str
    capacite: int
    salle: Optional[str] = None
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class MatiereCreate(BaseModel):
    nom: str
    code: str
    description: Optional[str] = None


class MatiereResponse(BaseModel):
    id: int
    nom: str
    code: str
    description: Optional[str] = None

    model_config = ConfigDict(from_attributes=True)


# ════════════════════════════════════════════════════════════
# PROFESSEURS — CRUD
# ════════════════════════════════════════════════════════════

@router.post("/professeurs/", response_model=ProfesseurResponse, status_code=status.HTTP_201_CREATED)
def create_professeur(
    prof_data: ProfesseurCreate,
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_tenant_session)
):
    """Crée un nouveau professeur"""
    from app.models.school import Professeur
    
    # Vérifier que l'utilisateur est admin
    if current_user.get("role") != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Seul un administrateur peut créer des professeurs"
        )
    
    # Vérifier si le matricule existe
    existing = db.query(Professeur).filter(Professeur.matricule == prof_data.matricule).first()
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Ce matricule existe déjà"
        )
    
    # Vérifier si l'email existe
    existing_email = db.query(Professeur).filter(Professeur.email == prof_data.email).first()
    if existing_email:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cet email est déjà utilisé"
        )
    
    try:
        professeur = Professeur(
            nom=prof_data.nom,
            prenom=prof_data.prenom,
            email=prof_data.email,
            phone=prof_data.phone,
            specialite=prof_data.specialite,
            matricule=prof_data.matricule,
            username=prof_data.username or prof_data.email.split('@')[0],
            hashed_password=hash_password(prof_data.password or "default123"),
            is_active=True
        )
        db.add(professeur)
        db.commit()
        db.refresh(professeur)
        return professeur
    
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Erreur création professeur: {str(e)}"
        )


@router.get("/professeurs/", response_model=List[ProfesseurResponse])
def list_professeurs(
    current_user: dict = Depends(get_current_user),
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_tenant_session)
):
    """Liste tous les professeurs"""
    from app.models.school import Professeur
    
    if current_user.get("role") != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Non autorisé"
        )
    
    professeurs = db.query(Professeur).offset(skip).limit(limit).all()
    return professeurs


@router.get("/professeurs/{prof_id}", response_model=ProfesseurResponse)
def get_professeur(
    prof_id: int,
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_tenant_session)
):
    """Récupère les détails d'un professeur"""
    from app.models.school import Professeur
    
    professeur = db.query(Professeur).filter(Professeur.id == prof_id).first()
    if not professeur:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Professeur non trouvé"
        )
    
    return professeur


@router.put("/professeurs/{prof_id}", response_model=ProfesseurResponse)
def update_professeur(
    prof_id: int,
    prof_update: ProfesseurUpdate,
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_tenant_session)
):
    """Modifie un professeur"""
    from app.models.school import Professeur
    
    if current_user.get("role") != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Non autorisé"
        )
    
    professeur = db.query(Professeur).filter(Professeur.id == prof_id).first()
    if not professeur:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Professeur non trouvé"
        )
    
    # Mettre à jour les champs
    update_data = prof_update.dict(exclude_unset=True)
    for field, value in update_data.items():
        setattr(professeur, field, value)
    
    db.commit()
    db.refresh(professeur)
    return professeur


@router.delete("/professeurs/{prof_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_professeur(
    prof_id: int,
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_tenant_session)
):
    """Supprime un professeur"""
    from app.models.school import Professeur
    
    if current_user.get("role") != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Non autorisé"
        )
    
    professeur = db.query(Professeur).filter(Professeur.id == prof_id).first()
    if not professeur:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Professeur non trouvé"
        )
    
    db.delete(professeur)
    db.commit()


# ════════════════════════════════════════════════════════════
# ATTRIBUTIONS PROFESSEURS — CRUD
# ════════════════════════════════════════════════════════════

@router.post("/attributions-professeurs/", response_model=AttributionProfResponse, status_code=status.HTTP_201_CREATED)
def create_attribution(
    attrib_data: AttributionProfCreate,
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_tenant_session)
):
    """Attribue un professeur à une classe/matière"""
    from app.models.school import AttributionProfesseur, Professeur, Classe, Matiere
    
    if current_user.get("role") != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Non autorisé"
        )
    
    # Vérifier existence
    prof = db.query(Professeur).filter(Professeur.id == attrib_data.professeur_id).first()
    if not prof:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Professeur non trouvé")
    
    classe = db.query(Classe).filter(Classe.id == attrib_data.classe_id).first()
    if not classe:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Classe non trouvée")
    
    matiere = db.query(Matiere).filter(Matiere.id == attrib_data.matiere_id).first()
    if not matiere:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Matière non trouvée")
    
    # Vérifier si attribution existe déjà
    existing = db.query(AttributionProfesseur).filter(
        AttributionProfesseur.professeur_id == attrib_data.professeur_id,
        AttributionProfesseur.classe_id == attrib_data.classe_id,
        AttributionProfesseur.matiere_id == attrib_data.matiere_id
    ).first()
    
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cette attribution existe déjà"
        )
    
    try:
        attribution = AttributionProfesseur(**attrib_data.dict())
        db.add(attribution)
        db.commit()
        db.refresh(attribution)
        return attribution
    
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Erreur: {str(e)}"
        )


@router.get("/attributions-professeurs/", response_model=List[AttributionProfResponse])
def list_attributions(
    current_user: dict = Depends(get_current_user),
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_tenant_session)
):
    """Liste les attributions"""
    from app.models.school import AttributionProfesseur
    
    attributions = db.query(AttributionProfesseur).offset(skip).limit(limit).all()
    return attributions


@router.delete("/attributions-professeurs/{attrib_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_attribution(
    attrib_id: int,
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_tenant_session)
):
    """Supprime une attribution"""
    from app.models.school import AttributionProfesseur
    
    if current_user.get("role") != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Non autorisé"
        )
    
    attribution = db.query(AttributionProfesseur).filter(AttributionProfesseur.id == attrib_id).first()
    if not attribution:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Attribution non trouvée"
        )
    
    db.delete(attribution)
    db.commit()


# ════════════════════════════════════════════════════════════
# CLASSES — CRUD
# ════════════════════════════════════════════════════════════

@router.post("/classes/", response_model=ClasseResponse, status_code=status.HTTP_201_CREATED)
def create_classe(
    classe_data: ClasseCreate,
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_tenant_session)
):
    """Crée une nouvelle classe"""
    from app.models.school import Classe, AnneeScolaire
    
    if current_user.get("role") != "admin":
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Non autorisé")
    
    # Si annee_scolaire_id non fourni, utiliser l'année active ou la première disponible
    annee_scolaire_id = classe_data.annee_scolaire_id
    if not annee_scolaire_id:
        annee = db.query(AnneeScolaire).filter(AnneeScolaire.is_active == True).first()
        if not annee:
            annee = db.query(AnneeScolaire).first()
        if annee:
            annee_scolaire_id = annee.id
    
    try:
        data = classe_data.dict()
        data["annee_scolaire_id"] = annee_scolaire_id
        classe = Classe(**data)
        db.add(classe)
        db.commit()
        db.refresh(classe)
        return classe
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e))


@router.get("/classes/", response_model=List[ClasseResponse])
def list_classes(
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_tenant_session)
):
    """Liste les classes"""
    from app.models.school import Classe
    
    classes = db.query(Classe).all()
    return classes


@router.delete("/classes/{classe_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_classe(
    classe_id: int,
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_tenant_session)
):
    """Supprime une classe"""
    from app.models.school import Classe
    
    if current_user.get("role") != "admin":
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Non autorisé")
    
    classe = db.query(Classe).filter(Classe.id == classe_id).first()
    if not classe:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Classe non trouvée")
    
    db.delete(classe)
    db.commit()


# ════════════════════════════════════════════════════════════
# MATIÈRES — CRUD
# ════════════════════════════════════════════════════════════

@router.post("/matieres/", response_model=MatiereResponse, status_code=status.HTTP_201_CREATED)
def create_matiere(
    matiere_data: MatiereCreate,
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_tenant_session)
):
    """Crée une nouvelle matière"""
    from app.models.school import Matiere
    
    if current_user.get("role") != "admin":
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Non autorisé")
    
    # Vérifier si code existe
    existing = db.query(Matiere).filter(Matiere.code == matiere_data.code).first()
    if existing:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Ce code existe déjà")
    
    try:
        matiere = Matiere(**matiere_data.dict())
        db.add(matiere)
        db.commit()
        db.refresh(matiere)
        return matiere
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e))


@router.get("/matieres/", response_model=List[MatiereResponse])
def list_matieres(
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_tenant_session)
):
    """Liste les matières"""
    from app.models.school import Matiere
    
    matieres = db.query(Matiere).all()
    return matieres


@router.delete("/matieres/{matiere_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_matiere(
    matiere_id: int,
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_tenant_session)
):
    """Supprime une matière"""
    from app.models.school import Matiere
    
    if current_user.get("role") != "admin":
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Non autorisé")
    
    matiere = db.query(Matiere).filter(Matiere.id == matiere_id).first()
    if not matiere:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Matière non trouvée")
    
    db.delete(matiere)
    db.commit()


# ════════════════════════════════════════════════════════════
# ANNÉES SCOLAIRES — CRUD
# ════════════════════════════════════════════════════════════

@router.post("/annees-scolaires/", response_model=AnneeScolaireResponse, status_code=status.HTTP_201_CREATED)
def create_annee_scolaire(
    data: AnneeScolaireCreate,
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_tenant_session),
):
    """Crée une année scolaire"""
    from app.models.school import AnneeScolaire

    if current_user.get("role") != "admin":
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Non autorisé")

    # Si is_active=True, désactiver les autres
    if data.is_active:
        db.query(AnneeScolaire).filter(AnneeScolaire.is_active == True).update({"is_active": False})

    annee = AnneeScolaire(**data.dict())
    db.add(annee)
    db.commit()
    db.refresh(annee)
    return annee


@router.get("/annees-scolaires/", response_model=List[AnneeScolaireResponse])
def list_annees_scolaires(
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_tenant_session),
):
    """Liste les années scolaires"""
    from app.models.school import AnneeScolaire

    return db.query(AnneeScolaire).order_by(AnneeScolaire.date_debut.desc()).all()


@router.put("/annees-scolaires/{annee_id}/activer", response_model=AnneeScolaireResponse)
def activer_annee_scolaire(
    annee_id: int,
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_tenant_session),
):
    """Définit une année scolaire comme active"""
    from app.models.school import AnneeScolaire

    if current_user.get("role") != "admin":
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Non autorisé")

    db.query(AnneeScolaire).filter(AnneeScolaire.is_active == True).update({"is_active": False})
    annee = db.query(AnneeScolaire).filter(AnneeScolaire.id == annee_id).first()
    if not annee:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Année non trouvée")
    annee.is_active = True
    db.commit()
    db.refresh(annee)
    return annee


@router.delete("/annees-scolaires/{annee_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_annee_scolaire(
    annee_id: int,
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_tenant_session),
):
    """Supprime une année scolaire"""
    from app.models.school import AnneeScolaire

    if current_user.get("role") != "admin":
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Non autorisé")

    annee = db.query(AnneeScolaire).filter(AnneeScolaire.id == annee_id).first()
    if not annee:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Année non trouvée")

    db.delete(annee)
    db.commit()


# ════════════════════════════════════════════════════════════
# ÉLÈVES — CRUD
# ════════════════════════════════════════════════════════════

@router.post("/eleves/", response_model=EleveResponse, status_code=status.HTTP_201_CREATED)
def create_eleve(
    eleve_data: EleveCreate,
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_tenant_session),
):
    """Crée un nouvel élève"""
    from app.models.school import Eleve, Classe

    if current_user.get("role") != "admin":
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Non autorisé")

    existing = db.query(Eleve).filter(Eleve.matricule == eleve_data.matricule).first()
    if existing:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Ce matricule existe déjà")

    if eleve_data.classe_id:
        classe = db.query(Classe).filter(Classe.id == eleve_data.classe_id).first()
        if not classe:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Classe non trouvée")

    try:
        eleve = Eleve(**eleve_data.dict())
        db.add(eleve)
        db.commit()
        db.refresh(eleve)

        # Enrichir avec le nom de la classe
        classe_nom = None
        if eleve.classe_id:
            classe = db.query(Classe).filter(Classe.id == eleve.classe_id).first()
            classe_nom = f"{classe.nom} ({classe.niveau})" if classe else None

        return EleveResponse(
            id=eleve.id,
            nom=eleve.nom,
            prenom=eleve.prenom,
            matricule=eleve.matricule,
            classe_id=eleve.classe_id,
            date_inscription=eleve.date_inscription,
            classe_nom=classe_nom,
        )
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e))


@router.get("/eleves/", response_model=List[EleveResponse])
def list_eleves(
    current_user: dict = Depends(get_current_user),
    classe_id: Optional[int] = None,
    search: Optional[str] = None,
    skip: int = 0,
    limit: int = 200,
    db: Session = Depends(get_tenant_session),
):
    """Liste les élèves avec filtre optionnel par classe et recherche"""
    from app.models.school import Eleve, Classe

    query = db.query(Eleve)

    if classe_id:
        query = query.filter(Eleve.classe_id == classe_id)
    if search:
        pattern = f"%{search}%"
        query = query.filter(
            (Eleve.nom.ilike(pattern))
            | (Eleve.prenom.ilike(pattern))
            | (Eleve.matricule.ilike(pattern))
        )

    eleves = query.offset(skip).limit(limit).all()

    result = []
    for e in eleves:
        classe_nom = None
        if e.classe_id:
            classe = db.query(Classe).filter(Classe.id == e.classe_id).first()
            classe_nom = f"{classe.nom} ({classe.niveau})" if classe else None
        result.append(
            EleveResponse(
                id=e.id,
                nom=e.nom,
                prenom=e.prenom,
                matricule=e.matricule,
                classe_id=e.classe_id,
                date_inscription=e.date_inscription,
                classe_nom=classe_nom,
            )
        )
    return result


@router.get("/eleves/{eleve_id}", response_model=EleveResponse)
def get_eleve(
    eleve_id: int,
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_tenant_session),
):
    """Récupère un élève"""
    from app.models.school import Eleve, Classe

    eleve = db.query(Eleve).filter(Eleve.id == eleve_id).first()
    if not eleve:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Élève non trouvé")

    classe_nom = None
    if eleve.classe_id:
        classe = db.query(Classe).filter(Classe.id == eleve.classe_id).first()
        classe_nom = f"{classe.nom} ({classe.niveau})" if classe else None

    return EleveResponse(
        id=eleve.id,
        nom=eleve.nom,
        prenom=eleve.prenom,
        matricule=eleve.matricule,
        classe_id=eleve.classe_id,
        date_inscription=eleve.date_inscription,
        classe_nom=classe_nom,
    )


@router.put("/eleves/{eleve_id}", response_model=EleveResponse)
def update_eleve(
    eleve_id: int,
    eleve_update: EleveUpdate,
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_tenant_session),
):
    """Modifie un élève (nom, prénom, classe)"""
    from app.models.school import Eleve, Classe

    if current_user.get("role") != "admin":
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Non autorisé")

    eleve = db.query(Eleve).filter(Eleve.id == eleve_id).first()
    if not eleve:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Élève non trouvé")

    if eleve_update.classe_id is not None and eleve_update.classe_id != 0:
        classe = db.query(Classe).filter(Classe.id == eleve_update.classe_id).first()
        if not classe:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Classe non trouvée")

    for field, value in eleve_update.dict(exclude_unset=True).items():
        setattr(eleve, field, value)

    db.commit()
    db.refresh(eleve)

    classe_nom = None
    if eleve.classe_id:
        classe = db.query(Classe).filter(Classe.id == eleve.classe_id).first()
        classe_nom = f"{classe.nom} ({classe.niveau})" if classe else None

    return EleveResponse(
        id=eleve.id,
        nom=eleve.nom,
        prenom=eleve.prenom,
        matricule=eleve.matricule,
        classe_id=eleve.classe_id,
        date_inscription=eleve.date_inscription,
        classe_nom=classe_nom,
    )


@router.delete("/eleves/{eleve_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_eleve(
    eleve_id: int,
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_tenant_session),
):
    """Supprime un élève"""
    from app.models.school import Eleve

    if current_user.get("role") != "admin":
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Non autorisé")

    eleve = db.query(Eleve).filter(Eleve.id == eleve_id).first()
    if not eleve:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Élève non trouvé")

    db.delete(eleve)
    db.commit()


# ════════════════════════════════════════════════════════════
# STATS ADMIN — tableau de bord
# ════════════════════════════════════════════════════════════

@router.get("/stats")
def get_admin_stats(
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_tenant_session),
    master_db: Session = Depends(get_db_session),
):
    """Statistiques du tableau de bord administrateur"""
    from app.models.school import School, Professeur, Classe, Eleve, Matiere, Note, AnneeScolaire

    total_professeurs = db.query(Professeur).filter(Professeur.is_active == True).count()
    total_classes = db.query(Classe).count()
    total_eleves = db.query(Eleve).count()
    total_matieres = db.query(Matiere).count()
    total_notes = db.query(Note).count()
    annee_active = db.query(AnneeScolaire).filter(AnneeScolaire.is_active == True).first()

    school_name = None
    school_id = current_user.get("school_id")
    if school_id:
        school = master_db.query(School).filter(School.id == school_id).first()
        if school:
            school_name = school.name

    return {
        "total_professeurs": total_professeurs,
        "total_classes": total_classes,
        "total_eleves": total_eleves,
        "total_matieres": total_matieres,
        "total_notes": total_notes,
        "annee_scolaire": annee_active.annee if annee_active else None,
        "school_name": school_name,
    }
