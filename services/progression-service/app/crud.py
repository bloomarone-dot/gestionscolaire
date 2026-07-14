"""Logique métier progression-service."""
from __future__ import annotations

from datetime import date, datetime
from typing import Any

from sqlalchemy import select
from sqlalchemy.orm import Session

from common.progression.criteria import CriterionContext
from common.progression.engine import PolicyBundle, PolicyEngine
from common.progression.types import AuditAction, EnrollmentAction, ProposalStatus
from common.tenant import TenantContext

from app import clients
from app.models import (
    DecisionProposal,
    DecisionType,
    EnrollmentPreparation,
    ProgressionPolicy,
    ProposalAuditLog,
)
from app.resolver import suggest_destination
from app.schemas import (
    ComputeRequest,
    DecisionTypeIn,
    EnrollmentApplyIn,
    EnrollmentPrepareIn,
    ProgressionPolicyIn,
    ProposalValidateIn,
)


DEFAULT_DECISIONS = [
    ("PASSAGE", "Passage", EnrollmentAction.PASS_HIGHER, 1),
    ("REDOUBLEMENT", "Redoublement", EnrollmentAction.STAY_SAME, 2),
    ("EXCLUSION", "Exclusion", EnrollmentAction.EXCLUDE, 3),
    ("REORIENTATION", "Réorientation", EnrollmentAction.OTHER_CLASS, 4),
    ("TRANSFERT", "Transfert", EnrollmentAction.OTHER_CLASS, 5),
    ("ABANDON", "Abandon", EnrollmentAction.ABANDON, 6),
    ("PASSAGE_EXCEPTIONNEL", "Passage exceptionnel", EnrollmentAction.PASS_HIGHER, 7),
    ("A_DELIBERER", "À délibérer", EnrollmentAction.NONE, 8),
]


def ensure_default_decisions(db: Session, tenant_id: int) -> None:
    existing = db.scalar(
        select(DecisionType.id).where(DecisionType.tenant_id == tenant_id).limit(1)
    )
    if existing:
        return
    for code, label, action, order in DEFAULT_DECISIONS:
        db.add(DecisionType(
            tenant_id=tenant_id, code=code, label=label,
            enrollment_action=action.value, sort_order=order, is_active=True,
        ))
    db.commit()


# ── Décisions ─────────────────────────────────────────────────────────────
def list_decisions(db: Session, tenant_id: int) -> list[DecisionType]:
    ensure_default_decisions(db, tenant_id)
    return list(db.scalars(
        select(DecisionType).where(DecisionType.tenant_id == tenant_id)
        .order_by(DecisionType.sort_order, DecisionType.label)
    ).all())


def create_decision(db: Session, tenant_id: int, payload: DecisionTypeIn) -> DecisionType:
    row = DecisionType(tenant_id=tenant_id, **payload.model_dump())
    db.add(row)
    db.commit()
    db.refresh(row)
    return row


def update_decision(db: Session, tenant_id: int, decision_id: int, payload: DecisionTypeIn) -> DecisionType:
    row = db.scalar(
        select(DecisionType).where(DecisionType.id == decision_id, DecisionType.tenant_id == tenant_id)
    )
    if not row:
        raise LookupError("Décision introuvable")
    for k, v in payload.model_dump().items():
        setattr(row, k, v)
    db.commit()
    db.refresh(row)
    return row


def get_decision_map(db: Session, tenant_id: int) -> dict[str, DecisionType]:
    return {d.code: d for d in list_decisions(db, tenant_id)}


# ── Politiques ────────────────────────────────────────────────────────────
def list_policies(db: Session, tenant_id: int) -> list[ProgressionPolicy]:
    return list(db.scalars(
        select(ProgressionPolicy).where(ProgressionPolicy.tenant_id == tenant_id)
        .order_by(ProgressionPolicy.priority, ProgressionPolicy.name, ProgressionPolicy.version.desc())
    ).all())


