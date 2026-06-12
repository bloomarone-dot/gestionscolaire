"""Tests personnel-service : règles téléphone/email (§7.1, §7.2) et isolation tenant."""
import pytest
from pydantic import ValidationError
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from common.db import Base
from app import crud
from app.schemas import (
    DirectionCreate,
    EnseignantCreate,
    TeachableSubjectIn,
)

TENANT = 1


@pytest.fixture()
def db():
    engine = create_engine("sqlite:///:memory:")
    Base.metadata.create_all(bind=engine)
    session = sessionmaker(bind=engine)()
    yield session
    session.close()


# ── Validation des règles métier (§7) ────────────────────────────────────────
def test_enseignant_email_optional(db):
    payload = EnseignantCreate(nom="Mballa", prenom="Jean", sexe="M", phone="690000001")
    p = crud.create_enseignant(db, TENANT, payload, account_id=10)
    assert p.email is None
    assert p.account_id == 10


def test_enseignant_phone_required():
    with pytest.raises(ValidationError):
        EnseignantCreate(nom="Mballa", sexe="M", phone="")


def test_enseignant_sexe_required():
    with pytest.raises(ValidationError):
        EnseignantCreate(nom="Mballa", sexe="", phone="690000001")


def test_direction_requires_two_phones():
    with pytest.raises(ValidationError):
        DirectionCreate(nom="Nkomo", phone="690000001", phone2="", fonction="Principal")


def test_direction_email_optional(db):
    payload = DirectionCreate(
        nom="Nkomo", prenom="Paul", phone="690000001", phone2="690000002",
        fonction="Principal",
    )
    p = crud.create_direction(db, TENANT, payload, account_id=20)
    assert p.email is None
    assert p.phone2 == "690000002"
    assert p.fonction == "Principal"


def test_teachable_subjects(db):
    payload = EnseignantCreate(
        nom="Atangana", sexe="F", phone="690000003",
        teachable_subjects=[
            TeachableSubjectIn(label="Mathématiques", subject_code="FR_MATHS"),
            TeachableSubjectIn(label="Mandarin", special_subject_id=5),
        ],
    )
    p = crud.create_enseignant(db, TENANT, payload, account_id=30)
    assert set(crud.subject_labels(p)) == {"Mathématiques", "Mandarin"}


def test_tenant_isolation(db):
    crud.create_enseignant(
        db, TENANT, EnseignantCreate(nom="X", sexe="M", phone="690000009"), account_id=1
    )
    assert crud.list_personnel(db, 999) == []
