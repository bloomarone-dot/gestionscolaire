"""
Endpoints Super Admin — statistiques globales, admins, logs
"""
from datetime import datetime, timedelta
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, ConfigDict, EmailStr
from sqlalchemy import func
from sqlalchemy.orm import Session

from app.auth.security import get_current_user
from app.db.connection import get_db_session
from app.db.multi_tenant import tenant_manager, tenant_schema_name
from app.models.school import School, Admin, ActivityLog, Eleve, Professeur

router = APIRouter(tags=["Super Admin"])


def _require_superadmin(current_user: dict):
    if current_user.get("role") != "superadmin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Accès réservé au super-administrateur",
        )


class AdminAssignRequest(BaseModel):
    school_id: int


class AdminResponse(BaseModel):
    id: int
    username: str
    email: str
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    role: str
    is_active: bool
    school_id: Optional[int] = None
    school_name: Optional[str] = None
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class ActivityLogResponse(BaseModel):
    id: int
    action: str
    description: str
    timestamp: datetime
    admin_id: Optional[int] = None
    admin_username: Optional[str] = None
    school_id: Optional[int] = None
    school_name: Optional[str] = None


@router.get("/stats")
def get_dashboard_stats(
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db_session),
):
    _require_superadmin(current_user)

    start_of_day = datetime.utcnow().replace(hour=0, minute=0, second=0, microsecond=0)

    total_schools = db.query(School).count()
    active_schools = db.query(School).filter(School.is_active == True).count()
    total_admins = db.query(Admin).filter(Admin.role == "admin").count()
    schools = db.query(School).all()
    total_eleves = sum(tenant_manager.count_in_tenant(s, Eleve) for s in schools)
    total_professeurs = sum(tenant_manager.count_in_tenant(s, Professeur) for s in schools)
    today_activity = db.query(ActivityLog).filter(
        ActivityLog.timestamp >= start_of_day
    ).count()

    schools_by_city = (
        db.query(School.city, func.count(School.id).label("count"))
        .group_by(School.city)
        .order_by(func.count(School.id).desc())
        .all()
    )

    recent_schools = (
        db.query(School)
        .order_by(School.created_at.desc())
        .limit(5)
        .all()
    )

    today_logs = (
        db.query(ActivityLog)
        .filter(ActivityLog.timestamp >= start_of_day)
        .order_by(ActivityLog.timestamp.desc())
        .limit(10)
        .all()
    )

    def _admin_name(admin_id):
        if not admin_id:
            return None
        admin = db.query(Admin).filter(Admin.id == admin_id).first()
        return admin.username if admin else None

    def _school_name(school_id):
        if not school_id:
            return None
        school = db.query(School).filter(School.id == school_id).first()
        return school.name if school else None

    return {
        "total_schools": total_schools,
        "active_schools": active_schools,
        "total_admins": total_admins,
        "total_eleves": total_eleves,
        "total_professeurs": total_professeurs,
        "today_activity": today_activity,
        "schools_by_city": [
            {"city": city, "count": count} for city, count in schools_by_city
        ],
        "recent_schools": [
            {
                "id": s.id,
                "name": s.name,
                "city": s.city,
                "is_active": s.is_active,
                "created_at": s.created_at,
            }
            for s in recent_schools
        ],
        "today_logs": [
            {
                "id": log.id,
                "action": log.action,
                "description": log.description,
                "timestamp": log.timestamp,
                "admin_username": _admin_name(log.admin_id),
                "school_name": _school_name(log.school_id),
            }
            for log in today_logs
        ],
    }


@router.get("/admins", response_model=List[AdminResponse])
def list_admins(
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db_session),
):
    _require_superadmin(current_user)

    admins = db.query(Admin).filter(Admin.role == "admin").order_by(Admin.created_at.desc()).all()
    result = []
    for admin in admins:
        school = db.query(School).filter(School.id == admin.school_id).first()
        result.append(
            AdminResponse(
                id=admin.id,
                username=admin.username,
                email=admin.email,
                first_name=admin.first_name,
                last_name=admin.last_name,
                role=admin.role,
                is_active=admin.is_active,
                school_id=admin.school_id,
                school_name=school.name if school else None,
                created_at=admin.created_at,
            )
        )
    return result


@router.put("/admins/{admin_id}/assign-school")
def assign_admin_to_school(
    admin_id: int,
    data: AdminAssignRequest,
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db_session),
):
    _require_superadmin(current_user)

    admin = db.query(Admin).filter(Admin.id == admin_id, Admin.role == "admin").first()
    if not admin:
        raise HTTPException(status_code=404, detail="Administrateur non trouvé")

    school = db.query(School).filter(School.id == data.school_id).first()
    if not school:
        raise HTTPException(status_code=404, detail="Établissement non trouvé")

    admin.school_id = school.id
    school.admin_id = admin.id

    if not school.db_name:
        school.db_name = tenant_schema_name(school.id)
    tenant_manager.provision_tenant(school)

    log = ActivityLog(
        admin_id=current_user.get("id"),
        school_id=school.id,
        action="assigned_admin",
        description=f"Admin '{admin.username}' assigné à '{school.name}'",
    )
    db.add(log)
    db.commit()

    return {"message": "Administrateur assigné avec succès", "admin_id": admin.id, "school_id": school.id}


@router.get("/logs", response_model=List[ActivityLogResponse])
def list_activity_logs(
    current_user: dict = Depends(get_current_user),
    skip: int = 0,
    limit: int = 50,
    db: Session = Depends(get_db_session),
):
    _require_superadmin(current_user)

    logs = (
        db.query(ActivityLog)
        .order_by(ActivityLog.timestamp.desc())
        .offset(skip)
        .limit(limit)
        .all()
    )

    result = []
    for log in logs:
        admin = db.query(Admin).filter(Admin.id == log.admin_id).first() if log.admin_id else None
        school = db.query(School).filter(School.id == log.school_id).first() if log.school_id else None
        result.append(
            ActivityLogResponse(
                id=log.id,
                action=log.action,
                description=log.description,
                timestamp=log.timestamp,
                admin_id=log.admin_id,
                admin_username=admin.username if admin else None,
                school_id=log.school_id,
                school_name=school.name if school else None,
            )
        )
    return result


@router.get("/settings")
def get_global_settings(current_user: dict = Depends(get_current_user)):
    _require_superadmin(current_user)
    from app.db.connection import is_sqlite

    return {
        "app_name": "EduSaaS",
        "database_mode": "sqlite" if is_sqlite() else "sql_server",
        "multi_tenant_strategy": "schema_per_school",
        "version": "1.0.0",
    }
