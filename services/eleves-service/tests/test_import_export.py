"""Tests import/export élèves."""
import pytest
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from common.db import Base
from app import crud, import_export
from app.schemas import ParentIn, EleveCreate

TENANT = 1


@pytest.fixture()
def db():
    engine = create_engine("sqlite:///:memory:")
    Base.metadata.create_all(bind=engine)
    session = sessionmaker(bind=engine)()
    yield session
    session.close()


def test_import_csv_creates_and_updates(db):
    rows = [
        ["Nom", "Prenom", "Classe", "Parent nom", "Parent telephone"],
        ["Mbarga", "Paul", "10", "Mbarga Sr", "690000001"],
        ["Ngo", "Anne", "10", "Ngo Sr", "690000002"],
    ]
    lookup = {"10": 10}
    r1 = import_export.import_rows(db, TENANT, rows, force_classe_id=10, classe_lookup=lookup)
    assert r1["imported"] == 2
    assert len(crud.list_eleves(db, TENANT)) == 2
    assert all(e.classe_id == 10 for e in crud.list_eleves(db, TENANT))

    rows2 = [
        ["Matricule", "Nom", "Prenom", "Classe"],
        [crud.list_eleves(db, TENANT)[0].matricule, "Mbarga", "Paul Updated", "99"],
    ]
    r2 = import_export.import_rows(db, TENANT, rows2, force_classe_id=10, classe_lookup=lookup)
    assert r2["updated"] == 1
    assert crud.list_eleves(db, TENANT)[0].prenom == "Paul Updated"
    assert len(r2["errors"]) >= 1  # classe « 99 » ignorée


def test_import_per_class_template_without_classe_column():
    content = import_export.build_template_xlsx(classe_nom="Form 4", section="Anglophone")
    rows = import_export.read_tabular_rows(content, "t.xlsx")
    header = import_export._parse_header_row(rows[0])
    assert "nom" in header
    assert "classe" not in header


def test_export_rows(db):
    crud.create_eleve(db, TENANT, EleveCreate(
        nom="Test", prenom="Eleve", classe_id=5,
        parents=[ParentIn(nom="Parent", phone="699000000")],
    ))
    eleves = crud.list_eleves(db, TENANT)
    out = import_export.export_rows(eleves, {5: "Tle D1"})
    assert out[0]["nom"] == "Test"
    assert out[0]["classe"] == "Tle D1"
