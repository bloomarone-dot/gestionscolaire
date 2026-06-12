"""Requêtes de lecture du référentiel — alimentent la cascade et l'héritage des matières."""
from typing import Optional

from sqlalchemy.orm import Session

from app.models import (
    Cycle,
    Level,
    LevelSeries,
    SeriesSpecialty,
    Subject,
    SubjectEligibility,
    Subsystem,
    TeachingType,
)


def list_subsystems(db: Session):
    return db.query(Subsystem).order_by(Subsystem.id).all()


def list_teaching_types(db: Session, subsystem_code: Optional[str] = None):
    """Types présents pour un sous-système (d'après les niveaux existants)."""
    q = db.query(TeachingType).order_by(TeachingType.id)
    if subsystem_code:
        q = (
            db.query(TeachingType)
            .join(Level, Level.teaching_type_id == TeachingType.id)
            .join(Subsystem, Subsystem.id == Level.subsystem_id)
            .filter(Subsystem.code == subsystem_code)
            .distinct()
            .order_by(TeachingType.id)
        )
    return q.all()


def list_cycles(db: Session, subsystem_code: str, type_code: str):
    return (
        db.query(Cycle)
        .join(Level, Level.cycle_id == Cycle.id)
        .join(Subsystem, Subsystem.id == Level.subsystem_id)
        .join(TeachingType, TeachingType.id == Level.teaching_type_id)
        .filter(Subsystem.code == subsystem_code, TeachingType.code == type_code)
        .distinct()
        .order_by(Cycle.order)
        .all()
    )


def list_levels(db: Session, subsystem_code: str, type_code: str, cycle_code: str):
    return (
        db.query(Level)
        .join(Subsystem, Subsystem.id == Level.subsystem_id)
        .join(TeachingType, TeachingType.id == Level.teaching_type_id)
        .join(Cycle, Cycle.id == Level.cycle_id)
        .filter(
            Subsystem.code == subsystem_code,
            TeachingType.code == type_code,
            Cycle.code == cycle_code,
        )
        .order_by(Level.order)
        .all()
    )


def list_series_for_level(db: Session, level_code: str):
    return (
        db.query(SeriesSpecialty)
        .join(LevelSeries, LevelSeries.series_id == SeriesSpecialty.id)
        .join(Level, Level.id == LevelSeries.level_id)
        .filter(Level.code == level_code)
        .order_by(SeriesSpecialty.code)
        .all()
    )


def resolve_subjects(db: Session, level_code: str, series_code: Optional[str] = None):
    """Matières + coefficients pour un profil (héritage automatique §4.2).

    Renvoie une liste de tuples (Subject, coefficient, is_obligatoire).
    """
    q = (
        db.query(SubjectEligibility, Subject)
        .join(Subject, Subject.id == SubjectEligibility.subject_id)
        .join(Level, Level.id == SubjectEligibility.level_id)
        .filter(Level.code == level_code)
    )
    if series_code:
        q = q.join(
            SeriesSpecialty, SeriesSpecialty.id == SubjectEligibility.series_id
        ).filter(SeriesSpecialty.code == series_code)
    else:
        q = q.filter(SubjectEligibility.series_id.is_(None))
    return [(subj, elig.default_coefficient, elig.is_obligatoire) for elig, subj in q.all()]
