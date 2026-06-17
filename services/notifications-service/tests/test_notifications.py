"""Tests notifications-service : mapping §12.1, email jamais bloquant, canaux §12.2, historique."""
import pytest
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from common.db import Base
from app import delivery
from app.mapping import build_notifications

TENANT = 1


@pytest.fixture()
def db():
    engine = create_engine("sqlite:///:memory:")
    Base.metadata.create_all(bind=engine)
    session = sessionmaker(bind=engine)()
    yield session
    session.close()


def _channels(items):
    return {i["channel"] for i in items}


def test_student_enrolled_sms_and_internal():
    items = build_notifications("StudentEnrolled", {
        "tenant_id": TENANT, "parent_phone": "690", "nom": "Ngo", "prenom": "Ana", "classe_id": 7,
    })
    assert _channels(items) == {"SMS", "INTERNAL"}
    assert "Ngo Ana" in items[0]["content"]


def test_bulletin_email_only_if_present():
    without = build_notifications("BulletinPublished", {
        "tenant_id": TENANT, "parent_phone": "690", "nom": "A", "classe": "Tle C", "trimestre": 1,
    })
    assert _channels(without) == {"SMS", "WHATSAPP"}      # pas d'EMAIL sans adresse
    with_email = build_notifications("BulletinPublished", {
        "tenant_id": TENANT, "parent_phone": "690", "parent_email": "p@x.cm",
        "nom": "A", "classe": "Tle C", "trimestre": 1,
    })
    assert "EMAIL" in _channels(with_email)               # mais jamais bloquant


def test_enabled_channels_filter_keeps_internal():
    # École SMS uniquement : WhatsApp filtré, INTERNAL toujours conservé.
    items = build_notifications(
        "StudentTransferred",
        {"tenant_id": TENANT, "parent_phone": "690", "nom": "A", "new_classe_id": 9},
        enabled_channels={"SMS"},
    )
    assert _channels(items) == {"SMS", "INTERNAL"}


def test_class_subjects_updated_internal_only():
    items = build_notifications("ClassSubjectsUpdated", {"tenant_id": TENANT, "classe_id": 3})
    assert _channels(items) == {"INTERNAL"}
    assert "teachers:classe:3" == items[0]["recipient"]


def test_unknown_event_no_notifications():
    assert build_notifications("GradesEntered", {"tenant_id": TENANT}) == []


def test_handle_event_persists_history(db):
    saved = delivery.handle_event(db, "StudentEnrolled", {
        "tenant_id": TENANT, "parent_phone": "690", "nom": "Ngo", "classe_id": 7,
    })
    assert len(saved) == 2
    from app.models import Notification, STATUS_SENT
    rows = db.query(Notification).filter(Notification.tenant_id == TENANT).all()
    assert len(rows) == 2
    assert all(r.status == STATUS_SENT for r in rows)


def test_handle_event_without_tenant_ignored(db):
    assert delivery.handle_event(db, "StudentEnrolled", {"parent_phone": "690"}) == []
