"""Tests tenant-service : création d'école, filtre amont (§14), canaux (§12.2)."""
import pytest
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from common.db import Base
from app import crud
from app.schemas import SchoolCreate


@pytest.fixture()
def db():
    engine = create_engine("sqlite:///:memory:")
    Base.metadata.create_all(bind=engine)
    session = sessionmaker(bind=engine)()
    yield session
    session.close()


def test_create_school_default_profile(db):
    school = crud.create_school(db, SchoolCreate(name="Lycée MINESEC", city="Yaoundé"))
    profile = crud.to_profile(school)
    assert profile.establishment_kind == "SCHOOL"
    assert set(profile.subsystems) == {"FRANCOPHONE", "ANGLOPHONE"}
    assert set(profile.teaching_types) == {"GENERAL", "TECHNIQUE"}
    assert profile.channels == ["INTERNAL"]


def test_create_language_center_default_profile(db):
    school = crud.create_school(db, SchoolCreate(
        name="Institut Goethe", city="Douala",
        establishment_kind="LANGUAGE_CENTER",
    ))
    profile = crud.to_profile(school)
    assert profile.establishment_kind == "LANGUAGE_CENTER"
    assert profile.subsystems == ["FRANCOPHONE"]
    assert profile.teaching_types == ["LANGUE"]
    assert profile.channels == ["INTERNAL"]


def test_create_school_with_profile(db):
    school = crud.create_school(db, SchoolCreate(
        name="Collège Bilingue Test", city="Douala",
        subsystems=["FRANCOPHONE"], teaching_types=["GENERAL"],
        channels=["SMS", "INTERNAL"],
    ))
    profile = crud.to_profile(school)
    assert profile.id == school.id
    assert profile.subsystems == ["FRANCOPHONE"]
    assert profile.teaching_types == ["GENERAL"]
    assert set(profile.channels) == {"SMS", "INTERNAL"}


def test_update_profile_replaces_sets(db):
    school = crud.create_school(db, SchoolCreate(
        name="Lycée Test", subsystems=["FRANCOPHONE"], teaching_types=["GENERAL"],
    ))
    crud.set_profile(
        db, school,
        subsystems=["FRANCOPHONE", "ANGLOPHONE"],
        teaching_types=["GENERAL", "TECHNIQUE"],
        channels=["WHATSAPP"],
    )
    profile = crud.to_profile(school)
    assert set(profile.subsystems) == {"FRANCOPHONE", "ANGLOPHONE"}
    assert set(profile.teaching_types) == {"GENERAL", "TECHNIQUE"}
    assert profile.channels == ["WHATSAPP"]


def test_profile_dedups(db):
    school = crud.create_school(db, SchoolCreate(
        name="X", subsystems=["FRANCOPHONE", "FRANCOPHONE"],
    ))
    assert crud.to_profile(school).subsystems == ["FRANCOPHONE"]


def test_appreciation_scales_roundtrip(db):
    from common.appreciation_scales import dump_scales

    school = crud.create_school(db, SchoolCreate(name="Ecole Barème"))
    school.bulletin_appreciation_scales = dump_scales({
        "fr": [{"min": 18, "label": "EXCELLENT"}, {"min": 0, "label": "INSUFFISANT"}],
    })
    db.commit()
    db.refresh(school)
    profile = crud.to_profile(school)
    assert profile.bulletin_appreciation_scales["fr"][0]["label"] == "EXCELLENT"
    assert profile.bulletin_appreciation_scales["fr"][0]["min"] == 18.0
