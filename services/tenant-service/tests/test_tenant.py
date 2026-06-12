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