def create_policy(
    db: Session, tenant_id: int, payload: ProgressionPolicyIn, created_by: int | None,
) -> ProgressionPolicy:
    row = ProgressionPolicy(
        tenant_id=tenant_id,
        version=1,
        created_by=created_by,
        **payload.model_dump(),
    )
    db.add(row)
    db.commit()
    db.refresh(row)
    return row


def update_policy(
    db: Session, tenant_id: int, policy_id: int, payload: ProgressionPolicyIn,
) -> ProgressionPolicy:
    row = db.scalar(
        select(ProgressionPolicy).where(
            ProgressionPolicy.id == policy_id, ProgressionPolicy.tenant_id == tenant_id,
        )
    )
    if not row:
        raise LookupError("Politique introuvable")
    for k, v in payload.model_dump().items():
        setattr(row, k, v)
    db.commit()
    db.refresh(row)
    return row


def version_policy(
    db: Session, tenant_id: int, policy_id: int, created_by: int | None,
) -> ProgressionPolicy:
    parent = db.scalar(
        select(ProgressionPolicy).where(
            ProgressionPolicy.id == policy_id, ProgressionPolicy.tenant_id == tenant_id,
        )
    )
    if not parent:
        raise LookupError("Politique introuvable")
    row = ProgressionPolicy(
        tenant_id=tenant_id,
        name=parent.name,
        description=parent.description,
        version=parent.version + 1,
        parent_policy_id=parent.id,
        is_active=False,
        annee_scolaire=parent.annee_scolaire,
        valid_from=parent.valid_from,
        valid_to=parent.valid_to,
        classe_ids=parent.classe_ids,
        cycle_codes=parent.cycle_codes,
        priority=parent.priority,
        rules=parent.rules,
        exceptions=parent.exceptions,
        created_by=created_by,
    )
    db.add(row)
    db.commit()
    db.refresh(row)
    return row


def set_policy_active(db: Session, tenant_id: int, policy_id: int, active: bool) -> ProgressionPolicy:
    row = db.scalar(
        select(ProgressionPolicy).where(
            ProgressionPolicy.id == policy_id, ProgressionPolicy.tenant_id == tenant_id,
        )
    )
    if not row:
        raise LookupError("Politique introuvable")
    row.is_active = active
    db.commit()
    db.refresh(row)
    return row


def _policy_applies(policy: ProgressionPolicy, classe: dict, annee: str, today: date) -> bool:
    if not policy.is_active:
        return False
    if policy.annee_scolaire and policy.annee_scolaire != annee:
        return False
    if policy.valid_from and today < policy.valid_from:
        return False
    if policy.valid_to and today > policy.valid_to:
        return False
    ids = policy.classe_ids or []
    if ids and classe.get("id") not in ids:
        return False
    cycles = policy.cycle_codes or []
    if cycles and classe.get("cycle_code") not in cycles:
        return False
    return True


def _active_policies(
    db: Session, tenant_id: int, classe: dict, annee: str,
) -> list[PolicyBundle]:
    today = date.today()
    rows = list_policies(db, tenant_id)
    bundles = []
    for p in rows:
        if not _policy_applies(p, classe, annee, today):
            continue
        bundles.append(PolicyBundle(
            id=p.id, version=p.version, name=p.name, priority=p.priority,
            rules=p.rules or [], exceptions=p.exceptions or [],
        ))
    return bundles


