from datetime import date, datetime
from decimal import Decimal
import secrets

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.mobile_pay import (
    initiate_checkout,
    is_sandbox,
    new_provider_reference,
    normalize_provider,
)
from app.models import (
    FEE_AVANCE,
    FEE_INSCRIPTION,
    FEE_LABELS,
    FEE_ORDER,
    FEE_TRANCHE_1,
    FEE_TRANCHE_2,
    FEE_TRANCHE_3,
    FeeSchedule,
    Paiement,
    PensionPaiement,
    Retrait,
    STATUS_ANNULE,
    STATUS_EN_ATTENTE,
    STATUS_PAYE,
)
from app.schemas import (
    FeeScheduleIn,
    PaiementCreate,
    PaiementEncaisser,
    ParentPayInit,
    PensionPayIn,
    RetraitCreate,
)


def list_paiements(
    db: Session,
    tenant_id: int,
    *,
    eleve_id: int | None = None,
    status: str | None = None,
) -> list[Paiement]:
    q = select(Paiement).where(Paiement.tenant_id == tenant_id)
    if eleve_id is not None:
        q = q.where(Paiement.eleve_id == eleve_id)
    if status:
        q = q.where(Paiement.status == status)
    q = q.order_by(Paiement.created_at.desc())
    return list(db.scalars(q).all())


def get_paiement(db: Session, tenant_id: int, paiement_id: int) -> Paiement | None:
    return db.scalar(
        select(Paiement).where(Paiement.id == paiement_id, Paiement.tenant_id == tenant_id)
    )


def _next_receipt_number(db: Session, tenant_id: int) -> str:
    year = datetime.utcnow().year
    prefix = f"REC-{tenant_id}-{year}-"
    last = db.scalar(
        select(Paiement.receipt_number)
        .where(
            Paiement.tenant_id == tenant_id,
            Paiement.receipt_number.isnot(None),
            Paiement.receipt_number.like(f"{prefix}%"),
        )
        .order_by(Paiement.id.desc())
        .limit(1)
    )
    seq = 1
    if last and last.startswith(prefix):
        try:
            seq = int(last.split("-")[-1]) + 1
        except ValueError:
            seq = 1
    return f"{prefix}{seq:04d}"


def create_paiement(
    db: Session,
    tenant_id: int,
    payload: PaiementCreate,
    recorded_by: int | None,
) -> Paiement:
    row = Paiement(
        tenant_id=tenant_id,
        eleve_id=payload.eleve_id,
        eleve_nom=payload.eleve_nom,
        eleve_prenom=payload.eleve_prenom,
        matricule=payload.matricule,
        label=payload.label,
        amount=payload.amount,
        currency=payload.currency or "XAF",
        due_date=payload.due_date,
        status=STATUS_EN_ATTENTE,
        notes=payload.notes,
        recorded_by=recorded_by,
    )
    db.add(row)
    db.commit()
    db.refresh(row)
    return row


def get_paiement_by_token(db: Session, token: str) -> Paiement | None:
    return db.scalar(select(Paiement).where(Paiement.payment_token == token))


def ensure_payment_token(db: Session, tenant_id: int, paiement_id: int) -> Paiement:
    row = get_paiement(db, tenant_id, paiement_id)
    if not row:
        raise LookupError("Paiement introuvable")
    if not row.payment_token:
        row.payment_token = secrets.token_urlsafe(24)
        db.commit()
        db.refresh(row)
    return row


def initiate_parent_payment(
    db: Session,
    token: str,
    payload: ParentPayInit,
    *,
    return_url: str,
) -> tuple[Paiement, dict]:
    row = get_paiement_by_token(db, token)
    if not row:
        raise LookupError("Lien de paiement invalide ou expiré")
    if row.status == STATUS_ANNULE:
        raise ValueError("Cette échéance a été annulée")
    if row.status == STATUS_PAYE:
        raise ValueError("Ce paiement est déjà réglé")

    provider = normalize_provider(payload.provider)
    reference = row.provider_reference or new_provider_reference()
    row.parent_phone = payload.parent_phone
    row.mobile_provider = provider
    row.provider_reference = reference
    db.commit()
    db.refresh(row)

    checkout = initiate_checkout(
        amount=float(row.amount),
        currency=row.currency or "XAF",
        reference=reference,
        phone=payload.parent_phone,
        provider=provider,
        description=row.label,
        return_url=return_url,
    )
    checkout["sandbox"] = is_sandbox()
    if checkout.get("pay_token"):
        row.pay_token = checkout["pay_token"]
        db.commit()
        db.refresh(row)
    return row, checkout


