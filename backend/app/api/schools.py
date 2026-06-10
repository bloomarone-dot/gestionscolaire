"""
API endpoints pour gestion des établissements (Super Admin)
"""
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from pydantic import BaseModel, EmailStr
from typing import List, Optional
from datetime import datetime

from app.db.connection import get_db_session
from app.db.multi_tenant import default_tenant_db_credentials, tenant_manager
from app.db.connection import is_sqlite
from app.models.school import School, Admin, ActivityLog, Eleve, Professeur
from app.auth.security import get_current_user, hash_password

router = APIRouter(prefix="/schools", tags=["Schools Management"])


# ════════════════════════════════════════════════════════════
# Schémas Pydantic
# ════════════════════════════════════════════════════════════

class SchoolCreate(BaseModel):
    name: str
    email: EmailStr
    phone: str
    address: str
    city: str
    postal_code: str
    directeur_first_name: str
    directeur_last_name: str
    directeur_email: Optional[EmailStr] = None
    directeur_phone: Optional[str] = None
    logo_url: Optional[str] = None
    primary_color: Optional[str] = "#10b981"
    secondary_color: Optional[str] = "#f59e0b"
    admin_username: str
    admin_email: EmailStr
    admin_password: str
    admin_first_name: str
    admin_last_name: str
    # Connexion SQL Server dédiée (une base par établissement — style Sage 100)
    use_default_db_server: bool = True
    db_host: Optional[str] = None
    db_port: Optional[int] = None
    db_username: Optional[str] = None
    db_password: Optional[str] = None


class SchoolDbServerTest(BaseModel):
    db_host: str
    db_port: int = 1433
    db_username: str
    db_password: str


class SchoolUpdate(BaseModel):
    name: Optional[str] = None
    email: Optional[EmailStr] = None
    phone: Optional[str] = None
    address: Optional[str] = None
    city: Optional[str] = None
    postal_code: Optional[str] = None
    directeur_first_name: Optional[str] = None
    directeur_last_name: Optional[str] = None
    directeur_email: Optional[EmailStr] = None
    directeur_phone: Optional[str] = None
    logo_url: Optional[str] = None
    primary_color: Optional[str] = None
    secondary_color: Optional[str] = None


class SchoolDBConfig(BaseModel):
    db_host: Optional[str] = None
    db_port: Optional[int] = None
    db_username: Optional[str] = None
    db_password: Optional[str] = None


class SchoolResponse(BaseModel):
    id: int
    name: str
    email: str
    phone: str
    address: str
    city: str
    postal_code: str
    db_name: str
    admin_id: Optional[int]
    logo_url: Optional[str] = None
    primary_color: Optional[str] = "#10b981"
    secondary_color: Optional[str] = "#f59e0b"
    is_active: bool
    created_at: datetime
    
    class Config:
        from_attributes = True


class DirecteurResponse(BaseModel):
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    email: Optional[str] = None
    phone: Optional[str] = None


class SchoolDetailResponse(SchoolResponse):
    admin: Optional[dict] = None
    directeur: Optional[DirecteurResponse] = None
    db_host: Optional[str] = None
    db_port: Optional[int] = None
    db_username: Optional[str] = None


class SchoolListItemResponse(SchoolResponse):
    db_status: Optional[str] = None


class SchoolPublicResponse(BaseModel):
    id: int
    name: str
    city: str

    class Config:
        from_attributes = True


def _resolve_school_db_credentials(school_data: SchoolCreate) -> dict:
    """Résout les credentials SQL Server pour un nouvel établissement."""
    if school_data.use_default_db_server or is_sqlite():
        defaults = default_tenant_db_credentials()
        return {
            "db_host": defaults["db_host"],
            "db_port": defaults["db_port"],
            "db_username": defaults["db_username"],
            "db_password": defaults["db_password"],
        }

    missing = [
        field
        for field, value in {
            "db_host": school_data.db_host,
            "db_username": school_data.db_username,
            "db_password": school_data.db_password,
        }.items()
        if not value
    ]
    if missing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Champs requis pour la connexion SQL Server : {', '.join(missing)}",
        )

    return {
        "db_host": school_data.db_host,
        "db_port": school_data.db_port or 1433,
        "db_username": school_data.db_username,
        "db_password": school_data.db_password,
    }


# ════════════════════════════════════════════════════════════
# CRUD Endpoints
# ════════════════════════════════════════════════════════════

@router.post("/test-db-server")
def test_db_server_before_create(
    payload: SchoolDbServerTest,
    current_user: dict = Depends(get_current_user),
):
    """Teste la connexion au serveur SQL Server avant création d'un établissement."""
    if current_user.get("role") != "superadmin":
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Non autorisé")
    if is_sqlite():
        return {
            "status": "connected",
            "message": "Mode SQLite : aucune connexion SQL Server requise",
        }
    return tenant_manager.test_server_connection(
        payload.db_host,
        payload.db_port,
        payload.db_username,
        payload.db_password,
    )


