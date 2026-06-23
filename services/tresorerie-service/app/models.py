"""tresorerie-service — paiements, échéances et reçus d'inscription."""
from datetime import date, datetime

from sqlalchemy import Column, Date, DateTime, Integer, Numeric, String, Text

from common.db import Base

STATUS_EN_ATTENTE = "EN_ATTENTE"
STATUS_PAYE = "PAYE"
STATUS_ANNULE = "ANNULE"

METHOD_ESPECES = "ESPECES"
METHOD_MOBILE = "MOBILE_MONEY"
METHOD_VIREMENT = "VIREMENT"
METHOD_CHEQUE = "CHEQUE"


class Paiement(Base):
    __tablename__ = "paiements"

    id = Column(Integer, primary_key=True)
    tenant_id = Column(Integer, nullable=False, index=True)

    eleve_id = Column(Integer, nullable=False, index=True)
    eleve_nom = Column(String(120), nullable=True)
    eleve_prenom = Column(String(120), nullable=True)
    matricule = Column(String(40), nullable=True)

    label = Column(String(200), nullable=False)
    amount = Column(Numeric(12, 2), nullable=False)
    currency = Column(String(3), nullable=False, default="XAF")

    due_date = Column(Date, nullable=True)
    paid_at = Column(DateTime, nullable=True)
    status = Column(String(20), nullable=False, default=STATUS_EN_ATTENTE)
    payment_method = Column(String(20), nullable=True)
    receipt_number = Column(String(40), nullable=True, unique=True)

    notes = Column(Text, nullable=True)
    recorded_by = Column(Integer, nullable=True)

    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)
