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

    # Formation en langues (CECRL A1→C2)
    for level_code in D.LANGUE_LEVELS:
        for subject_code, coef in D.LANGUE_SUBJECTS.items():
            add_elig(subject_code, level_code, None, coef)

    # École primaire — francophone & anglophone
    for level_code in D.MATERNELLE_FR_LEVELS:
        for subject_code, coef in D.MATERNELLE_FR.items():
            add_elig(subject_code, level_code, None, coef)
    for level_code in D.ELEMENTAIRE_FR_LEVELS:
        for subject_code, coef in D.PRIMAIRE_FR.items():
            add_elig(subject_code, level_code, None, coef)
    for level_code in D.PRIMAIRE_EN_LEVELS:
        for subject_code, coef in D.PRIMAIRE_EN.items():
            add_elig(subject_code, level_code, None, coef)

    session.commit()


def seed_maternelle_levels(session: Session) -> None:
    """Ajoute PS/MS/GS sur une base où SIL existe déjà (migration douce)."""
    if session.query(Level).filter(Level.code == "PS").first() is not None:
        return

    subsystems = {s.code: s for s in session.query(Subsystem).all()}
    types = {t.code: t for t in session.query(TeachingType).all()}
    if "GENERAL" not in types:
        return

    cycle = session.query(Cycle).filter(Cycle.code == "PRIMAIRE").first()
    if cycle is None:
        cycle = Cycle(code="PRIMAIRE", name_fr="École primaire", name_en="Primary school", order=0)
        session.add(cycle)
        session.flush()

    levels: dict[str, Level] = {}
    for code, name, sub, typ, cyc, exam, order in D.LEVELS:
        if cyc != "PRIMAIRE" or code not in D.MATERNELLE_FR_LEVELS:
            continue
        subsys = subsystems.get(sub)
        if subsys is None:
            continue
        levels[code] = Level(
            code=code, name=name, subsystem_id=subsys.id,
            teaching_type_id=types[typ].id, cycle_id=cycle.id,
            exam=exam, order=order,
        )
    if not levels:
        return
    session.add_all(levels.values())
    session.flush()

    subjects: dict[str, Subject] = {}
    for code, name in D.SUBJECTS:
        if not code.startswith("PR_"):
            continue
        existing = session.query(Subject).filter(Subject.code == code).first()
        subjects[code] = existing or Subject(code=code, name=name)
        if existing is None:
            session.add(subjects[code])
    session.flush()

    def _add_elig(subject_code: str, level_code: str, coef: float) -> None:
        level = levels.get(level_code)
        subj = subjects.get(subject_code) or session.query(Subject).filter(Subject.code == subject_code).first()
        if level is None or subj is None:
            return
        exists = session.query(SubjectEligibility).filter(
            SubjectEligibility.subject_id == subj.id,
            SubjectEligibility.level_id == level.id,
        ).first()
        if exists is None:
            session.add(SubjectEligibility(
                subject_id=subj.id, level_id=level.id,
                series_id=None, default_coefficient=coef, groupe=None,
            ))

    for level_code in D.MATERNELLE_FR_LEVELS:
        for subject_code, coef in D.MATERNELLE_FR.items():
            _add_elig(subject_code, level_code, coef)

    session.commit()


