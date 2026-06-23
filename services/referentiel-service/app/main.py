"""referentiel-service — référentiel national MINESEC (cahier §2 & §3).

Lecture : ouverte à tout utilisateur authentifié (alimente la cascade et
l'héritage des matières). Écriture : réservée à l'admin plateforme (superadmin).
Tables communes à toutes les écoles — aucun tenant_id, aucune RLS.
"""
from typing import Optional

from fastapi import Depends, FastAPI, HTTPException, status
from sqlalchemy.orm import Session, sessionmaker

from common.db import Base, add_missing_columns, get_engine, init_engine
from common.tenant import TenantContext, get_context, require_roles

from app import crud
from app.config import settings
from app.models import Level, SeriesSpecialty, Subject, SubjectEligibility
from app.schemas import (
    CycleOut,
    EligibilityCreate,
    EligibilityOut,
    LevelOut,
    ResolvedSubjectOut,
    SeriesOut,
    SubjectCreate,
    SubjectOut,
    SubjectUpdate,
    SubsystemOut,
    TeachingTypeOut,
)
from app.seed import seed_all, seed_language_referential

app = FastAPI(title="referentiel-service — SaaS Scolaire", version="0.1.0")

_SessionLocal: Optional[sessionmaker] = None


@app.on_event("startup")
def _startup() -> None:
    global _SessionLocal
    init_engine(settings.database_url)
    Base.metadata.create_all(bind=get_engine())  # Alembic en Phase 5
    add_missing_columns("subject_eligibility", {"groupe": "INTEGER"})
    _SessionLocal = sessionmaker(bind=get_engine(), future=True)
    db = _SessionLocal()
    try:
        seed_all(db)  # idempotent
        seed_language_referential(db)  # LANGUE / CECRL sur bases existantes
    finally:
        db.close()


def get_db() -> Session:
    db = _SessionLocal()
    try:
        yield db
    finally:
        db.close()


@app.get("/health", tags=["infra"])
def health() -> dict:
    return {"status": "ok", "service": "referentiel-service"}


# ════════════════════════════ LECTURE (cascade) ════════════════════════════
@app.get("/referentiel/subsystems", response_model=list[SubsystemOut], tags=["cascade"])
def subsystems(db: Session = Depends(get_db), _: TenantContext = Depends(get_context)):
    return crud.list_subsystems(db)


@app.get("/referentiel/teaching-types", response_model=list[TeachingTypeOut], tags=["cascade"])
def teaching_types(
    subsystem: Optional[str] = None,
    db: Session = Depends(get_db),
    _: TenantContext = Depends(get_context),
):
    return crud.list_teaching_types(db, subsystem)


@app.get("/referentiel/cycles", response_model=list[CycleOut], tags=["cascade"])
def cycles(
    subsystem: str,
    type: str,
    db: Session = Depends(get_db),
    _: TenantContext = Depends(get_context),
):
    return crud.list_cycles(db, subsystem, type)


@app.get("/referentiel/levels", response_model=list[LevelOut], tags=["cascade"])
def levels(
    subsystem: str,
    type: str,
    cycle: str,
    db: Session = Depends(get_db),
    _: TenantContext = Depends(get_context),
):
    return crud.list_levels(db, subsystem, type, cycle)


@app.get("/referentiel/levels/{level_code}/series", response_model=list[SeriesOut], tags=["cascade"])
def series_for_level(
    level_code: str,
    db: Session = Depends(get_db),
    _: TenantContext = Depends(get_context),
):
    return crud.list_series_for_level(db, level_code)


@app.get("/referentiel/subjects", response_model=list[ResolvedSubjectOut], tags=["cascade"])
def resolve_subjects(
    level: str,
    series: Optional[str] = None,
    db: Session = Depends(get_db),
    _: TenantContext = Depends(get_context),
):
    """Matières + coefficients officiels pour un profil — héritage automatique (§4.2)."""
    rows = crud.resolve_subjects(db, level, series)
    return [
        ResolvedSubjectOut(
            subject_id=subj.id, code=subj.code, name=subj.name,
            default_coefficient=coef, is_obligatoire=oblig, groupe=groupe,
        )
        for subj, coef, oblig, groupe in rows
    ]


@app.get("/referentiel/tree", tags=["cascade"])
def tree(db: Session = Depends(get_db), _: TenantContext = Depends(get_context)):
    """Arborescence complète pour la vue lecture seule « Référentiel MINESEC » (§8)."""
    result = []
    for sub in crud.list_subsystems(db):
        sub_node = {"code": sub.code, "name": sub.name, "types": []}
        for typ in crud.list_teaching_types(db, sub.code):
            type_node = {"code": typ.code, "name_fr": typ.name_fr, "cycles": []}
            for cyc in crud.list_cycles(db, sub.code, typ.code):
                cyc_node = {"code": cyc.code, "name_fr": cyc.name_fr, "levels": []}
                for lvl in crud.list_levels(db, sub.code, typ.code, cyc.code):
                    cyc_node["levels"].append({
                        "code": lvl.code, "name": lvl.name, "exam": lvl.exam,
                        "series": [
                            {"code": s.code, "name_fr": s.name_fr}
                            for s in crud.list_series_for_level(db, lvl.code)
                        ],
                    })
                type_node["cycles"].append(cyc_node)
            sub_node["types"].append(type_node)
        result.append(sub_node)
    return result


