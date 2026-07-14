"""Logique métier personnel-service (pure et testable)."""
from typing import Optional

from sqlalchemy.orm import Session

from common.personnel_roles import is_teacher_fonction, resolve_auth_role

from app.models import ROLE_DIRECTION, ROLE_ENSEIGNANT, Personnel, TeachableSubject
from app.schemas import DirectionCreate, EnseignantCreate, PersonnelUpdate, StaffCreate


class NotFound(Exception):
    pass


def create_enseignant(
    db: Session, tenant_id: int, payload: EnseignantCreate, account_id: Optional[int]
) -> Personnel:
    p = Personnel(
        tenant_id=tenant_id, role_type=ROLE_ENSEIGNANT,
        nom=payload.nom, prenom=payload.prenom, sexe=payload.sexe,
        phone=payload.phone, phone2=payload.phone2, email=payload.email,
        specialite=payload.specialite, diplome=payload.diplome,
        fonction="Enseignant",
        account_id=account_id,
    )
    db.add(p)
    db.flush()
    for s in payload.teachable_subjects:
        db.add(TeachableSubject(
            tenant_id=tenant_id, personnel_id=p.id, label=s.label,
            subject_code=s.subject_code, special_subject_id=s.special_subject_id,
        ))
    db.commit()
    db.refresh(p)
    return p


def create_direction(
    db: Session, tenant_id: int, payload: DirectionCreate, account_id: Optional[int]
) -> Personnel:
    p = Personnel(
        tenant_id=tenant_id, role_type=ROLE_DIRECTION,
        nom=payload.nom, prenom=payload.prenom,
        phone=payload.phone, phone2=payload.phone2, email=payload.email,
        fonction=payload.fonction, account_id=account_id,
    )
    db.add(p)
    db.commit()
    db.refresh(p)
    return p


def list_personnel(db: Session, tenant_id: int, role_type: Optional[str] = None) -> list[Personnel]:
    q = db.query(Personnel).filter(Personnel.tenant_id == tenant_id)
    if role_type:
        q = q.filter(Personnel.role_type == role_type)
    return q.order_by(Personnel.nom, Personnel.prenom).all()


def get_personnel(db: Session, tenant_id: int, personnel_id: int) -> Personnel:
    p = (
        db.query(Personnel)
        .filter(Personnel.tenant_id == tenant_id, Personnel.id == personnel_id)
        .first()
    )
    if not p:
        raise NotFound("Personnel introuvable")
    return p


def create_staff(
    db: Session, tenant_id: int, payload: StaffCreate, account_id: Optional[int]
) -> Personnel:
    role_type = ROLE_ENSEIGNANT if is_teacher_fonction(payload.fonction) else ROLE_DIRECTION
    p = Personnel(
        tenant_id=tenant_id,
        role_type=role_type,
        nom=payload.nom,
        prenom=payload.prenom,
        sexe=payload.sexe or "M",
        phone=payload.phone,
        phone2=payload.phone2,
        email=payload.email,
        specialite=payload.specialite,
        fonction=payload.fonction,
        account_id=account_id,
    )
    db.add(p)
    db.commit()
    db.refresh(p)
    return p


def update_personnel(
    db: Session, tenant_id: int, personnel_id: int, payload: PersonnelUpdate
) -> Personnel:
    p = get_personnel(db, tenant_id, personnel_id)
    data = payload.model_dump(exclude_unset=True)
    if "fonction" in data and data["fonction"]:
        p.role_type = ROLE_ENSEIGNANT if is_teacher_fonction(data["fonction"]) else ROLE_DIRECTION
    for field, value in data.items():
        setattr(p, field, value)
    db.commit()
    db.refresh(p)
    return p


def get_by_account(db: Session, tenant_id: int, account_id: int) -> Optional[Personnel]:
    """Fiche personnel rattachée au compte de connexion (auth account_id)."""
    return (
        db.query(Personnel)
        .filter(Personnel.tenant_id == tenant_id, Personnel.account_id == account_id)
        .first()
    )


def delete_personnel(db: Session, tenant_id: int, personnel_id: int) -> None:
    p = get_personnel(db, tenant_id, personnel_id)
    db.delete(p)
    db.commit()


def subject_labels(p: Personnel) -> list[str]:
    return [t.label for t in p.teachable_subjects]
