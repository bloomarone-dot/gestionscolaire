"""Tests pedagogie-service : cascade, héritage matières (§4.2), décochage (§5.2), spéciales (§5.3)."""
import pytest
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from common.db import Base
from app import crud
from app.schemas import AnneeScolaireCreate, ClasseCreate, MatiereUpdate, PassageAnneeIn, SpecialMatiereCreate

TENANT = 1
OTHER_TENANT = 2

# Matières officielles simulées (telles que renvoyées par le référentiel pour Tle C).
TLE_C_SUBJECTS = [
    {"code": "FR_MATHS", "name": "Mathématiques", "default_coefficient": 5, "is_obligatoire": True},
    {"code": "FR_PCT", "name": "Physique-Chimie-Technologie (PCT)", "default_coefficient": 5, "is_obligatoire": False},
    {"code": "FR_FRANCAIS", "name": "Français", "default_coefficient": 3, "is_obligatoire": False},
]


@pytest.fixture()
def db():
    engine = create_engine("sqlite:///:memory:")
    Base.metadata.create_all(bind=engine)
    session = sessionmaker(bind=engine)()
    yield session
    session.close()


def _make_tle_c(db, tenant=TENANT):
    payload = ClasseCreate(
        nom_personnalise="Tle D1", subsystem_code="FRANCOPHONE", type_code="GENERAL",
        cycle_code="SECOND", level_code="TLE", series_code="C",
    )
    return crud.create_class(db, tenant, payload, TLE_C_SUBJECTS)


def test_standard_class_inherits_subjects(db):
    classe = _make_tle_c(db)
    matieres = crud.list_matieres(db, TENANT, classe.id)
    assert len(matieres) == 3
    assert all(m.activated for m in matieres)             # cochées par défaut (§4.2)
    coeffs = {m.subject_code: m.coefficient for m in matieres}
    assert coeffs["FR_MATHS"] == 5


def test_special_class_has_no_subjects(db):
    payload = ClasseCreate(
        nom_personnalise="Classe de mise à niveau", is_special=True,
        niveau_libre="Mise à niveau", specialite_libre="Bilingue",
    )
    classe = crud.create_class(db, TENANT, payload, None)
    assert classe.is_special
    assert crud.list_matieres(db, TENANT, classe.id) == []


def test_deactivate_obligatoire_requires_confirm(db):
    classe = _make_tle_c(db)
    maths = next(m for m in crud.list_matieres(db, TENANT, classe.id) if m.subject_code == "FR_MATHS")
    with pytest.raises(crud.ConfirmationRequired):
        crud.update_matiere(db, TENANT, classe.id, maths.id, MatiereUpdate(activated=False))
    # avec confirmation, le décochage passe
    updated = crud.update_matiere(
        db, TENANT, classe.id, maths.id, MatiereUpdate(activated=False, confirm=True)
    )
    assert updated.activated is False


def test_deactivate_non_obligatoire_no_confirm(db):
    classe = _make_tle_c(db)
    pct = next(m for m in crud.list_matieres(db, TENANT, classe.id) if m.subject_code == "FR_PCT")
    updated = crud.update_matiere(db, TENANT, classe.id, pct.id, MatiereUpdate(activated=False))
    assert updated.activated is False


def test_add_special_matiere(db):
    classe = _make_tle_c(db)
    m = crud.add_special_matiere(
        db, TENANT, classe.id, SpecialMatiereCreate(nom="Mandarin", coefficient=2)
    )
    assert m.source == "SPECIALE"
    assert m.nom == "Mandarin"
    matieres = crud.list_matieres(db, TENANT, classe.id)
    assert any(x.source == "SPECIALE" for x in matieres)


def test_add_special_matiere_with_teacher(db):
    classe = _make_tle_c(db)
    m = crud.add_special_matiere(
        db, TENANT, classe.id, SpecialMatiereCreate(nom="Robotique", coefficient=2, enseignant_id=42)
    )
    assert m.enseignant_id == 42


def test_school_year_activation_and_rollover(db):
    y1 = crud.create_annee(db, TENANT, AnneeScolaireCreate(annee="2025-2026", is_active=True))
    y2 = crud.create_annee(db, TENANT, AnneeScolaireCreate(annee="2026-2027"))

    active = crud.activate_annee(db, TENANT, y2.id)
    db.refresh(y1)
    assert active.annee == "2026-2027"
    assert y1.is_archived is True
    assert y1.is_active is False

    next_year = crud.passage_annee(db, TENANT, PassageAnneeIn())
    db.refresh(y2)
    assert next_year.annee == "2027-2028"
    assert next_year.is_active is True
    assert y2.is_archived is True


def test_class_uses_active_school_year(db):
    year = crud.create_annee(db, TENANT, AnneeScolaireCreate(annee="2025-2026", is_active=True))
    classe = _make_tle_c(db)
    assert classe.annee_scolaire_id == year.id


def test_tenant_isolation(db):
    classe = _make_tle_c(db, tenant=TENANT)
    # Une autre école ne voit pas la classe.
    assert crud.list_classes(db, OTHER_TENANT) == []
    with pytest.raises(crud.NotFound):
        crud.get_class(db, OTHER_TENANT, classe.id)


def test_list_classes_counts_activated(db):
    classe = _make_tle_c(db)
    rows = crud.list_classes(db, TENANT)
    assert len(rows) == 1
    _, nb = rows[0]
    assert nb == 3