@router.post("/", response_model=SchoolResponse, status_code=status.HTTP_201_CREATED)
def create_school(
    school_data: SchoolCreate,
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db_session)
):
    """Crée un nouvel établissement avec son admin"""
    
    # Vérifier que l'utilisateur est superadmin
    if current_user.get("role") != "superadmin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Seul un super-administrateur peut créer des établissements"
        )
    
    # Vérifier si l'email de l'établissement existe déjà
    existing_school = db.query(School).filter(School.email == school_data.email).first()
    if existing_school:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Un établissement avec cet email existe déjà"
        )
    
    # Vérifier si le username d'admin existe déjà
    existing_admin = db.query(Admin).filter(Admin.username == school_data.admin_username).first()
    if existing_admin:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cet nom d'utilisateur admin est déjà pris"
        )
    
    try:
        # 1. Créer l'admin de l'établissement
        admin = Admin(
            username=school_data.admin_username,
            email=school_data.admin_email,
            hashed_password=hash_password(school_data.admin_password),
            first_name=school_data.admin_first_name,
            last_name=school_data.admin_last_name,
            role="admin"
        )
        db.add(admin)
        db.flush()  # Récupérer l'ID de l'admin

        db_creds = _resolve_school_db_credentials(school_data)
        if not is_sqlite():
            server_check = tenant_manager.test_server_connection(**db_creds)
            if server_check["status"] != "connected":
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"Connexion SQL Server impossible : {server_check['message']}",
                )
        
        # 2. Créer l'établissement
        school = School(
            name=school_data.name,
            email=school_data.email,
            phone=school_data.phone,
            address=school_data.address,
            city=school_data.city,
            postal_code=school_data.postal_code,
            directeur_first_name=school_data.directeur_first_name,
            directeur_last_name=school_data.directeur_last_name,
            directeur_email=school_data.directeur_email,
            directeur_phone=school_data.directeur_phone,
            logo_url=school_data.logo_url,
            primary_color=school_data.primary_color or "#10b981",
            secondary_color=school_data.secondary_color or "#f59e0b",
            db_host=db_creds["db_host"],
            db_port=db_creds["db_port"],
            db_username=db_creds["db_username"],
            db_password=db_creds["db_password"],
            admin_id=admin.id
        )
        db.add(school)
        db.flush()

        school.db_name = f"school_{school.id}"
        
        # 3. Mettre à jour l'admin avec l'ID de l'établissement
        admin.school_id = school.id
        
        # 4. Provisionner la base tenant (base SQL Server dédiée ou fichier SQLite)
        if not tenant_manager.provision_tenant(school):
            db.rollback()
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Erreur lors de la création de la base de données de l'établissement",
            )
        
        # 5. Logger l'activité
        log = ActivityLog(
            admin_id=current_user.get("id"),
            school_id=school.id,
            action="created_school",
            description=f"Établissement '{school.name}' créé avec succès"
        )
        db.add(log)
        
        db.commit()
        db.refresh(school)

        return school
    
    except HTTPException:
        db.rollback()
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Erreur lors de la création: {str(e)}"
        )


@router.get("/public", response_model=List[SchoolPublicResponse])
def list_schools_public(db: Session = Depends(get_db_session)):
    """Liste publique des établissements actifs (login professeur)"""
    return db.query(School).filter(School.is_active == True).all()


@router.get("/", response_model=List[SchoolListItemResponse])
def list_schools(
    current_user: dict = Depends(get_current_user),
    skip: int = 0,
    limit: int = 100,
    include_db_status: bool = False,
    db: Session = Depends(get_db_session)
):
    """Liste tous les établissements"""
    
    if current_user.get("role") != "superadmin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Seul un super-administrateur peut voir la liste des établissements"
        )
    
    schools = db.query(School).offset(skip).limit(limit).all()
    result = []
    for school in schools:
        item = {
            "id": school.id,
            "name": school.name,
            "email": school.email,
            "phone": school.phone,
            "address": school.address,
            "city": school.city,
            "postal_code": school.postal_code,
            "db_name": school.db_name,
            "admin_id": school.admin_id,
            "logo_url": school.logo_url,
            "primary_color": school.primary_color,
            "secondary_color": school.secondary_color,
            "is_active": school.is_active,
            "created_at": school.created_at,
            "db_status": None,
        }
        if include_db_status:
            item["db_status"] = tenant_manager.test_connection(school)["status"]
        result.append(item)
    return result


@router.get("/{school_id}", response_model=SchoolDetailResponse)
def get_school(
    school_id: int,
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db_session)
):
    """Récupère les détails d'un établissement"""
    
    if current_user.get("role") != "superadmin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Non autorisé"
        )
    
    school = db.query(School).filter(School.id == school_id).first()
    if not school:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Établissement non trouvé"
        )

    admin_data = None
    if school.admin_id:
        admin = db.query(Admin).filter(Admin.id == school.admin_id).first()
        if admin:
            admin_data = {
                "id": admin.id,
                "username": admin.username,
                "email": admin.email,
                "first_name": admin.first_name,
                "last_name": admin.last_name,
            }

    return {
        "id": school.id,
        "name": school.name,
        "email": school.email,
        "phone": school.phone,
        "address": school.address,
        "city": school.city,
        "postal_code": school.postal_code,
        "db_name": school.db_name,
        "admin_id": school.admin_id,
        "is_active": school.is_active,
        "created_at": school.created_at,
        "admin": admin_data,
        "directeur": {
            "first_name": school.directeur_first_name,
            "last_name": school.directeur_last_name,
            "email": school.directeur_email,
            "phone": school.directeur_phone,
        } if school.directeur_first_name or school.directeur_last_name else None,
        "db_host": school.db_host,
        "db_port": school.db_port,
        "db_username": school.db_username,
    }