# ── Calcul des propositions ───────────────────────────────────────────────
def compute_proposals(
    db: Session, ctx: TenantContext, payload: ComputeRequest,
) -> dict:
    classe = clients.get_classe(ctx, payload.classe_id)
    students = clients.get_students(ctx, payload.classe_id)
    bulletin = clients.get_class_bulletin(ctx, payload.classe_id)
    all_classes = clients.get_classes(ctx)
    decisions = get_decision_map(db, ctx.tenant_id)
    policies = _active_policies(db, ctx.tenant_id, classe, payload.annee_scolaire)

    if not policies:
        raise ValueError("Aucune politique active pour cette classe et cette année scolaire.")

    engine = PolicyEngine(policies)
    eleve_bulletins = {
        row.get("eleve_id"): row
        for row in (bulletin.get("bulletins") or bulletin.get("eleves") or [])
    }

    created = updated = skipped = 0
    results: list[DecisionProposal] = []

    for student in students:
        eid = student["id"]
        existing = db.scalar(
            select(DecisionProposal).where(
                DecisionProposal.tenant_id == ctx.tenant_id,
                DecisionProposal.eleve_id == eid,
                DecisionProposal.annee_scolaire == payload.annee_scolaire,
                DecisionProposal.status.notin_([ProposalStatus.APPLIED.value, ProposalStatus.REJECTED.value]),
            )
        )
        if existing and not payload.replace_existing:
            skipped += 1
            results.append(existing)
            continue

        b_row = eleve_bulletins.get(eid) or {}
        crit_ctx = CriterionContext(
            eleve_id=eid,
            classe_id=payload.classe_id,
            eleve=student,
            classe=classe,
            bulletin=b_row,
        )
        match = engine.evaluate(crit_ctx)
        if not match:
            skipped += 1
            continue

        decision = decisions.get(match.decision_code)
        enroll_action = decision.enrollment_action if decision else EnrollmentAction.NONE.value
        dest_id, dest_level, dest_series = suggest_destination(
            all_classes, classe, enroll_action, dest_action=match.dest_action,
        )

        if existing:
            before = _proposal_snapshot(existing)
            existing.computed_decision_code = match.decision_code
            existing.computed_dest_action = enroll_action
            existing.computed_dest_classe_id = dest_id
            existing.computed_dest_level_code = dest_level
            existing.computed_dest_series_code = dest_series
            existing.criteria_snapshot = match.criteria_values
            existing.compute_rationale = match.rationale
            existing.policy_id = match.policy_id
            existing.policy_version = match.policy_version
            if existing.status == ProposalStatus.PROPOSED.value:
                existing.proposed_decision_code = match.decision_code
                existing.proposed_dest_classe_id = dest_id
                existing.proposed_dest_level_code = dest_level
                existing.proposed_dest_series_code = dest_series
            _audit(db, ctx.tenant_id, existing.id, AuditAction.CREATED.value, before, _proposal_snapshot(existing), ctx.user_id, "Recalcul")
            updated += 1
            results.append(existing)
        else:
            row = DecisionProposal(
                tenant_id=ctx.tenant_id,
                eleve_id=eid,
                classe_id=payload.classe_id,
                annee_scolaire=payload.annee_scolaire,
                policy_id=match.policy_id,
                policy_version=match.policy_version,
                computed_decision_code=match.decision_code,
                computed_dest_action=enroll_action,
                computed_dest_classe_id=dest_id,
                computed_dest_level_code=dest_level,
                computed_dest_series_code=dest_series,
                proposed_decision_code=match.decision_code,
                proposed_dest_classe_id=dest_id,
                proposed_dest_level_code=dest_level,
                proposed_dest_series_code=dest_series,
                criteria_snapshot=match.criteria_values,
                compute_rationale=match.rationale,
                status=ProposalStatus.PROPOSED.value,
            )
            db.add(row)
            db.flush()
            _audit(db, ctx.tenant_id, row.id, AuditAction.CREATED.value, None, _proposal_snapshot(row), ctx.user_id, "Calcul initial")
            created += 1
            results.append(row)

    db.commit()
    for r in results:
        db.refresh(r)
    return {"created": created, "updated": updated, "skipped": skipped, "proposals": results}


def list_proposals(
    db: Session, tenant_id: int, *, classe_id: int | None = None, annee: str | None = None, status: str | None = None,
) -> list[DecisionProposal]:
    q = select(DecisionProposal).where(DecisionProposal.tenant_id == tenant_id)
    if classe_id:
        q = q.where(DecisionProposal.classe_id == classe_id)
    if annee:
        q = q.where(DecisionProposal.annee_scolaire == annee)
    if status:
        q = q.where(DecisionProposal.status == status)
    return list(db.scalars(q.order_by(DecisionProposal.created_at.desc())).all())


