"""Tests tresorerie-service — création, encaissement, stats."""
from datetime import date
from decimal import Decimal

import pytest
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from common.db import Base
from app import crud
from app.models import STATUS_EN_ATTENTE, STATUS_PAYE
from app.schemas import PaiementCreate, PaiementEncaisser

TENANT = 7


@pytest.fixture()
def db():
    engine = create_engine("sqlite:///:memory:")
    Base.metadata.create_all(bind=engine)
    session = sessionmaker(bind=engine)()
    yield session
    session.close()


def test_create_and_encaisser(db):
    row = crud.create_paiement(
        db,
        TENANT,
        PaiementCreate(
            eleve_id=12,
            eleve_nom="Dupont",
            eleve_prenom="Alice",
            matricule="LC-A1-001",
            label="Frais d'inscription",
            amount=Decimal("75000"),
            due_date=date(2026, 6, 30),
        ),
        recorded_by=3,
    )
    assert row.status == STATUS_EN_ATTENTE
    assert row.amount == Decimal("75000")

    paid = crud.encaisser_paiement(
        db,
        TENANT,
        row.id,
        PaiementEncaisser(payment_method="ESPECES"),
        recorded_by=3,
    )
    assert paid.status == STATUS_PAYE
    assert paid.receipt_number.startswith(f"REC-{TENANT}-")
    assert paid.payment_method == "ESPECES"


def test_stats_pending_and_month(db):
    crud.create_paiement(
        db,
        TENANT,
        PaiementCreate(eleve_id=1, label="Session A1", amount=Decimal("50000")),
        recorded_by=1,
    )
    row2 = crud.create_paiement(
        db,
        TENANT,
        PaiementCreate(eleve_id=2, label="Manuel", amount=Decimal("15000")),
        recorded_by=1,
    )
    crud.encaisser_paiement(db, TENANT, row2.id, PaiementEncaisser(payment_method="MOBILE_MONEY"), recorded_by=1)

    s = crud.stats(db, TENANT)
    assert s["pending_count"] == 1
    assert s["pending_amount"] == Decimal("50000")
    assert s["paid_month_count"] == 1
    assert s["paid_month_amount"] == Decimal("15000")