def get_paiement_by_pay_token(db: Session, pay_token: str) -> Paiement | None:
    return db.scalar(select(Paiement).where(Paiement.pay_token == pay_token))


def try_confirm_orange_payment(db: Session, row: Paiement) -> Paiement:
    """Interroge Orange et confirme si la transaction est réussie."""
    if not row.pay_token or row.status == STATUS_PAYE:
        return row
    from app.orange_money import is_success_status, payment_status

    payload = payment_status(row.pay_token)
    if is_success_status(payload):
        return confirm_parent_payment(db, row.payment_token, provider_ref=row.pay_token)
    return row


def confirm_parent_payment(db: Session, token: str, *, provider_ref: str | None = None) -> Paiement:
    """Confirme un paiement Mobile Money (webhook opérateur ou sandbox)."""
    row = get_paiement_by_token(db, token)
    if not row:
        raise LookupError("Paiement introuvable")
    if row.status == STATUS_PAYE:
        return row
    if row.status == STATUS_ANNULE:
        raise ValueError("Paiement annulé")

    row.status = STATUS_PAYE
    row.payment_method = "MOBILE_MONEY"
    row.paid_at = datetime.utcnow()
    row.paid_online = True
    row.receipt_number = row.receipt_number or _next_receipt_number(db, row.tenant_id)
    if provider_ref:
        row.provider_reference = provider_ref
    row.recorded_by = None
    db.commit()
    db.refresh(row)
    return row


def encaisser_paiement(
    db: Session,
    tenant_id: int,
    paiement_id: int,
    payload: PaiementEncaisser,
    recorded_by: int | None,
) -> Paiement:
    row = get_paiement(db, tenant_id, paiement_id)
    if not row:
        raise LookupError("Paiement introuvable")
    if row.status == STATUS_ANNULE:
        raise ValueError("Paiement annulé")
    if row.status == STATUS_PAYE:
        return row
    row.status = STATUS_PAYE
    row.payment_method = payload.payment_method
    row.paid_at = payload.paid_at or datetime.utcnow()
    row.paid_online = payload.payment_method == "MOBILE_MONEY" and bool(row.parent_phone)
    row.receipt_number = row.receipt_number or _next_receipt_number(db, tenant_id)
    if payload.notes:
        row.notes = payload.notes
    row.recorded_by = recorded_by or row.recorded_by
    db.commit()
    db.refresh(row)
    return row


def annuler_paiement(db: Session, tenant_id: int, paiement_id: int) -> Paiement:
    row = get_paiement(db, tenant_id, paiement_id)
    if not row:
        raise LookupError("Paiement introuvable")
    if row.status == STATUS_PAYE:
        raise ValueError("Impossible d'annuler un paiement encaissé")
    row.status = STATUS_ANNULE
    db.commit()
    db.refresh(row)
    return row


