"""tresorerie-service — paiements, échéances et reçus d'inscription."""
from datetime import date, datetime

from sqlalchemy import Boolean, Column, Date, DateTime, Integer, Numeric, String, Text

from common.db import Base

STATUS_EN_ATTENTE = "EN_ATTENTE"
STATUS_PAYE = "PAYE"
STATUS_ANNULE = "ANNULE"

METHOD_ESPECES = "ESPECES"
METHOD_MOBILE = "MOBILE_MONEY"
METHOD_VIREMENT = "VIREMENT"
METHOD_CHEQUE = "CHEQUE"

# Frais de scolarité : inscription (à part) + 3 tranches de pension.
FEE_INSCRIPTION = "INSCRIPTION"
FEE_TRANCHE_1 = "TRANCHE_1"
FEE_TRANCHE_2 = "TRANCHE_2"
FEE_TRANCHE_3 = "TRANCHE_3"
FEE_AVANCE = "AVANCE"  # trop-perçu / avance
FEE_ORDER = (FEE_INSCRIPTION, FEE_TRANCHE_1, FEE_TRANCHE_2, FEE_TRANCHE_3)
FEE_LABELS = {
    FEE_INSCRIPTION: "Inscription",
    FEE_TRANCHE_1: "1ère tranche",
    FEE_TRANCHE_2: "2ème tranche",
    FEE_TRANCHE_3: "3ème tranche",
    FEE_AVANCE: "Avance / trop-perçu",
}


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

    # Paiement en ligne parent (Mobile Money)
    payment_token = Column(String(64), nullable=True, unique=True, index=True)
    parent_phone = Column(String(20), nullable=True)
    mobile_provider = Column(String(20), nullable=True)
    provider_reference = Column(String(64), nullable=True, index=True)
    pay_token = Column(String(64), nullable=True, index=True)
    paid_online = Column(Boolean, nullable=False, default=False)

    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)


class Retrait(Base):
    """Décaissement / retrait de caisse — déduit automatiquement du solde."""
    __tablename__ = "retraits"

    id = Column(Integer, primary_key=True)
    tenant_id = Column(Integer, nullable=False, index=True)
    label = Column(String(200), nullable=False)
    amount = Column(Numeric(12, 2), nullable=False)
    currency = Column(String(3), nullable=False, default="XAF")
    category = Column(String(60), nullable=True)
    notes = Column(Text, nullable=True)
    recorded_by = Column(Integer, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)


class FeeSchedule(Base):
    """Grille de frais par classe : inscription + montant de chaque tranche.

    Les mois de début/fin (1-12) indiquent la période couverte par chaque tranche —
    fournis par l'établissement (ex. 1ère tranche : octobre → décembre).
    """
    __tablename__ = "fee_schedules"

    id = Column(Integer, primary_key=True)
    tenant_id = Column(Integer, nullable=False, index=True)
    classe_id = Column(Integer, nullable=False, index=True)
    classe_nom = Column(String(120), nullable=True)

    inscription = Column(Numeric(12, 2), nullable=False, default=0)
    tranche1 = Column(Numeric(12, 2), nullable=False, default=0)
    tranche2 = Column(Numeric(12, 2), nullable=False, default=0)
    tranche3 = Column(Numeric(12, 2), nullable=False, default=0)

    t1_start_month = Column(Integer, nullable=True)
    t1_end_month = Column(Integer, nullable=True)
    t2_start_month = Column(Integer, nullable=True)
    t2_end_month = Column(Integer, nullable=True)
    t3_start_month = Column(Integer, nullable=True)
    t3_end_month = Column(Integer, nullable=True)

    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)


class PensionPaiement(Base):
    """Versement de scolarité affecté à un poste (inscription/tranche)."""
    __tablename__ = "pension_paiements"

    id = Column(Integer, primary_key=True)
    tenant_id = Column(Integer, nullable=False, index=True)
    eleve_id = Column(Integer, nullable=False, index=True)
    classe_id = Column(Integer, nullable=True, index=True)
    eleve_nom = Column(String(160), nullable=True)
    matricule = Column(String(40), nullable=True)

    fee_type = Column(String(20), nullable=False)
    amount = Column(Numeric(12, 2), nullable=False)
    currency = Column(String(3), nullable=False, default="XAF")
    payment_method = Column(String(20), nullable=True)
    receipt_number = Column(String(40), nullable=True)
    recorded_by = Column(Integer, nullable=True)
    paid_online = Column(Boolean, nullable=False, default=False)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
