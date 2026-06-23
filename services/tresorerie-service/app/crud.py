from datetime import date, datetime
from decimal import Decimal

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.models import Paiement, STATUS_ANNULE, STATUS_EN_ATTENTE, STATUS_PAYE
from app.schemas import PaiementCreate, PaiementEncaisser


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
    return {
        "pending_count": int(pending[0] or 0),
        "pending_amount": Decimal(pending[1] or 0),
        "paid_month_count": int(paid_month[0] or 0),
        "paid_month_amount": Decimal(paid_month[1] or 0),
    }