def stats(db: Session, tenant_id: int) -> dict:
    pending = db.execute(
        select(func.count(Paiement.id), func.coalesce(func.sum(Paiement.amount), 0))
        .where(Paiement.tenant_id == tenant_id, Paiement.status == STATUS_EN_ATTENTE)
    ).one()
    month_start = datetime.utcnow().replace(day=1, hour=0, minute=0, second=0, microsecond=0)
    paid_month = db.execute(
        select(func.count(Paiement.id), func.coalesce(func.sum(Paiement.amount), 0))
        .where(
            Paiement.tenant_id == tenant_id,
            Paiement.status == STATUS_PAYE,
            Paiement.paid_at >= month_start,
        )
    ).one()
    online_month = db.execute(
        select(func.count(Paiement.id), func.coalesce(func.sum(Paiement.amount), 0))
        .where(
            Paiement.tenant_id == tenant_id,
            Paiement.status == STATUS_PAYE,
            Paiement.paid_at >= month_start,
            Paiement.paid_online.is_(True),
        )
    ).one()
    # Versements de scolarité (inscription + tranches) du mois.
    pension_month = db.execute(
        select(func.count(PensionPaiement.id), func.coalesce(func.sum(PensionPaiement.amount), 0))
        .where(PensionPaiement.tenant_id == tenant_id, PensionPaiement.created_at >= month_start)
    ).one()
    pension_online = db.execute(
        select(func.coalesce(func.sum(PensionPaiement.amount), 0))
        .where(
            PensionPaiement.tenant_id == tenant_id,
            PensionPaiement.created_at >= month_start,
            PensionPaiement.paid_online.is_(True),
        )
    ).scalar()

    paid_n = int(paid_month[0] or 0) + int(pension_month[0] or 0)
    online_n = int(online_month[0] or 0)
    paid_amount = Decimal(paid_month[1] or 0) + Decimal(pension_month[1] or 0)
    online_amount = Decimal(online_month[1] or 0) + Decimal(pension_online or 0)
    withdrawals = db.execute(
        select(func.count(Retrait.id), func.coalesce(func.sum(Retrait.amount), 0))
        .where(Retrait.tenant_id == tenant_id, Retrait.created_at >= month_start)
    ).one()
    withdrawal_amount = Decimal(withdrawals[1] or 0)
    return {
        "pending_count": int(pending[0] or 0),
        "pending_amount": Decimal(pending[1] or 0),
        "paid_month_count": paid_n,
        "paid_month_amount": paid_amount,
        "online_month_count": online_n,
        "online_month_amount": online_amount,
        "cash_month_count": max(0, paid_n - online_n),
        "withdrawal_month_count": int(withdrawals[0] or 0),
        "withdrawal_month_amount": withdrawal_amount,
        "caisse_solde": paid_amount - withdrawal_amount,
    }


def list_retraits(db: Session, tenant_id: int) -> list[Retrait]:
    return list(
        db.scalars(
            select(Retrait)
            .where(Retrait.tenant_id == tenant_id)
            .order_by(Retrait.created_at.desc())
        ).all()
    )


def create_retrait(
    db: Session,
    tenant_id: int,
    payload: RetraitCreate,
    recorded_by: int | None,
) -> Retrait:
    row = Retrait(
        tenant_id=tenant_id,
        label=payload.label,
        amount=payload.amount,
        currency=payload.currency or "XAF",
        category=payload.category,
        notes=payload.notes,
        recorded_by=recorded_by,
    )
    db.add(row)
    db.commit()
    db.refresh(row)
    return row


# ════════════════════════ Grille de frais (scolarité) ════════════════════════
def _next_pension_receipt_number(db: Session, tenant_id: int) -> str:
    year = datetime.utcnow().year
    prefix = f"SCO-{tenant_id}-{year}-"
    last = db.scalar(
        select(PensionPaiement.receipt_number)
        .where(
            PensionPaiement.tenant_id == tenant_id,
            PensionPaiement.receipt_number.isnot(None),
            PensionPaiement.receipt_number.like(f"{prefix}%"),
        )
        .order_by(PensionPaiement.id.desc())
        .limit(1)
    )
    seq = 1
    if last and last.startswith(prefix):
        try:
            seq = int(last.split("-")[-1]) + 1
        except ValueError:
            seq = 1
    return f"{prefix}{seq:04d}"


def get_fee_schedule(db: Session, tenant_id: int, classe_id: int) -> FeeSchedule | None:
    return db.scalar(
        select(FeeSchedule).where(
            FeeSchedule.tenant_id == tenant_id, FeeSchedule.classe_id == classe_id
        )
    )


def list_fee_schedules(db: Session, tenant_id: int) -> list[FeeSchedule]:
    return list(
        db.scalars(
            select(FeeSchedule).where(FeeSchedule.tenant_id == tenant_id)
        ).all()
    )


def upsert_fee_schedule(
    db: Session, tenant_id: int, classe_id: int, payload: FeeScheduleIn
) -> FeeSchedule:
    row = get_fee_schedule(db, tenant_id, classe_id)
    if not row:
        row = FeeSchedule(tenant_id=tenant_id, classe_id=classe_id)
        db.add(row)
    for field, value in payload.model_dump().items():
        setattr(row, field, value)
    db.commit()
    db.refresh(row)
    return row


