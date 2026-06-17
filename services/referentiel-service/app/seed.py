"""Pré-remplissage idempotent du référentiel national (cahier §2 & §3).

Usage :
    python -m app.seed          # contre la base configurée (DATABASE_URL)
Et appelé automatiquement au démarrage du service si la base est vide.
"""
from sqlalchemy.orm import Session

from app import seed_data as D
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


def is_seeded(session: Session) -> bool:
    return session.query(Subsystem).count() > 0


def seed_all(session: Session) -> None:
    """Insère tout le référentiel s'il n'est pas déjà présent (idempotent)."""
    if is_seeded(session):
        return

    # ── Référentiels simples ──────────────────────────────────────────────
    subsystems = {code: Subsystem(code=code, name=name) for code, name in D.SUBSYSTEMS}
    types = {
        code: TeachingType(code=code, name_fr=fr, name_en=en)
        for code, fr, en in D.TEACHING_TYPES
    }
    cycles = {
        code: Cycle(code=code, name_fr=fr, name_en=en, order=order)
        for code, fr, en, order in D.CYCLES
    }
    session.add_all([*subsystems.values(), *types.values(), *cycles.values()])
    session.flush()

    # ── Niveaux ───────────────────────────────────────────────────────────
    levels: dict[str, Level] = {}
    for code, name, sub, typ, cyc, exam, order in D.LEVELS:
        level = Level(
            code=code, name=name, subsystem_id=subsystems[sub].id,
            teaching_type_id=types[typ].id, cycle_id=cycles[cyc].id,
            exam=exam, order=order,
        )
        levels[code] = level
    session.add_all(levels.values())
    session.flush()

    # ── Séries / spécialités ──────────────────────────────────────────────
    series: dict[str, SeriesSpecialty] = {
        code: SeriesSpecialty(code=code, name_fr=fr, name_en=en)
        for code, fr, en in D.SERIES
    }
    session.add_all(series.values())
    session.flush()

    # ── Séries proposées par niveau ───────────────────────────────────────
    for level_code, series_codes in D.LEVEL_SERIES.items():
        for sc in series_codes:
            session.add(LevelSeries(level_id=levels[level_code].id, series_id=series[sc].id))

    # ── Matières ──────────────────────────────────────────────────────────
    subjects: dict[str, Subject] = {
        code: Subject(code=code, name=name) for code, name in D.SUBJECTS
    }
    session.add_all(subjects.values())
    session.flush()

    # ── Éligibilité + coefficients ────────────────────────────────────────
    def add_elig(subject_code: str, level_code: str, series_code: str | None, coef: float,
                 groupe: int | None = None):
        session.add(SubjectEligibility(
            subject_id=subjects[subject_code].id,
            level_id=levels[level_code].id,
            series_id=series[series_code].id if series_code else None,
            default_coefficient=coef,
            groupe=groupe,
        ))

    # §3.2 Premier cycle francophone général (tronc commun)
    for level_code in D.PREMIER_CYCLE_FR_LEVELS:
        for subject_code, coef in D.PREMIER_CYCLE_FR.items():
            add_elig(subject_code, level_code, None, coef)

    # §3.3 Second cycle francophone général (par série) — avec groupe de bulletin.
    for level_code in D.SECOND_CYCLE_FR_LEVELS:
        for series_code in D.LEVEL_SERIES[level_code]:
            coef_map = D.SECOND_CYCLE_FR_BY_SERIES[series_code]
            for subject_code, coef in coef_map.items():
                add_elig(subject_code, level_code, series_code, coef,
                         groupe=D.groupe_for(series_code, subject_code))

    # §3.4 Sections techniques commerciales
    for level_code, series_codes in D.TECH_COMMERCIAL_BY_LEVEL.items():
        for series_code in series_codes:
            for subject_code, coef in D.TECH_COMMERCIAL.items():
                add_elig(subject_code, level_code, series_code, coef)

    # §3.5 Sections industrielles
    for level_code, series_codes in D.TECH_INDUSTRIAL_BY_LEVEL.items():
        for series_code in series_codes:
            for subject_code, coef in D.TECH_INDUSTRIAL.items():
                add_elig(subject_code, level_code, series_code, coef)

    # §3.6 Anglophone general (tronc commun Form 1→5)
    for level_code in D.ANGLO_GENERAL_LEVELS:
        for subject_code, coef in D.ANGLO_GENERAL.items():
            add_elig(subject_code, level_code, None, coef)

    session.commit()


if __name__ == "__main__":
    from common.db import get_engine, init_engine
    from sqlalchemy.orm import sessionmaker

    from app.config import settings
    from app.models import Base

    init_engine(settings.database_url)
    Base.metadata.create_all(bind=get_engine())
    db = sessionmaker(bind=get_engine())()
    try:
        seed_all(db)
        print("Référentiel national seedé.")
    finally:
        db.close()
