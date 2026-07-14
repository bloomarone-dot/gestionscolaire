"""progression-service — moteur de décisions académiques."""
from fastapi import Depends, FastAPI, HTTPException, status
from sqlalchemy.orm import Session, sessionmaker

from common.db import Base, get_engine, init_engine
from common.progression.criteria import list_criteria
from common.roles import ESTABLISHMENT_STAFF
from common.tenant import TenantContext, require_tenant

from app import crud
from app.config import settings
from app.schemas import (
    AuditLogOut,
    ComputeRequest,
    ComputeResult,
    DecisionTypeIn,
    DecisionTypeOut,
    EnrollmentApplyIn,
    EnrollmentPrepareIn,
    EnrollmentPrepOut,
    ProgressionPolicyIn,
    ProgressionPolicyOut,
    ProposalOut,
    ProposalValidateIn,
)

app = FastAPI(title="progression-service — SaaS Scolaire", version="0.1.0")
_SessionLocal = None


@app.on_event("startup")
def _startup() -> None:
    global _SessionLocal
    init_engine(settings.database_url)
    Base.metadata.create_all(bind=get_engine())
    _SessionLocal = sessionmaker(bind=get_engine(), future=True)


def get_db() -> Session:
    db = _SessionLocal()
    try:
        yield db
    finally:
        db.close()


def require_staff(ctx: TenantContext = Depends(require_tenant)) -> TenantContext:
    if ctx.role not in ESTABLISHMENT_STAFF:
        raise HTTPException(status.HTTP_403_FORBIDDEN, "Réservé au personnel autorisé.")
    return ctx


@app.get("/health", tags=["infra"])
def health() -> dict:
    return {"status": "ok", "service": "progression-service"}


# ── Critères disponibles ──────────────────────────────────────────────────
@app.get("/progression/criteria", tags=["progression"])
def list_available_criteria():
    return list_criteria()


# ── Décisions configurables ───────────────────────────────────────────────
@app.get("/progression/decisions", response_model=list[DecisionTypeOut], tags=["progression"])
def list_decisions(db: Session = Depends(get_db), ctx: TenantContext = Depends(require_staff)):
    return crud.list_decisions(db, ctx.tenant_id)


@app.post("/progression/decisions", response_model=DecisionTypeOut, status_code=201, tags=["progression"])
def create_decision(
    payload: DecisionTypeIn,
    db: Session = Depends(get_db),
    ctx: TenantContext = Depends(require_staff),
):
    return crud.create_decision(db, ctx.tenant_id, payload)


@app.put("/progression/decisions/{decision_id}", response_model=DecisionTypeOut, tags=["progression"])
def update_decision(
    decision_id: int,
    payload: DecisionTypeIn,
    db: Session = Depends(get_db),
    ctx: TenantContext = Depends(require_staff),
):
    try:
        return crud.update_decision(db, ctx.tenant_id, decision_id, payload)
    except LookupError as e:
        raise HTTPException(status.HTTP_404_NOT_FOUND, str(e)) from e


# ── Politiques versionnées ────────────────────────────────────────────────
@app.get("/progression/policies", response_model=list[ProgressionPolicyOut], tags=["progression"])
def list_policies(db: Session = Depends(get_db), ctx: TenantContext = Depends(require_staff)):
    return crud.list_policies(db, ctx.tenant_id)


@app.post("/progression/policies", response_model=ProgressionPolicyOut, status_code=201, tags=["progression"])
def create_policy(
    payload: ProgressionPolicyIn,
    db: Session = Depends(get_db),
    ctx: TenantContext = Depends(require_staff),
):
    return crud.create_policy(db, ctx.tenant_id, payload, ctx.user_id)


@app.put("/progression/policies/{policy_id}", response_model=ProgressionPolicyOut, tags=["progression"])
def update_policy(
    policy_id: int,
    payload: ProgressionPolicyIn,
    db: Session = Depends(get_db),
    ctx: TenantContext = Depends(require_staff),
):
    try:
        return crud.update_policy(db, ctx.tenant_id, policy_id, payload)
    except LookupError as e:
        raise HTTPException(status.HTTP_404_NOT_FOUND, str(e)) from e


