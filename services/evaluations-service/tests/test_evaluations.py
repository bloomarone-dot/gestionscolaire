"""Tests evaluations-service : upsert, bulk, bornes 0-20, fenêtre de saisie, isolation."""
from datetime import date, timedelta

import pytest
from pydantic import ValidationError
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from common.db import Base
from app import crud
from app.schemas import NoteBulkIn, NoteBulkItem, NoteIn, PeriodeIn

TENANT = 1


@pytest.fixture()
def db():
    engine = create_engine("sqlite:///:memory:")
    Base.metadata.create_all(bind=engine)
    session = sessionmaker(bind=engine)()
    yield session
    session.close()


def test_upsert_creates_then_updates(db):
    p = NoteIn(eleve_id=1, classe_id=10, matiere_id=100, valeur=12, trimestre=1, type_evaluation="sequence_1")
    n1 = crud.upsert_note(db, TENANT, p)
    assert n1.valeur == 12
    p.valeur = 15
    n2 = crud.upsert_note(db, TENANT, p)
    assert n2.id == n1.id  # même note (unicité)
    assert n2.valeur == 15
    assert len(crud.list_notes(db, TENANT, classe_id=10)) == 1


def test_note_out_of_range_rejected():
    with pytest.raises(ValidationError):
        NoteIn(eleve_id=1, classe_id=10, matiere_id=100, valeur=21)


def test_bulk_upsert(db):
    payload = NoteBulkIn(classe_id=10, matiere_id=100, trimestre=1, type_evaluation="sequence_1",
                         notes=[NoteBulkItem(eleve_id=1, valeur=10), NoteBulkItem(eleve_id=2, valeur=14)])
    saved = crud.bulk_upsert(db, TENANT, payload)
    assert len(saved) == 2
    assert len(crud.list_notes(db, TENANT, matiere_id=100)) == 2


def test_entry_window_open_when_no_periode(db):
    assert crud.is_entry_open(db, TENANT, classe_id=10, matiere_id=100) is True


def test_entry_window_closed_outside(db):
    yesterday = date.today() - timedelta(days=10)
    crud.create_periode(db, TENANT, PeriodeIn(
        classe_id=10, matiere_id=100,
        date_debut=yesterday, date_fin=yesterday + timedelta(days=2),
    ))
    assert crud.is_entry_open(db, TENANT, 10, 100) is False
    with pytest.raises(crud.EntryClosed):
        crud.upsert_note(db, TENANT, NoteIn(eleve_id=1, classe_id=10, matiere_id=100, valeur=12))


def test_entry_window_open_within(db):
    today = date.today()
    crud.create_periode(db, TENANT, PeriodeIn(
        classe_id=10, matiere_id=100,
        date_debut=today - timedelta(days=1), date_fin=today + timedelta(days=1),
    ))
    assert crud.is_entry_open(db, TENANT, 10, 100) is True
    n = crud.upsert_note(db, TENANT, NoteIn(eleve_id=1, classe_id=10, matiere_id=100, valeur=12))
    assert n.valeur == 12


def test_entry_window_closed_for_other_matiere(db):
    today = date.today()
    crud.create_periode(db, TENANT, PeriodeIn(
        classe_id=10, matiere_id=100,
        date_debut=today - timedelta(days=1), date_fin=today + timedelta(days=1),
    ))
    assert crud.is_entry_open(db, TENANT, 10, 999) is False


def test_tenant_isolation(db):
    crud.upsert_note(db, TENANT, NoteIn(eleve_id=1, classe_id=10, matiere_id=100, valeur=12))
    assert crud.list_notes(db, 999) == []