def validate_proposal(
    db: Session, ctx: TenantContext, proposal_id: int, payload: ProposalValidateIn,
) -> DecisionProposal:
    row = db.scalar(
        select(DecisionProposal).where(
            DecisionProposal.id == proposal_id, DecisionProposal.tenant_id == ctx.tenant_id,
        )
    )
    if not row:
        raise LookupError("Proposition introuvable")
    if row.status == ProposalStatus.APPLIED.value:
        raise ValueError("Proposition déjà appliquée")

    before = _proposal_snapshot(row)
    action = payload.action.upper()

    if action == "ACCEPT":
        row.status = ProposalStatus.ACCEPTED.value
        row.proposed_decision_code = row.computed_decision_code
        row.proposed_dest_classe_id = row.computed_dest_classe_id
        row.proposed_dest_level_code = row.computed_dest_level_code
        row.proposed_dest_series_code = row.computed_dest_series_code
        audit_action = AuditAction.ACCEPTED.value
    elif action == "MODIFY":
        if not payload.decision_code:
            raise ValueError("decision_code requis pour une modification")
        row.status = ProposalStatus.MODIFIED.value
        row.proposed_decision_code = payload.decision_code
        row.proposed_dest_classe_id = payload.dest_classe_id
        row.proposed_dest_level_code = payload.dest_level_code
        row.proposed_dest_series_code = payload.dest_series_code
        audit_action = AuditAction.MODIFIED.value
    elif action == "REJECT":
        row.status = ProposalStatus.REJECTED.value
        audit_action = AuditAction.REJECTED.value
    elif action == "POSTPONE":
        row.status = ProposalStatus.POSTPONED.value
        audit_action = AuditAction.POSTPONED.value
    else:
        raise ValueError("Action invalide")

    row.motif = payload.motif or row.motif
    row.comment = payload.comment or row.comment
    row.validated_by = ctx.user_id
    row.validated_at = datetime.utcnow()
    _audit(db, ctx.tenant_id, row.id, audit_action, before, _proposal_snapshot(row), ctx.user_id, payload.comment)
    db.commit()
    db.refresh(row)
    return row


def proposal_history(db: Session, tenant_id: int, proposal_id: int) -> list[ProposalAuditLog]:
    return list(db.scalars(
        select(ProposalAuditLog).where(
            ProposalAuditLog.tenant_id == tenant_id,
            ProposalAuditLog.proposal_id == proposal_id,
        ).order_by(ProposalAuditLog.created_at)
    ).all())


# ── Préparation inscriptions ────────────────────────────────────────────────
def prepare_enrollments(
    db: Session, ctx: TenantContext, payload: EnrollmentPrepareIn,
) -> list[EnrollmentPreparation]:
    q = select(DecisionProposal).where(
        DecisionProposal.tenant_id == ctx.tenant_id,
        DecisionProposal.annee_scolaire == payload.annee_scolaire,
        DecisionProposal.status.in_([
            ProposalStatus.ACCEPTED.value,
            ProposalStatus.MODIFIED.value,
        ]),
    )
    if payload.classe_id:
        q = q.where(DecisionProposal.classe_id == payload.classe_id)
    proposals = list(db.scalars(q).all())
    decisions = get_decision_map(db, ctx.tenant_id)
    prepared: list[EnrollmentPreparation] = []

    for prop in proposals:
        existing = db.scalar(
            select(EnrollmentPreparation).where(
                EnrollmentPreparation.proposal_id == prop.id,
                EnrollmentPreparation.status != "CANCELLED",
            )
        )
        if existing:
            prepared.append(existing)
            continue
        dec = decisions.get(prop.proposed_decision_code or "")
        action = dec.enrollment_action if dec else EnrollmentAction.NONE.value
        if action == EnrollmentAction.NONE.value:
            continue
        row = EnrollmentPreparation(
            tenant_id=ctx.tenant_id,
            proposal_id=prop.id,
            eleve_id=prop.eleve_id,
            target_annee_scolaire=payload.target_annee_scolaire,
            dest_classe_id=prop.proposed_dest_classe_id,
            dest_level_code=prop.proposed_dest_level_code,
            dest_series_code=prop.proposed_dest_series_code,
            enrollment_action=action,
            status="PENDING",
        )
        db.add(row)
        prepared.append(row)

    db.commit()
    for r in prepared:
        db.refresh(r)
    return prepared