def _due_by_bucket(schedule: FeeSchedule | None) -> dict[str, Decimal]:
    if not schedule:
        return {b: Decimal("0") for b in FEE_ORDER}
    return {
        FEE_INSCRIPTION: Decimal(schedule.inscription or 0),
        FEE_TRANCHE_1: Decimal(schedule.tranche1 or 0),
        FEE_TRANCHE_2: Decimal(schedule.tranche2 or 0),
        FEE_TRANCHE_3: Decimal(schedule.tranche3 or 0),
    }


def _paid_by_bucket(db: Session, tenant_id: int, eleve_id: int) -> dict[str, Decimal]:
    rows = db.execute(
        select(PensionPaiement.fee_type, func.coalesce(func.sum(PensionPaiement.amount), 0))
        .where(
            PensionPaiement.tenant_id == tenant_id,
            PensionPaiement.eleve_id == eleve_id,
        )
        .group_by(PensionPaiement.fee_type)
    ).all()
    paid = {b: Decimal("0") for b in FEE_ORDER}
    paid[FEE_AVANCE] = Decimal("0")
    for fee_type, total in rows:
        paid[fee_type] = Decimal(total or 0)
    return paid


def _school_month_rank(month: int | None) -> int:
    """Ordonne les mois sur une année scolaire commençant en septembre (9)."""
    if not month:
        return -1
    return (int(month) - 9) % 12


def _expected_due_now(schedule: FeeSchedule | None, due: dict[str, Decimal]) -> Decimal:
    """Montant théoriquement dû à ce jour (inscription + tranches dont la période a débuté)."""
    total = due.get(FEE_INSCRIPTION, Decimal("0"))
    if not schedule:
        return total
    current_rank = _school_month_rank(datetime.utcnow().month)
    starts = {
        FEE_TRANCHE_1: schedule.t1_start_month,
        FEE_TRANCHE_2: schedule.t2_start_month,
        FEE_TRANCHE_3: schedule.t3_start_month,
    }
    for bucket, start in starts.items():
        # Pas de mois configuré → toujours considéré comme dû.
        if not start or current_rank >= _school_month_rank(start):
            total += due.get(bucket, Decimal("0"))
    return total


def pension_summary(
    db: Session, tenant_id: int, eleve_id: int, classe_id: int | None
) -> dict:
    schedule = get_fee_schedule(db, tenant_id, classe_id) if classe_id else None
    due = _due_by_bucket(schedule)
    paid = _paid_by_bucket(db, tenant_id, eleve_id)

    buckets = []
    total_due = Decimal("0")
    total_paid = Decimal("0")
    for bucket in FEE_ORDER:
        d = due.get(bucket, Decimal("0"))
        p = paid.get(bucket, Decimal("0"))
        buckets.append({
            "fee_type": bucket,
            "label": FEE_LABELS[bucket],
            "due": d,
            "paid": p,
            "reste": max(Decimal("0"), d - p),
        })
        total_due += d
        total_paid += p
    # L'avance éventuelle compte dans le total versé.
    total_paid += paid.get(FEE_AVANCE, Decimal("0"))

    reste = max(Decimal("0"), total_due - total_paid)
    expected = _expected_due_now(schedule, due)
    en_regle = total_paid >= expected
    if total_due == 0:
        status = "NON_CONFIGURE"
    elif reste == 0:
        status = "SOLDE"
    elif en_regle:
        status = "EN_REGLE"
    else:
        status = "EN_RETARD"

    return {
        "eleve_id": eleve_id,
        "classe_id": classe_id,
        "buckets": buckets,
        "total_due": total_due,
        "total_paid": total_paid,
        "reste": reste,
        "expected_due_now": expected,
        "en_regle": en_regle,
        "status": status,
    }


