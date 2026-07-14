"""progression-service — politiques, décisions académiques et propositions."""
from datetime import datetime

from sqlalchemy import Boolean, Column, Date, DateTime, Integer, String, Text
from sqlalchemy.types import JSON

from common.db import Base


class DecisionType(Base):
    """Décision académique configurable par l'administrateur."""
    __tablename__ = "decision_types"

    id = Column(Integer, primary_key=True)
    tenant_id = Column(Integer, nullable=False, index=True)
    code = Column(String(40), nullable=False)
    label = Column(String(120), nullable=False)
    description = Column(Text, nullable=True)
    enrollment_action = Column(String(30), nullable=False, default="NONE")
    is_active = Column(Boolean, nullable=False, default=True)
    sort_order = Column(Integer, nullable=False, default=0)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)


class ProgressionPolicy(Base):
    """Politique de progression versionnée, activable, limitée par classe/cycle/année."""
    __tablename__ = "progression_policies"

    id = Column(Integer, primary_key=True)
    tenant_id = Column(Integer, nullable=False, index=True)
    name = Column(String(160), nullable=False)
    description = Column(Text, nullable=True)
    version = Column(Integer, nullable=False, default=1)
    parent_policy_id = Column(Integer, nullable=True, index=True)
    is_active = Column(Boolean, nullable=False, default=False)
    annee_scolaire = Column(String(20), nullable=True, index=True)
    valid_from = Column(Date, nullable=True)
    valid_to = Column(Date, nullable=True)
    classe_ids = Column(JSON, nullable=True)   # null ou [] = toutes
    cycle_codes = Column(JSON, nullable=True)  # null ou [] = tous
    priority = Column(Integer, nullable=False, default=100)
    rules = Column(JSON, nullable=False, default=list)
    exceptions = Column(JSON, nullable=False, default=list)
    created_by = Column(Integer, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)


class DecisionProposal(Base):
    """Proposition de décision — jamais appliquée automatiquement."""
    __tablename__ = "decision_proposals"

    id = Column(Integer, primary_key=True)
    tenant_id = Column(Integer, nullable=False, index=True)
    eleve_id = Column(Integer, nullable=False, index=True)
    classe_id = Column(Integer, nullable=False, index=True)
    annee_scolaire = Column(String(20), nullable=False, index=True)

    policy_id = Column(Integer, nullable=True)
    policy_version = Column(Integer, nullable=True)
    computed_decision_code = Column(String(40), nullable=True)
    computed_dest_action = Column(String(30), nullable=True)
    computed_dest_classe_id = Column(Integer, nullable=True)
    computed_dest_level_code = Column(String(30), nullable=True)
    computed_dest_series_code = Column(String(30), nullable=True)
    criteria_snapshot = Column(JSON, nullable=True)
    compute_rationale = Column(Text, nullable=True)

    proposed_decision_code = Column(String(40), nullable=True)
    proposed_dest_classe_id = Column(Integer, nullable=True)
    proposed_dest_level_code = Column(String(30), nullable=True)
    proposed_dest_series_code = Column(String(30), nullable=True)
    motif = Column(String(200), nullable=True)
    comment = Column(Text, nullable=True)

    status = Column(String(20), nullable=False, default="PROPOSED", index=True)
    validated_by = Column(Integer, nullable=True)
    validated_at = Column(DateTime, nullable=True)
    applied_at = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)


class ProposalAuditLog(Base):
    """Historique complet des modifications sur une proposition."""
    __tablename__ = "proposal_audit_logs"

    id = Column(Integer, primary_key=True)
    tenant_id = Column(Integer, nullable=False, index=True)
    proposal_id = Column(Integer, nullable=False, index=True)
    action = Column(String(20), nullable=False)
    before_data = Column(JSON, nullable=True)
    after_data = Column(JSON, nullable=True)
    comment = Column(Text, nullable=True)
    user_id = Column(Integer, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)


class EnrollmentPreparation(Base):
    """Inscription préparée pour l'année suivante après validation."""
    __tablename__ = "enrollment_preparations"

    id = Column(Integer, primary_key=True)
    tenant_id = Column(Integer, nullable=False, index=True)
    proposal_id = Column(Integer, nullable=False, index=True)
    eleve_id = Column(Integer, nullable=False, index=True)
    target_annee_scolaire = Column(String(20), nullable=False)
    dest_classe_id = Column(Integer, nullable=True)
    dest_level_code = Column(String(30), nullable=True)
    dest_cycle_code = Column(String(30), nullable=True)
    dest_series_code = Column(String(30), nullable=True)
    enrollment_action = Column(String(30), nullable=False)
    status = Column(String(20), nullable=False, default="PENDING")
    applied_at = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
