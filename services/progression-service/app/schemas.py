from datetime import date, datetime
from typing import Any

from pydantic import BaseModel, Field


# ── Décisions configurables ───────────────────────────────────────────────
class DecisionTypeIn(BaseModel):
    code: str = Field(..., min_length=1, max_length=40)
    label: str = Field(..., min_length=1, max_length=120)
    description: str | None = None
    enrollment_action: str = Field(default="NONE", max_length=30)
    is_active: bool = True
    sort_order: int = 0


class DecisionTypeOut(DecisionTypeIn):
    id: int
    tenant_id: int
    created_at: datetime
    model_config = {"from_attributes": True}


# ── Politiques versionnées ────────────────────────────────────────────────
class PolicyRuleIn(BaseModel):
    name: str = ""
    priority: int = 100
    logic: str = "AND"
    conditions: list[dict] = []
    decision_code: str
    dest_action: str = "AUTO"
    rationale: str = ""


class ProgressionPolicyIn(BaseModel):
    name: str
    description: str | None = None
    annee_scolaire: str | None = None
    valid_from: date | None = None
    valid_to: date | None = None
    classe_ids: list[int] | None = None
    cycle_codes: list[str] | None = None
    priority: int = 100
    rules: list[dict] = []
    exceptions: list[dict] = []
    is_active: bool = False


class ProgressionPolicyOut(ProgressionPolicyIn):
    id: int
    tenant_id: int
    version: int
    parent_policy_id: int | None = None
    created_by: int | None = None
    created_at: datetime
    updated_at: datetime
    model_config = {"from_attributes": True}


# ── Propositions & validation ─────────────────────────────────────────────
class ProposalOut(BaseModel):
    id: int
    tenant_id: int
    eleve_id: int
    classe_id: int
    annee_scolaire: str
    policy_id: int | None = None
    policy_version: int | None = None
    computed_decision_code: str | None = None
    computed_dest_action: str | None = None
    computed_dest_classe_id: int | None = None
    computed_dest_level_code: str | None = None
    computed_dest_series_code: str | None = None
    criteria_snapshot: dict | None = None
    compute_rationale: str | None = None
    proposed_decision_code: str | None = None
    proposed_dest_classe_id: int | None = None
    proposed_dest_level_code: str | None = None
    proposed_dest_series_code: str | None = None
    motif: str | None = None
    comment: str | None = None
    status: str
    validated_by: int | None = None
    validated_at: datetime | None = None
    applied_at: datetime | None = None
    created_at: datetime
    model_config = {"from_attributes": True}


class ProposalValidateIn(BaseModel):
    action: str = Field(..., pattern="^(ACCEPT|MODIFY|REJECT|POSTPONE)$")
    decision_code: str | None = None
    dest_classe_id: int | None = None
    dest_level_code: str | None = None
    dest_series_code: str | None = None
    motif: str | None = None
    comment: str | None = None


class ComputeRequest(BaseModel):
    classe_id: int
    annee_scolaire: str
    replace_existing: bool = False


class ComputeResult(BaseModel):
    created: int
    updated: int
    skipped: int
    proposals: list[ProposalOut]


class AuditLogOut(BaseModel):
    id: int
    proposal_id: int
    action: str
    before_data: dict | None = None
    after_data: dict | None = None
    comment: str | None = None
    user_id: int | None = None
    created_at: datetime
    model_config = {"from_attributes": True}


class EnrollmentPrepOut(BaseModel):
    id: int
    proposal_id: int
    eleve_id: int
    target_annee_scolaire: str
    dest_classe_id: int | None = None
    dest_level_code: str | None = None
    dest_cycle_code: str | None = None
    dest_series_code: str | None = None
    enrollment_action: str
    status: str
    applied_at: datetime | None = None
    created_at: datetime
    model_config = {"from_attributes": True}


class EnrollmentPrepareIn(BaseModel):
    annee_scolaire: str
    target_annee_scolaire: str
    classe_id: int | None = None


class EnrollmentApplyIn(BaseModel):
    target_annee_scolaire: str
    preparation_ids: list[int] | None = None
