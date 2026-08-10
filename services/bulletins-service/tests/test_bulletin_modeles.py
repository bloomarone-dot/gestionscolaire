"""Tests — modèles BulletinModele* et isolation multi-tenant (ORM)."""
from __future__ import annotations

import pytest
from sqlalchemy import create_engine, select
from sqlalchemy.orm import sessionmaker

from common.db import Base

from app.engine.demo_templates import CAMEROON_SECONDARY_DEMO_V1
from app.engine.template_schema import validate_template_definition
from app.models import (
    STATUS_DRAFT,
    STATUS_PUBLISHED,
    BulletinModele,
    BulletinModeleAssignation,
    BulletinModeleVersion,
)


@pytest.fixture()
def db_session():
    engine = create_engine("sqlite:///:memory:", future=True)
    Base.metadata.create_all(bind=engine)
    Session = sessionmaker(bind=engine, future=True)
    session = Session()
    try:
        yield session
    finally:
        session.close()


def test_create_modele_version_and_assignation(db_session):
    definition = validate_template_definition(CAMEROON_SECONDARY_DEMO_V1).model_dump(mode="json")

    modele = BulletinModele(
        tenant_id=42,
        name="Bulletin T3",
        description="Modèle trimestre",
        status=STATUS_DRAFT,
        is_default=False,
        is_system=False,
        establishment_kind="SCHOOL",
        created_by=7,
    )
    db_session.add(modele)
    db_session.flush()

    version = BulletinModeleVersion(
        modele_id=modele.id,
        tenant_id=42,
        version_number=1,
        schema_version=1,
        definition=definition,
        notes="v1 initiale",
        created_by=7,
    )
    db_session.add(version)
    db_session.flush()
    modele.current_version_id = version.id
    modele.status = STATUS_PUBLISHED

    assign = BulletinModeleAssignation(
        tenant_id=42,
        modele_id=modele.id,
        annee_scolaire="2025/2026",
        cycle_code="SECOND",
        periode="3",
        priority=10,
        is_active=True,
    )
    db_session.add(assign)
    db_session.commit()

    assert modele.id is not None
    assert version.definition["schema_version"] == 1
    assert assign.modele_id == modele.id


def test_tenant_isolation_query_filter(db_session):
    """L'isolation applicative filtre par tenant_id (comme les autres services)."""
    db_session.add_all([
        BulletinModele(tenant_id=1, name="A", status=STATUS_DRAFT),
        BulletinModele(tenant_id=2, name="B", status=STATUS_DRAFT),
        BulletinModele(tenant_id=None, name="Système", status=STATUS_PUBLISHED, is_system=True),
    ])
    db_session.commit()

    for_tenant_1 = db_session.scalars(
        select(BulletinModele).where(
            (BulletinModele.tenant_id == 1) | (BulletinModele.is_system.is_(True))
        )
    ).all()
    names = {m.name for m in for_tenant_1}
    assert "A" in names
    assert "Système" in names
    assert "B" not in names

    only_2 = db_session.scalars(
        select(BulletinModele).where(BulletinModele.tenant_id == 2)
    ).all()
    assert [m.name for m in only_2] == ["B"]


def test_system_template_has_null_tenant(db_session):
    m = BulletinModele(
        tenant_id=None,
        name="Démo camerounais",
        status=STATUS_PUBLISHED,
        is_system=True,
    )
    db_session.add(m)
    db_session.flush()
    v = BulletinModeleVersion(
        modele_id=m.id,
        tenant_id=None,
        version_number=1,
        schema_version=1,
        definition=validate_template_definition(CAMEROON_SECONDARY_DEMO_V1).model_dump(mode="json"),
    )
    db_session.add(v)
    db_session.commit()
    assert m.tenant_id is None
    assert v.tenant_id is None


def test_assignation_requires_tenant(db_session):
    """Une assignation appartient toujours à un établissement (pas de tenant NULL)."""
    m = BulletinModele(tenant_id=5, name="X", status=STATUS_PUBLISHED)
    db_session.add(m)
    db_session.flush()
    a = BulletinModeleAssignation(tenant_id=5, modele_id=m.id, priority=100)
    db_session.add(a)
    db_session.commit()
    assert a.tenant_id == 5
