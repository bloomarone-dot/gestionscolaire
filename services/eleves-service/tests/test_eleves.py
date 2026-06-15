"""Tests eleves-service : inscription, parent obligatoire, matricule, transfert, promotion (§6/§10)."""
import pytest
from pydantic import ValidationError
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from common.db import Base
from app import crud
from app.models import STATUT_DIPLOME, STATUT_INSCRIT
from app.schemas import (
    EleveCreate,
    ParentIn,
    PromotionApply,
    PromotionItem,
)

TENANT = 1


@pytest.fixture()
def db():
    engine = create_engine("sqlite:///:memory:")
    Base.metadata.create_all(bind=engine)
    session = sessionmaker(bind=engine)()
    yield session
    session.close()


def _make(db, classe_id=10, tenant=TENANT, **kw):
    payload = EleveCreate(
        nom="Eboa", prenom="Marie", level_code="TLE", series_code="C",
        classe_id=classe_id,
        parents=[ParentIn(nom="Eboa Père", phone="690000000")],
        **kw,
    )
    return crud.create_eleve(db, tenant, payload)


def test_matricule_auto_generated(db):
    e = _make(db)
    assert e.matricule  # généré
    assert e.statut == STATUT_INSCRIT
    assert crud.primary_parent_phone(e) == "690000000"


def test_matricule_modifiable(db):
    e = _make(db, matricule="CUSTOM-001")
    assert e.matricule == "CUSTOM-001"


def test_parent_phone_required():
    with pytest.raises(ValidationError):
        ParentIn(nom="X", phone="")


def test_parent_email_optional(db):
    e = _make(db)
    assert e.parents[0].email is None


def test_list_filter_by_classe(db):
    _make(db, classe_id=10)
    _make(db, classe_id=20)
    assert len(crud.list_eleves(db, TENANT, classe_id=10)) == 1
    assert len(crud.list_eleves(db, TENANT)) == 2


def test_transfer_keeps_enrolled(db):
    e = _make(db, classe_id=10)
    moved, old = crud.transfer(db, TENANT, e.id, new_classe_id=20)
    assert old == 10
    assert moved.classe_id == 20
    assert moved.statut == STATUT_INSCRIT


def test_promotion_admis_and_sortant(db):
    a = _make(db, classe_id=10)
    b = _make(db, classe_id=10)
    results = crud.apply_promotion(db, TENANT, PromotionApply(
        source_classe_id=10,
        items=[
            PromotionItem(eleve_id=a.id, status="ADMIS", dest_classe_id=30),
            PromotionItem(eleve_id=b.id, status="SORTANT"),
        ],
    ))
    assert len(results) == 2
    assert crud.get_eleve(db, TENANT, a.id).classe_id == 30
    sortant = crud.get_eleve(db, TENANT, b.id)
    assert sortant.statut == STATUT_DIPLOME
    assert sortant.classe_id is None


def test_promotion_reoriente_changes_series(db):
    e = _make(db, classe_id=10)
    crud.apply_promotion(db, TENANT, PromotionApply(
        source_classe_id=10,
        items=[PromotionItem(eleve_id=e.id, status="REORIENTE", dest_classe_id=40, new_series_code="D")],
    ))
    moved = crud.get_eleve(db, TENANT, e.id)
    assert moved.classe_id == 40
    assert moved.series_code == "D"


def test_promotion_admis_requires_dest(db):
    e = _make(db, classe_id=10)
    with pytest.raises(ValueError):
        crud.apply_promotion(db, TENANT, PromotionApply(
            source_classe_id=10,
            items=[PromotionItem(eleve_id=e.id, status="ADMIS")],
        ))


def test_tenant_isolation(db):
    e = _make(db, tenant=TENANT)
    assert crud.list_eleves(db, 999) == []
    with pytest.raises(crud.NotFound):
        crud.get_eleve(db, 999, e.id)
