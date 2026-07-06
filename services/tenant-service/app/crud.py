"""Accès données tenant-service."""
from typing import Optional

from sqlalchemy.orm import Session

from common.appreciation_scales import dump_scales, parse_scales

from common.bulletin_theme import parse_theme
from common.bulletin_layout import parse_layout
from common.establishment import default_profile_for_kind, normalize_establishment_kind

from app.models import (
    NotificationChannel,
    School,
    SchoolSubsystem,
    SchoolTeachingType,
)
from app.schemas import SchoolCreate, SchoolProfile


def create_school(db: Session, payload: SchoolCreate) -> School:
    kind = normalize_establishment_kind(payload.establishment_kind)
    defaults = default_profile_for_kind(kind)
    subsystems = payload.subsystems if payload.subsystems else defaults["subsystems"]
    teaching_types = payload.teaching_types if payload.teaching_types else defaults["teaching_types"]
    channels = payload.channels if payload.channels else defaults["channels"]
    school = School(
        name=payload.name, code=payload.code, city=payload.city,
        address=payload.address, phone=payload.phone,
        establishment_kind=kind,
    )
    db.add(school)
    db.flush()
    _set_profile(db, school, subsystems, teaching_types, channels)
    db.commit()
    db.refresh(school)
    return school


def _set_profile(
    db: Session,
    school: School,
    subsystems: Optional[list[str]],
    teaching_types: Optional[list[str]],
    channels: Optional[list[str]],
) -> None:
    if subsystems is not None:
        school.subsystems.clear()
        db.flush()
        for code in dict.fromkeys(subsystems):
            db.add(SchoolSubsystem(school_id=school.id, subsystem_code=code))
    if teaching_types is not None:
        school.teaching_types.clear()
        db.flush()
        for code in dict.fromkeys(teaching_types):
            db.add(SchoolTeachingType(school_id=school.id, type_code=code))
    if channels is not None:
        school.channels.clear()
        db.flush()
        for ch in dict.fromkeys(channels):
            db.add(NotificationChannel(school_id=school.id, channel=ch, enabled=True))


def set_profile(db: Session, school: School, subsystems, teaching_types, channels) -> None:
    _set_profile(db, school, subsystems, teaching_types, channels)
    db.commit()
    db.refresh(school)


def get_school(db: Session, school_id: int) -> Optional[School]:
    return db.query(School).filter(School.id == school_id).first()


def list_schools(db: Session, only_id: Optional[int] = None) -> list[School]:
    q = db.query(School)
    if only_id is not None:
        q = q.filter(School.id == only_id)
    return q.order_by(School.name).all()


def delete_school(db: Session, school_id: int) -> bool:
    school = get_school(db, school_id)
    if not school:
        return False
    db.delete(school)
    db.commit()
    return True


def to_profile(school: School) -> SchoolProfile:
    return SchoolProfile(
        id=school.id, name=school.name, code=school.code, city=school.city,
        address=school.address, phone=school.phone, logo_url=school.logo_url,
        primary_color=school.primary_color, secondary_color=school.secondary_color,
        bulletin_po_box=school.bulletin_po_box, bulletin_motto=school.bulletin_motto,
        bulletin_delegation_regional=school.bulletin_delegation_regional,
        bulletin_delegation_departementale=school.bulletin_delegation_departementale,
        bulletin_next_term_note=school.bulletin_next_term_note,
        bulletin_appreciation_scales=parse_scales(school.bulletin_appreciation_scales),
        bulletin_theme=parse_theme(getattr(school, "bulletin_theme", None)),
        bulletin_layout_profile=parse_layout(
            getattr(school, "bulletin_layout_profile", None),
            getattr(school, "establishment_kind", None),
        ),
        bulletin_reference_url=getattr(school, "bulletin_reference_url", None),
        subscription_plan=school.subscription_plan,
        establishment_kind=normalize_establishment_kind(getattr(school, "establishment_kind", None)),
        is_active=school.is_active,
        created_at=school.created_at,
        subsystems=[s.subsystem_code for s in school.subsystems],
        teaching_types=[t.type_code for t in school.teaching_types],
        channels=[c.channel for c in school.channels if c.enabled],
    )
