"""Tests création compte secrétaire par l'admin établissement."""
import pytest
from sqlalchemy import create_engine, select
from sqlalchemy.orm import sessionmaker

from common.db import Base
from common.jwt import TokenPayload, create_access_token
from common.tenant import TenantContext

from app.main import create_account, list_establishment_accounts
from app.models import Account, Role
from app.schemas import AccountCreate


@pytest.fixture()
def db():
    engine = create_engine("sqlite:///:memory:")
    Base.metadata.create_all(bind=engine)
    session = sessionmaker(bind=engine)()
    session.add(Account(
        id=1, phone="690000001", hashed_password="x", role=Role.ADMIN, tenant_id=10,
        first_name="Dir", last_name="Ecole", is_active=True,
    ))
    session.commit()
    yield session
    session.close()


def _admin_ctx():
    return TenantContext(user_id=1, role=Role.ADMIN, tenant_id=10)


def test_admin_creates_secretaire(db, monkeypatch):
    def _session():
        return db

    monkeypatch.setattr("app.main._get_session", _session)
    created = create_account(
        AccountCreate(phone="690000002", password="Secret1!", role=Role.SECRETAIRE, first_name="Marie", last_name="Sec"),
        ctx=_admin_ctx(),
    )
    assert created.role == Role.SECRETAIRE
    assert created.tenant_id == 10


def test_admin_cannot_create_admin(db, monkeypatch):
    from fastapi import HTTPException

    monkeypatch.setattr("app.main._get_session", lambda: db)
    with pytest.raises(HTTPException) as exc:
        create_account(
            AccountCreate(phone="690000003", password="Secret1!", role=Role.ADMIN),
            ctx=_admin_ctx(),
        )
    assert exc.value.status_code == 403


def test_list_establishment_accounts(db, monkeypatch):
    db.add(Account(
        phone="690000004", hashed_password="x", role=Role.SECRETAIRE, tenant_id=10,
        first_name="A", last_name="B", is_active=True,
    ))
    db.commit()
    monkeypatch.setattr("app.main._get_session", lambda: db)
    rows = list_establishment_accounts(ctx=_admin_ctx())
    assert len(rows) >= 2
    assert any(r.role == Role.SECRETAIRE for r in rows)