def record_pension_payment(
    db: Session, tenant_id: int, payload: PensionPayIn, recorded_by: int | None
) -> dict:
    """Affecte un versement : inscription d'abord, puis tranches 1→3, reste en avance."""
    schedule = get_fee_schedule(db, tenant_id, payload.classe_id) if payload.classe_id else None
    due = _due_by_bucket(schedule)
    paid = _paid_by_bucket(db, tenant_id, payload.eleve_id)

    remaining = Decimal(payload.amount)
    receipt = _next_pension_receipt_number(db, tenant_id)
    allocations: list[dict] = []

    for bucket in FEE_ORDER:
        if remaining <= 0:
            break
        bucket_due = due.get(bucket, Decimal("0"))
        bucket_paid = paid.get(bucket, Decimal("0"))
        need = bucket_due - bucket_paid
        if need <= 0:
            continue
        take = min(remaining, need)
        if take <= 0:
            continue
        allocations.append({"fee_type": bucket, "label": FEE_LABELS[bucket], "amount": take})
        remaining -= take

    # Trop-perçu → avance.
    if remaining > 0:
        allocations.append({"fee_type": FEE_AVANCE, "label": FEE_LABELS[FEE_AVANCE], "amount": remaining})
        remaining = Decimal("0")

    for alloc in allocations:
        db.add(PensionPaiement(
            tenant_id=tenant_id,
            eleve_id=payload.eleve_id,
            classe_id=payload.classe_id,
            eleve_nom=payload.eleve_nom,
            matricule=payload.matricule,
            fee_type=alloc["fee_type"],
            amount=alloc["amount"],
            payment_method=payload.payment_method,
            receipt_number=receipt,
            recorded_by=recorded_by,
            paid_online=payload.paid_online,
        ))
    db.commit()

    summary = pension_summary(db, tenant_id, payload.eleve_id, payload.classe_id)
    return {"receipt_number": receipt, "allocations": allocations, "summary": summary}


def list_pension_accounts(db: Session, tenant_id: int) -> list[dict]:
    """Cumul versé par élève et par poste (pour le suivi des paiements)."""
    rows = db.execute(
        select(
            PensionPaiement.eleve_id,
            PensionPaiement.classe_id,
            PensionPaiement.fee_type,
            func.coalesce(func.sum(PensionPaiement.amount), 0),
        )
        .where(PensionPaiement.tenant_id == tenant_id)
        .group_by(PensionPaiement.eleve_id, PensionPaiement.classe_id, PensionPaiement.fee_type)
    ).all()

    names = dict(
        db.execute(
            select(PensionPaiement.eleve_id, func.max(PensionPaiement.eleve_nom))
            .where(PensionPaiement.tenant_id == tenant_id)
            .group_by(PensionPaiement.eleve_id)
        ).all()
    )
    matricules = dict(
        db.execute(
            select(PensionPaiement.eleve_id, func.max(PensionPaiement.matricule))
            .where(PensionPaiement.tenant_id == tenant_id)
            .group_by(PensionPaiement.eleve_id)
        ).all()
    )

    acc: dict[int, dict] = {}
    field_map = {
        FEE_INSCRIPTION: "inscription_paid",
        FEE_TRANCHE_1: "tranche1_paid",
        FEE_TRANCHE_2: "tranche2_paid",
        FEE_TRANCHE_3: "tranche3_paid",
    }
    for eleve_id, classe_id, fee_type, total in rows:
        entry = acc.setdefault(eleve_id, {
            "eleve_id": eleve_id,
            "classe_id": classe_id,
            "eleve_nom": names.get(eleve_id),
            "matricule": matricules.get(eleve_id),
            "inscription_paid": Decimal("0"),
            "tranche1_paid": Decimal("0"),
            "tranche2_paid": Decimal("0"),
            "tranche3_paid": Decimal("0"),
            "total_paid": Decimal("0"),
        })
        if classe_id and not entry["classe_id"]:
            entry["classe_id"] = classe_id
        amount = Decimal(total or 0)
        entry["total_paid"] += amount
        field = field_map.get(fee_type)
        if field:
            entry[field] += amount
    return list(acc.values())


def list_pension_paiements(db: Session, tenant_id: int, eleve_id: int) -> list[PensionPaiement]:
    return list(
        db.scalars(
            select(PensionPaiement)
            .where(
                PensionPaiement.tenant_id == tenant_id,
                PensionPaiement.eleve_id == eleve_id,
            )
            .order_by(PensionPaiement.created_at.desc())
        ).all()
    )
