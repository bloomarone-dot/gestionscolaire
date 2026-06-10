from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session
from pydantic import BaseModel, EmailStr
from app.db.connection import get_db_session
from app.db.multi_tenant import tenant_manager
from app.models.school import Admin, Professeur
from app.auth.security import verify_password, create_access_token, hash_password

router = APIRouter()


class AdminRegister(BaseModel):
    username: str
    email: EmailStr
    password: str
    first_name: str
    last_name: str


class ProfessorLoginRequest(BaseModel):
    username: str
    password: str
    school_id: int


@router.post("/login")
def login(form_data: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(get_db_session)):
    """Login pour Admin et SuperAdmin"""
    admin = db.query(Admin).filter(Admin.username == form_data.username).first()
    
    if not admin or not verify_password(form_data.password, admin.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Identifiants ou mot de passe incorrects",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    if not admin.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Ce compte est désactivé"
        )
    
    access_token = create_access_token(
        data={
            "sub": admin.username,
            "id": admin.id,
            "role": admin.role,
            "school_id": admin.school_id
        }
    )
    return {
        "access_token": access_token,
        "token_type": "bearer",
        "id": admin.id,
        "username": admin.username,
        "role": admin.role,
        "school_id": admin.school_id,
        "first_name": admin.first_name,
        "last_name": admin.last_name
    }


@router.post("/register-superadmin")
def register_superadmin(
    admin_data: AdminRegister,
    db: Session = Depends(get_db_session)
):
    """Crée un super-administrateur (à faire une seule fois)"""
    
    # Vérifier s'il y a déjà un superadmin
    existing_superadmin = db.query(Admin).filter(Admin.role == "superadmin").first()
    if existing_superadmin:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Un super-administrateur existe déjà"
        )
    
    # Vérifier si le username existe
    existing_admin = db.query(Admin).filter(Admin.username == admin_data.username).first()
    if existing_admin:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Ce nom d'utilisateur existe déjà"
        )
    
    superadmin = Admin(
        username=admin_data.username,
        email=admin_data.email,
        hashed_password=hash_password(admin_data.password),
        first_name=admin_data.first_name,
        last_name=admin_data.last_name,
        role="superadmin"
    )
    db.add(superadmin)
    db.commit()
    
    return {
        "message": "Super-administrateur créé avec succès",
        "username": admin_data.username
    }


@router.post("/login-professor")
def login_professor(login_data: ProfessorLoginRequest, db: Session = Depends(get_db_session)):
    """Login pour Professeur — nécessite school_id"""
    from app.models.school import School

    school = db.query(School).filter(School.id == login_data.school_id).first()
    if not school or not school.is_active:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Établissement non trouvé ou inactif",
        )

    tenant_db = tenant_manager.open_tenant_session(school)
    try:
        professor = tenant_db.query(Professeur).filter(
            Professeur.username == login_data.username
        ).first()
    finally:
        tenant_db.close()

    if not professor or not verify_password(login_data.password, professor.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Identifiants ou mot de passe incorrects",
            headers={"WWW-Authenticate": "Bearer"},
        )

    if not professor.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Ce compte professeur est désactivé",
        )

    access_token = create_access_token(
        data={
            "sub": professor.username,
            "id": professor.id,
            "role": "professeur",
            "school_id": login_data.school_id,
        }
    )

    return {
        "access_token": access_token,
        "token_type": "bearer",
        "id": professor.id,
        "username": professor.username,
        "role": "professeur",
        "school_id": login_data.school_id,
        "first_name": professor.prenom,
        "last_name": professor.nom,
    }