def apply_enrollments(
    db: Session, ctx: TenantContext, payload: EnrollmentApplyIn,
) -> dict:
    q = select(EnrollmentPreparation).where(
        EnrollmentPreparation.tenant_id == ctx.tenant_id,
        EnrollmentPreparation.target_annee_scolaire == payload.target_annee_scolaire,
        EnrollmentPreparation.status == "PENDING",
    )
    if payload.preparation_ids:
        q = q.where(EnrollmentPreparation.id.in_(payload.preparation_ids))
    rows = list(db.scalars(q).all())
    if not rows:
        return {"applied": 0, "results": []}

    by_source: dict[int, list] = {}
    prop_map = {}
    for prep in rows:
        prop = db.scalar(select(DecisionProposal).where(DecisionProposal.id == prep.proposal_id))
        if not prop:
            continue
        prop_map[prep.id] = prop
        by_source.setdefault(prop.classe_id, []).append((prep, prop))

    applied = 0
    results = []
    for source_classe_id, items in by_source.items():
        promo_items = []
        for prep, prop in items:
            status = _map_to_promotion_status(prep.enrollment_action)
            if not status:
                prep.status = "CANCELLED"
                continue
            promo_items.append({
                "eleve_id": prep.eleve_id,
                "status": status,
                "dest_classe_id": prep.dest_classe_id,
                "new_level_code": prep.dest_level_code,
                "new_series_code": prep.dest_series_code,
            })
        if promo_items:
            res = clients.apply_promotions(ctx, {
                "source_classe_id": source_classe_id,
                "items": promo_items,
            })
            applied += res.get("applied", len(promo_items))
            results.extend(res.get("results", []))

        for prep, prop in items:
            prep.status = "APPLIED"
            prep.applied_at = datetime.utcnow()
            prop.status = ProposalStatus.APPLIED.value
            prop.applied_at = datetime.utcnow()
            _audit(db, ctx.tenant_id, prop.id, AuditAction.APPLIED.value,
                   None, _proposal_snapshot(prop), ctx.user_id, "Inscription appliquée")

    db.commit()
    return {"applied": applied, "results": results}


def _map_to_promotion_status(enrollment_action: str) -> str | None:
    mapping = {
        EnrollmentAction.PASS_HIGHER.value: "ADMIS",
        EnrollmentAction.STAY_SAME.value: "REDOUBLE",
        EnrollmentAction.OTHER_CLASS.value: "REORIENTE",
        EnrollmentAction.CYCLE_CHANGE.value: "ADMIS",
        EnrollmentAction.EXIT.value: "SORTANT",
        EnrollmentAction.EXCLUDE.value: "EXCLU",
        EnrollmentAction.ABANDON.value: "ABANDON",
    }
    return mapping.get(enrollment_action)


def _proposal_snapshot(row: DecisionProposal) -> dict:
    return {
        "status": row.status,
        "proposed_decision_code": row.proposed_decision_code,
        "proposed_dest_classe_id": row.proposed_dest_classe_id,
        "proposed_dest_level_code": row.proposed_dest_level_code,
        "proposed_dest_series_code": row.proposed_dest_series_code,
        "motif": row.motif,
        "comment": row.comment,
    }


def _audit(
    db: Session, tenant_id: int, proposal_id: int, action: str,
    before: dict | None, after: dict | None, user_id: int | None, comment: str | None,
) -> None:
    db.add(ProposalAuditLog(
        tenant_id=tenant_id,
        proposal_id=proposal_id,
        action=action,
        before_data=before,
        after_data=after,
        user_id=user_id,
        comment=comment,
    ))