@app.post("/progression/policies/{policy_id}/version", response_model=ProgressionPolicyOut, tags=["progression"])
def version_policy(
    policy_id: int,
    db: Session = Depends(get_db),
    ctx: TenantContext = Depends(require_staff),
):
    try:
        return crud.version_policy(db, ctx.tenant_id, policy_id, ctx.user_id)
    except LookupError as e:
        raise HTTPException(status.HTTP_404_NOT_FOUND, str(e)) from e


@app.post("/progression/policies/{policy_id}/activate", response_model=ProgressionPolicyOut, tags=["progression"])
def activate_policy(
    policy_id: int,
    db: Session = Depends(get_db),
    ctx: TenantContext = Depends(require_staff),
):
    try:
        return crud.set_policy_active(db, ctx.tenant_id, policy_id, True)
    except LookupError as e:
        raise HTTPException(status.HTTP_404_NOT_FOUND, str(e)) from e


@app.post("/progression/policies/{policy_id}/deactivate", response_model=ProgressionPolicyOut, tags=["progression"])
def deactivate_policy(
    policy_id: int,
    db: Session = Depends(get_db),
    ctx: TenantContext = Depends(require_staff),
):
    try:
        return crud.set_policy_active(db, ctx.tenant_id, policy_id, False)
    except LookupError as e:
        raise HTTPException(status.HTTP_404_NOT_FOUND, str(e)) from e


# ── Calcul & propositions ─────────────────────────────────────────────────
@app.post("/progression/compute", response_model=ComputeResult, tags=["progression"])
def compute(
    payload: ComputeRequest,
    db: Session = Depends(get_db),
    ctx: TenantContext = Depends(require_staff),
):
    try:
        result = crud.compute_proposals(db, ctx, payload)
        return ComputeResult(**result)
    except ValueError as e:
        raise HTTPException(status.HTTP_422_UNPROCESSABLE_ENTITY, str(e)) from e


@app.get("/progression/proposals", response_model=list[ProposalOut], tags=["progression"])
def list_proposals(
    classe_id: int | None = None,
    annee_scolaire: str | None = None,
    status: str | None = None,
    db: Session = Depends(get_db),
    ctx: TenantContext = Depends(require_staff),
):
    return crud.list_proposals(db, ctx.tenant_id, classe_id=classe_id, annee=annee_scolaire, status=status)


@app.patch("/progression/proposals/{proposal_id}", response_model=ProposalOut, tags=["progression"])
def validate_proposal(
    proposal_id: int,
    payload: ProposalValidateIn,
    db: Session = Depends(get_db),
    ctx: TenantContext = Depends(require_staff),
):
    try:
        return crud.validate_proposal(db, ctx, proposal_id, payload)
    except LookupError as e:
        raise HTTPException(status.HTTP_404_NOT_FOUND, str(e)) from e
    except ValueError as e:
        raise HTTPException(status.HTTP_422_UNPROCESSABLE_ENTITY, str(e)) from e


@app.get("/progression/proposals/{proposal_id}/history", response_model=list[AuditLogOut], tags=["progression"])
def proposal_history(
    proposal_id: int,
    db: Session = Depends(get_db),
    ctx: TenantContext = Depends(require_staff),
):
    return crud.proposal_history(db, ctx.tenant_id, proposal_id)


# ── Inscriptions année suivante ───────────────────────────────────────────
@app.post("/progression/enrollment/prepare", response_model=list[EnrollmentPrepOut], tags=["progression"])
def prepare_enrollment(
    payload: EnrollmentPrepareIn,
    db: Session = Depends(get_db),
    ctx: TenantContext = Depends(require_staff),
):
    return crud.prepare_enrollments(db, ctx, payload)


@app.post("/progression/enrollment/apply", tags=["progression"])
def apply_enrollment(
    payload: EnrollmentApplyIn,
    db: Session = Depends(get_db),
    ctx: TenantContext = Depends(require_staff),
):
    return crud.apply_enrollments(db, ctx, payload)