def seed_language_referential(session: Session) -> None:
    """Ajoute LANGUE / CECRL sur une base déjà seedée (migration douce)."""
    if session.query(Level).filter(Level.code == "A1").first() is not None:
        return

    sub_fr = session.query(Subsystem).filter(Subsystem.code == "FRANCOPHONE").first()
    if sub_fr is None:
        return

    typ = session.query(TeachingType).filter(TeachingType.code == "LANGUE").first()
    if typ is None:
        typ = TeachingType(code="LANGUE", name_fr="Formation en langues", name_en="Language training")
        session.add(typ)
        session.flush()

    cycle = session.query(Cycle).filter(Cycle.code == "CECRL").first()
    if cycle is None:
        cycle = Cycle(code="CECRL", name_fr="Cadre européen commun (CECRL)", name_en="CEFR", order=3)
        session.add(cycle)
        session.flush()

    levels: dict[str, Level] = {}
    for code, name, sub, typ_code, cyc, exam, order in D.LEVELS:
        if typ_code != "LANGUE":
            continue
        level = Level(
            code=code, name=name, subsystem_id=sub_fr.id,
            teaching_type_id=typ.id, cycle_id=cycle.id,
            exam=exam, order=order,
        )
        levels[code] = level
    session.add_all(levels.values())
    session.flush()

    subjects: dict[str, Subject] = {}
    for code, name in D.SUBJECTS:
        if not code.startswith("LANG_"):
            continue
        existing = session.query(Subject).filter(Subject.code == code).first()
        subjects[code] = existing or Subject(code=code, name=name)
        if existing is None:
            session.add(subjects[code])
    session.flush()

    for level_code in D.LANGUE_LEVELS:
        level = levels.get(level_code) or session.query(Level).filter(Level.code == level_code).first()
        if level is None:
            continue
        for subject_code, coef in D.LANGUE_SUBJECTS.items():
            subj = subjects.get(subject_code) or session.query(Subject).filter(Subject.code == subject_code).first()
            if subj is None:
                continue
            exists = session.query(SubjectEligibility).filter(
                SubjectEligibility.subject_id == subj.id,
                SubjectEligibility.level_id == level.id,
            ).first()
            if exists is None:
                session.add(SubjectEligibility(
                    subject_id=subj.id,
                    level_id=level.id,
                    series_id=None,
                    default_coefficient=coef,
                    groupe=None,
                ))

    session.commit()


def seed_primary_referential(session: Session) -> None:
    """Ajoute cycle PRIMAIRE, maternelle PS→GS et niveaux SIL→CM2 sur une base existante."""
    seed_maternelle_levels(session)
    if session.query(Level).filter(Level.code == "SIL").first() is not None:
        return

    subsystems = {s.code: s for s in session.query(Subsystem).all()}
    types = {t.code: t for t in session.query(TeachingType).all()}
    if "GENERAL" not in types:
        return

    cycle = session.query(Cycle).filter(Cycle.code == "PRIMAIRE").first()
    if cycle is None:
        cycle = Cycle(code="PRIMAIRE", name_fr="École primaire", name_en="Primary school", order=0)
        session.add(cycle)
        session.flush()

    levels: dict[str, Level] = {}
    for code, name, sub, typ, cyc, exam, order in D.LEVELS:
        if cyc != "PRIMAIRE":
            continue
        subsys = subsystems.get(sub)
        if subsys is None:
            continue
        level = Level(
            code=code, name=name, subsystem_id=subsys.id,
            teaching_type_id=types[typ].id, cycle_id=cycle.id,
            exam=exam, order=order,
        )
        levels[code] = level
    session.add_all(levels.values())
    session.flush()

    subjects: dict[str, Subject] = {}
    for code, name in D.SUBJECTS:
        if not code.startswith("PR_"):
            continue
        existing = session.query(Subject).filter(Subject.code == code).first()
        subjects[code] = existing or Subject(code=code, name=name)
        if existing is None:
            session.add(subjects[code])
    session.flush()

    def _add_elig(subject_code: str, level_code: str, coef: float) -> None:
        level = levels.get(level_code) or session.query(Level).filter(Level.code == level_code).first()
        subj = subjects.get(subject_code) or session.query(Subject).filter(Subject.code == subject_code).first()
        if level is None or subj is None:
            return
        exists = session.query(SubjectEligibility).filter(
            SubjectEligibility.subject_id == subj.id,
            SubjectEligibility.level_id == level.id,
        ).first()
        if exists is None:
            session.add(SubjectEligibility(
                subject_id=subj.id, level_id=level.id,
                series_id=None, default_coefficient=coef, groupe=None,
            ))

    for level_code in D.ELEMENTAIRE_FR_LEVELS:
        for subject_code, coef in D.PRIMAIRE_FR.items():
            _add_elig(subject_code, level_code, coef)
    for level_code in D.MATERNELLE_FR_LEVELS:
        for subject_code, coef in D.MATERNELLE_FR.items():
            _add_elig(subject_code, level_code, coef)
    for level_code in D.PRIMAIRE_EN_LEVELS:
        for subject_code, coef in D.PRIMAIRE_EN.items():
            _add_elig(subject_code, level_code, coef)

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