# ═══════════════════════ ÉCRITURE (admin plateforme) ═══════════════════════
@app.post("/referentiel/subjects", status_code=status.HTTP_201_CREATED, tags=["admin"])
def create_subject(
    payload: SubjectCreate,
    db: Session = Depends(get_db),
    _: TenantContext = Depends(require_roles("superadmin")),
):
    if db.query(Subject).filter(Subject.code == payload.code).first():
        raise HTTPException(status.HTTP_409_CONFLICT, "Code de matière déjà utilisé")
    subject = Subject(code=payload.code, name=payload.name)
    db.add(subject)
    db.commit()
    db.refresh(subject)
    return {"id": subject.id, "code": subject.code, "name": subject.name}


@app.post("/referentiel/eligibility", status_code=status.HTTP_201_CREATED, tags=["admin"])
def create_eligibility(
    payload: EligibilityCreate,
    db: Session = Depends(get_db),
    _: TenantContext = Depends(require_roles("superadmin")),
):
    subject = db.query(Subject).filter(Subject.code == payload.subject_code).first()
    level = db.query(Level).filter(Level.code == payload.level_code).first()
    if not subject or not level:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Matière ou niveau introuvable")
    series_id = None
    if payload.series_code:
        series = db.query(SeriesSpecialty).filter(
            SeriesSpecialty.code == payload.series_code
        ).first()
        if not series:
            raise HTTPException(status.HTTP_404_NOT_FOUND, "Série introuvable")
        series_id = series.id
    elig = SubjectEligibility(
        subject_id=subject.id, level_id=level.id, series_id=series_id,
        default_coefficient=payload.default_coefficient,
        is_obligatoire=payload.is_obligatoire, groupe=payload.groupe,
    )
    db.add(elig)
    db.commit()
    return {"id": elig.id}


# ── Gestion (liste/édition/suppression) — admin plateforme ───────────────────
@app.get("/referentiel/admin/subjects", response_model=list[SubjectOut], tags=["admin"])
def admin_list_subjects(
    db: Session = Depends(get_db),
    _: TenantContext = Depends(require_roles("superadmin")),
):
    return db.query(Subject).order_by(Subject.name).all()


@app.put("/referentiel/subjects/{subject_id}", response_model=SubjectOut, tags=["admin"])
def update_subject(
    subject_id: int,
    payload: SubjectUpdate,
    db: Session = Depends(get_db),
    _: TenantContext = Depends(require_roles("superadmin")),
):
    subject = db.query(Subject).filter(Subject.id == subject_id).first()
    if not subject:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Matière introuvable")
    subject.name = payload.name
    db.commit()
    db.refresh(subject)
    return subject


@app.delete("/referentiel/subjects/{subject_id}", status_code=status.HTTP_204_NO_CONTENT, tags=["admin"])
def delete_subject(
    subject_id: int,
    db: Session = Depends(get_db),
    _: TenantContext = Depends(require_roles("superadmin")),
):
    subject = db.query(Subject).filter(Subject.id == subject_id).first()
    if not subject:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Matière introuvable")
    # Supprime aussi ses éligibilités (les classes existantes gardent leur copie).
    db.query(SubjectEligibility).filter(SubjectEligibility.subject_id == subject_id).delete()
    db.delete(subject)
    db.commit()


@app.get("/referentiel/admin/eligibility", response_model=list[EligibilityOut], tags=["admin"])
def admin_list_eligibility(
    subject: Optional[str] = None,
    db: Session = Depends(get_db),
    _: TenantContext = Depends(require_roles("superadmin")),
):
    q = (
        db.query(SubjectEligibility, Subject, Level, SeriesSpecialty)
        .join(Subject, SubjectEligibility.subject_id == Subject.id)
        .join(Level, SubjectEligibility.level_id == Level.id)
        .outerjoin(SeriesSpecialty, SubjectEligibility.series_id == SeriesSpecialty.id)
    )
    if subject:
        q = q.filter(Subject.code == subject)
    out = []
    for elig, subj, level, series in q.all():
        out.append(EligibilityOut(
            id=elig.id, subject_code=subj.code, subject_name=subj.name,
            level_code=level.code, series_code=series.code if series else None,
            default_coefficient=elig.default_coefficient,
            is_obligatoire=elig.is_obligatoire, groupe=elig.groupe,
        ))
    return out


@app.delete("/referentiel/eligibility/{elig_id}", status_code=status.HTTP_204_NO_CONTENT, tags=["admin"])
def delete_eligibility(
    elig_id: int,
    db: Session = Depends(get_db),
    _: TenantContext = Depends(require_roles("superadmin")),
):
    elig = db.query(SubjectEligibility).filter(SubjectEligibility.id == elig_id).first()
    if not elig:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Éligibilité introuvable")
    db.delete(elig)
    db.commit()
