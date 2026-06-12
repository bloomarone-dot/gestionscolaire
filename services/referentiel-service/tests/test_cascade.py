"""Tests de la cascade et des coefficients du référentiel (cahier §2 & §3).

Exécution (depuis services/referentiel-service, avec gs-common installé) :
    pytest
Utilise SQLite en mémoire — aucune dépendance Postgres.
"""
import pytest
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from common.db import Base
from app import crud
from app.seed import seed_all


@pytest.fixture()
def db():
    engine = create_engine("sqlite:///:memory:")
    Base.metadata.create_all(bind=engine)
    session = sessionmaker(bind=engine)()
    seed_all(session)
    yield session
    session.close()


def _coef_map(rows):
    return {s.code: coef for s, coef, *_ in rows}


def test_cascade_francophone_general(db):
    assert {s.code for s in crud.list_subsystems(db)} == {"FRANCOPHONE", "ANGLOPHONE"}
    cycles = crud.list_cycles(db, "FRANCOPHONE", "GENERAL")
    assert {c.code for c in cycles} == {"PREMIER", "SECOND"}
    levels = crud.list_levels(db, "FRANCOPHONE", "GENERAL", "SECOND")
    assert [l.code for l in levels] == ["2ND", "1ERE", "TLE"]


def test_series_skipped_for_premier_cycle(db):
    # 6ème n'a pas de série (étape sautée, §4.1)
    assert crud.list_series_for_level(db, "6E") == []
    # 2nde n'a que A4, C, D (Tableau A.2)
    assert {s.code for s in crud.list_series_for_level(db, "2ND")} == {"A4", "C", "D"}
    # 1ère / Terminale ajoutent A1, A2
    assert {s.code for s in crud.list_series_for_level(db, "TLE")} == {"A1", "A2", "A4", "C", "D"}


def test_premier_cycle_subjects_and_coeffs(db):
    rows = crud.resolve_subjects(db, "6E", None)
    coeffs = _coef_map(rows)
    assert len(rows) == 12
    assert coeffs["FR_FRANCAIS"] == 4
    assert coeffs["FR_MATHS"] == 4
    assert coeffs["FR_ANGLAIS"] == 3
    assert coeffs["FR_ECM"] == 1


def test_terminale_C_coefficients(db):
    """§3.3 : en série C, Maths 5 et PCT 5 ; Histoire et LV2 non enseignées."""
    coeffs = _coef_map(crud.resolve_subjects(db, "TLE", "C"))
    assert coeffs["FR_MATHS"] == 5
    assert coeffs["FR_PCT"] == 5
    assert coeffs["FR_FRANCAIS"] == 3
    assert "FR_HIST" not in coeffs   # « — » en série C
    assert "FR_LV2" not in coeffs


def test_terminale_D_coefficients(db):
    coeffs = _coef_map(crud.resolve_subjects(db, "TLE", "D"))
    assert coeffs["FR_MATHS"] == 5
    assert coeffs["FR_PCT"] == 4
    assert coeffs["FR_SVT"] == 4
    assert "FR_GEO" not in coeffs    # « — » en série D


def test_series_A1_A2_share_coefficients(db):
    a1 = _coef_map(crud.resolve_subjects(db, "TLE", "A1"))
    a2 = _coef_map(crud.resolve_subjects(db, "TLE", "A2"))
    assert a1 == a2
    assert a1["FR_PHILO"] == 4
    assert a1["FR_LV2"] == 4


def test_technique_commercial_and_industrial(db):
    # §3.4 série G1 (commercial)
    g1 = _coef_map(crud.resolve_subjects(db, "1ERE-T", "G1"))
    assert g1["FR_COMPTA"] == 5
    assert g1["FR_OGE"] == 4
    # §3.5 série F2 (industriel)
    f2 = _coef_map(crud.resolve_subjects(db, "1ERE-T", "F2"))
    assert f2["FR_TECHSPE"] == 6
    assert f2["FR_TPATELIER"] == 5


def test_anglophone_general(db):
    coeffs = _coef_map(crud.resolve_subjects(db, "F5", None))
    assert coeffs["EN_ENGLISH"] == 4
    assert coeffs["EN_MATHS"] == 4
    assert coeffs["EN_LIT"] == 3
    assert coeffs["EN_PE"] == 1


def test_groupe_exposed_null_until_mapping(db):
    """Le groupe de bulletin est exposé ; NULL tant que l'affectation n'est pas fournie."""
    rows = crud.resolve_subjects(db, "TLE", "C")
    assert rows and all(len(r) == 4 for r in rows)
    assert all(groupe is None for *_, groupe in rows)


def test_groupe_for_helper(monkeypatch):
    from app import seed_data
    monkeypatch.setitem(seed_data.SECOND_CYCLE_FR_GROUPS, "C", {"FR_MATHS": 1, "FR_PCT": 1})
    assert seed_data.groupe_for("C", "FR_MATHS") == 1
    assert seed_data.groupe_for("C", "FR_FRANCAIS") is None  # non affectée


def test_idempotent_seed(db):
    from app.models import Subsystem, Subject

    subjects_before = db.query(Subject).count()
    seed_all(db)  # second appel : ne doit rien dupliquer
    assert db.query(Subsystem).count() == 2
    assert db.query(Subject).count() == subjects_before
