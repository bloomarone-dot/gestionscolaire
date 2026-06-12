"""Tests du seed superadmin : création, idempotence, conflit de téléphone."""
import pytest
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from common.db import Base
from common.security import verify_password
from app.models import Account, Role
from app.seed import create_superadmin


@pytest.fixture()
def db():
    engine = create_engine("sqlite:///:memory:")
    Base.metadata.create_all(bind=engine)
    session = sessionmaker(bind=engine)()
    yield session
    session.close()


def test_creates_superadmin(db):
    acc = create_superadmin(db, phone="690000000", password="Secret1!", first_name="Super", last_name="Admin")
    assert acc.role == Role.SUPERADMIN
    assert acc.tenant_id is None
    assert acc.is_active
    assert verify_password("Secret1!", acc.hashed_password)


def test_idempotent_returns_existing(db):
    first = create_superadmin(db, phone="690000000", password="Secret1!")
    again = create_superadmin(db, phone="690000999", password="Other2!")  # ignoré
    assert again.id == first.id
    assert db.query(Account).filter(Account.role == Role.SUPERADMIN).count() == 1


def test_phone_clash_raises(db):
    db.add(Account(phone="690000000", hashed_password="x", role=Role.ENSEIGNANT, tenant_id=1))
    db.commit()
    with pytest.raises(RuntimeError):
        create_superadmin(db, phone="690000000", password="Secret1!")