@router.put("/{school_id}", response_model=SchoolResponse)
def update_school(
    school_id: int,
    school_update: SchoolUpdate,
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db_session)
):
    """Modifie un établissement"""
    
    if current_user.get("role") != "superadmin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Non autorisé"
        )
    
    school = db.query(School).filter(School.id == school_id).first()
    if not school:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Établissement non trouvé"
        )
    
    # Mettre à jour les champs fournis
    update_data = school_update.dict(exclude_unset=True)
    for field, value in update_data.items():
        setattr(school, field, value)
    
    # Logger l'activité
    log = ActivityLog(
        admin_id=current_user.get("id"),
        school_id=school.id,
        action="updated_school",
        description=f"Établissement '{school.name}' modifié"
    )
    db.add(log)
    
    db.commit()
    return school


@router.delete("/{school_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_school(
    school_id: int,
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db_session)
):
    """Supprime un établissement"""
    
    if current_user.get("role") != "superadmin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Non autorisé"
        )
    
    school = db.query(School).filter(School.id == school_id).first()
    if not school:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Établissement non trouvé"
        )
    
    tenant_manager.delete_tenant(school)
    
    # Supprimer de la BD
    db.delete(school)
    
    # Logger
    log = ActivityLog(
        admin_id=current_user.get("id"),
        action="deleted_school",
        description=f"Établissement '{school.name}' supprimé"
    )
    db.add(log)
    
    db.commit()


@router.get("/{school_id}/stats", response_model=dict)
def get_school_stats(
    school_id: int,
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db_session)
):
    """Récupère les statistiques d'un établissement"""
    
    school = db.query(School).filter(School.id == school_id).first()
    if not school:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Établissement non trouvé"
        )
    
    connection = tenant_manager.test_connection(school)
    eleves_count = tenant_manager.count_in_tenant(school, Eleve)
    profs_count = tenant_manager.count_in_tenant(school, Professeur)

    return {
        "school_id": school.id,
        "name": school.name,
        "is_active": school.is_active,
        "created_at": school.created_at,
        "db_name": school.db_name,
        "db_status": connection["status"],
        "db_message": connection["message"],
        "total_eleves": eleves_count,
        "total_professeurs": profs_count,
    }


@router.put("/{school_id}/db-config")
def update_school_db_config(
    school_id: int,
    db_config: SchoolDBConfig,
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db_session),
):
    """Met à jour les credentials de connexion BD d'un établissement (SQL Server prod)"""
    if current_user.get("role") != "superadmin":
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Non autorisé")

    school = db.query(School).filter(School.id == school_id).first()
    if not school:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Établissement non trouvé")

    # Invalider le cache du moteur tenant avant de changer les credentials
    cache_key = f"{school.id}:{school.db_name}"
    tenant_manager.tenant_engines.pop(cache_key, None)

    for field, value in db_config.dict(exclude_unset=True).items():
        if value is not None:
            setattr(school, field, value)

    log = ActivityLog(
        admin_id=current_user.get("id"),
        school_id=school.id,
        action="updated_db_config",
        description=f"Configuration BD de '{school.name}' mise à jour",
    )
    db.add(log)
    db.commit()
    db.refresh(school)

    # Tester immédiatement la connexion
    connection = tenant_manager.test_connection(school)
    return {
        "message": "Configuration mise à jour",
        "db_name": school.db_name,
        "db_status": connection["status"],
        "db_message": connection["message"],
    }


@router.post("/{school_id}/test-connection")
def test_school_connection(
    school_id: int,
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db_session),
):
    """Teste la connexion à la base tenant d'un établissement"""
    if current_user.get("role") != "superadmin":
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Non autorisé")

    school = db.query(School).filter(School.id == school_id).first()
    if not school:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Établissement non trouvé")

    result = tenant_manager.test_connection(school)
    return result


@router.put("/{school_id}/toggle-active")
def toggle_school_active(
    school_id: int,
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db_session),
):
    """Active ou désactive un établissement"""
    if current_user.get("role") != "superadmin":
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Non autorisé")

    school = db.query(School).filter(School.id == school_id).first()
    if not school:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Établissement non trouvé")

    school.is_active = not school.is_active
    action = "activated_school" if school.is_active else "deactivated_school"
    log = ActivityLog(
        admin_id=current_user.get("id"),
        school_id=school.id,
        action=action,
        description=f"Établissement '{school.name}' {'activé' if school.is_active else 'désactivé'}",
    )
    db.add(log)
    db.commit()
    db.refresh(school)
    return {"id": school.id, "is_active": school.is_active}
