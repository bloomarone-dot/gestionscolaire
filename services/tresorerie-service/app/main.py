"""tresorerie-service — paiements, échéances et reçus (phase 5)."""
import os

from fastapi import Depends, FastAPI, HTTPException, Request, status
from fastapi.responses import Response
from sqlalchemy.orm import Session, sessionmaker

from common.db import Base, add_missing_columns, get_engine, init_engine
from common.roles import TREASURY_STAFF
from common.tenant import TenantContext, require_tenant

from app import crud
from app.config import settings
from app.models import STATUS_PAYE
from app.pdf import render_recu_pdf
from app.schemas import (
    FeeScheduleIn,
    FeeScheduleOut,
    ParentLinkOut,
    ParentPayInit,
    ParentPayInitOut,
    PaiementCreate,
    PaiementEncaisser,
    PaiementOut,
    PensionAccountOut,
    PensionPayIn,
    PensionPayResult,
    PensionSummaryOut,
    PublicPaiementOut,
    RetraitCreate,
    RetraitOut,
    TresorerieStats,
)

app = FastAPI(title="tresorerie-service — SaaS Scolaire", version="0.1.0")

_SessionLocal = None


@app.on_event("startup")
def _startup() -> None:
    global _SessionLocal
    init_engine(settings.database_url)
    Base.metadata.create_all(bind=get_engine())
    add_missing_columns("paiements", {
        "payment_token": "VARCHAR(64)",
        "parent_phone": "VARCHAR(20)",
        "mobile_provider": "VARCHAR(20)",
        "provider_reference": "VARCHAR(64)",
        "paid_online": "BOOLEAN DEFAULT FALSE",
        "pay_token": "VARCHAR(64)",
    })
    add_missing_columns("fee_schedules", {"classe_nom": "VARCHAR(120)"})
    _SessionLocal = sessionmaker(bind=get_engine(), future=True)


def get_db() -> Session:
    db = _SessionLocal()
    try:
        yield db
    finally:
        db.close()


def require_treasury_staff(ctx: TenantContext = Depends(require_tenant)) -> TenantContext:
    if ctx.role not in TREASURY_STAFF:
        raise HTTPException(status.HTTP_403_FORBIDDEN, "Trésorerie réservée au personnel autorisé.")
    return ctx


@app.get("/health", tags=["infra"])
def health() -> dict:
    return {"status": "ok", "service": "tresorerie-service"}


@app.get("/tresorerie/paiements", response_model=list[PaiementOut], tags=["tresorerie"])
def list_paiements(
    eleve_id: int | None = None,
    status: str | None = None,
    db: Session = Depends(get_db),
    ctx: TenantContext = Depends(require_treasury_staff),
):
    return crud.list_paiements(db, ctx.tenant_id, eleve_id=eleve_id, status=status)


@app.post(
    "/tresorerie/paiements",
    response_model=PaiementOut,
    status_code=status.HTTP_201_CREATED,
    tags=["tresorerie"],
)
def create_paiement(
    payload: PaiementCreate,
    db: Session = Depends(get_db),
    ctx: TenantContext = Depends(require_treasury_staff),
):
    return crud.create_paiement(db, ctx.tenant_id, payload, ctx.user_id)


@app.post("/tresorerie/paiements/{paiement_id}/encaisser", response_model=PaiementOut, tags=["tresorerie"])
def encaisser_paiement(
    paiement_id: int,
    payload: PaiementEncaisser,
    db: Session = Depends(get_db),
    ctx: TenantContext = Depends(require_treasury_staff),
):
    try:
        return crud.encaisser_paiement(db, ctx.tenant_id, paiement_id, payload, ctx.user_id)
    except LookupError:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Paiement introuvable") from None
    except ValueError as exc:
        raise HTTPException(status.HTTP_409_CONFLICT, str(exc)) from exc


@app.post("/tresorerie/paiements/{paiement_id}/annuler", response_model=PaiementOut, tags=["tresorerie"])
def annuler_paiement(
    paiement_id: int,
    db: Session = Depends(get_db),
    ctx: TenantContext = Depends(require_treasury_staff),
):
    try:
        return crud.annuler_paiement(db, ctx.tenant_id, paiement_id)
    except LookupError:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Paiement introuvable") from None
    except ValueError as exc:
        raise HTTPException(status.HTTP_409_CONFLICT, str(exc)) from exc


@app.get("/tresorerie/paiements/{paiement_id}/recu.pdf", tags=["tresorerie"])
def recu_pdf(
    paiement_id: int,
    establishment_name: str = "Établissement",
    db: Session = Depends(get_db),
    ctx: TenantContext = Depends(require_treasury_staff),
):
    row = crud.get_paiement(db, ctx.tenant_id, paiement_id)
    if not row:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Paiement introuvable")
    if row.status != STATUS_PAYE:
        raise HTTPException(status.HTTP_409_CONFLICT, "Reçu disponible uniquement pour un paiement encaissé")
    pdf = render_recu_pdf(row, establishment_name=establishment_name)
    filename = f"{row.receipt_number or f'recu_{paiement_id}'}.pdf"
    return Response(
        content=pdf,
        media_type="application/pdf",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )


@app.get("/tresorerie/stats", response_model=TresorerieStats, tags=["tresorerie"])
def tresorerie_stats(
    db: Session = Depends(get_db),
    ctx: TenantContext = Depends(require_treasury_staff),
):
    return crud.stats(db, ctx.tenant_id)


@app.get("/tresorerie/retraits", response_model=list[RetraitOut], tags=["tresorerie"])
def list_retraits(
    db: Session = Depends(get_db),
    ctx: TenantContext = Depends(require_treasury_staff),
):
    return crud.list_retraits(db, ctx.tenant_id)


@app.post(
    "/tresorerie/retraits",
    response_model=RetraitOut,
    status_code=status.HTTP_201_CREATED,
    tags=["tresorerie"],
)
def create_retrait(
    payload: RetraitCreate,
    db: Session = Depends(get_db),
    ctx: TenantContext = Depends(require_treasury_staff),
):
    """Enregistre un retrait — le solde caisse est recalculé automatiquement."""
    return crud.create_retrait(db, ctx.tenant_id, payload, recorded_by=ctx.user_id)


@app.get("/tresorerie/fees", response_model=list[FeeScheduleOut], tags=["tresorerie"])
def list_fees(
    db: Session = Depends(get_db),
    ctx: TenantContext = Depends(require_treasury_staff),
):
    return crud.list_fee_schedules(db, ctx.tenant_id)


@app.put("/tresorerie/fees/{classe_id}", response_model=FeeScheduleOut, tags=["tresorerie"])
def upsert_fee(
    classe_id: int,
    payload: FeeScheduleIn,
    db: Session = Depends(get_db),
    ctx: TenantContext = Depends(require_treasury_staff),
):
    """Configure les frais d'une classe : inscription + montant des 3 tranches."""
    return crud.upsert_fee_schedule(db, ctx.tenant_id, classe_id, payload)


@app.get(
    "/tresorerie/pension/{eleve_id}/resume",
    response_model=PensionSummaryOut,
    tags=["tresorerie"],
)
def pension_resume(
    eleve_id: int,
    classe_id: int | None = None,
    db: Session = Depends(get_db),
    ctx: TenantContext = Depends(require_treasury_staff),
):
    """Détail scolarité d'un élève : dû / versé / reste à payer par poste."""
    return crud.pension_summary(db, ctx.tenant_id, eleve_id, classe_id)


@app.post(
    "/tresorerie/pension/payer",
    response_model=PensionPayResult,
    tags=["tresorerie"],
)
def pension_payer(
    payload: PensionPayIn,
    db: Session = Depends(get_db),
    ctx: TenantContext = Depends(require_treasury_staff),
):
    """Enregistre un versement — affectation automatique et calcul du reste."""
    return crud.record_pension_payment(db, ctx.tenant_id, payload, recorded_by=ctx.user_id)


@app.get(
    "/tresorerie/pension/comptes",
    response_model=list[PensionAccountOut],
    tags=["tresorerie"],
)
def pension_comptes(
    db: Session = Depends(get_db),
    ctx: TenantContext = Depends(require_treasury_staff),
):
    """Cumul versé par élève (base du suivi des paiements)."""
    return crud.list_pension_accounts(db, ctx.tenant_id)


def _public_paiement(row) -> PublicPaiementOut:
    student = " ".join(filter(None, [row.eleve_prenom, row.eleve_nom])) or f"Élève #{row.eleve_id}"
    return PublicPaiementOut(
        student=student,
        matricule=row.matricule,
        label=row.label,
        amount=row.amount,
        currency=row.currency or "XAF",
        due_date=row.due_date,
        status=row.status,
        paid_at=row.paid_at,
        receipt_number=row.receipt_number,
    )


@app.post(
    "/tresorerie/paiements/{paiement_id}/lien-parent",
    response_model=ParentLinkOut,
    tags=["tresorerie"],
)
def generer_lien_parent(
    paiement_id: int,
    db: Session = Depends(get_db),
    ctx: TenantContext = Depends(require_treasury_staff),
):
    """Génère un lien sécurisé à envoyer au parent (WhatsApp / SMS)."""
    try:
        row = crud.ensure_payment_token(db, ctx.tenant_id, paiement_id)
    except LookupError:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Paiement introuvable") from None
    base = os.getenv("PUBLIC_APP_URL", "http://localhost:5173")
    url = f"{base.rstrip('/')}/payer/{row.payment_token}"
    return ParentLinkOut(payment_token=row.payment_token, payment_url=url)


@app.get("/tresorerie/public/paiements/{token}", response_model=PublicPaiementOut, tags=["tresorerie-public"])
def public_paiement_info(token: str, db: Session = Depends(get_db)):
    row = crud.get_paiement_by_token(db, token)
    if not row:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Lien invalide")
    return _public_paiement(row)


@app.post(
    "/tresorerie/public/paiements/{token}/initier",
    response_model=ParentPayInitOut,
    tags=["tresorerie-public"],
)
def public_initier_paiement(
    token: str,
    payload: ParentPayInit,
    db: Session = Depends(get_db),
):
    base = os.getenv("PUBLIC_APP_URL", "http://localhost:5173")
    return_url = f"{base.rstrip('/')}/payer/{token}"
    try:
        _, checkout = crud.initiate_parent_payment(db, token, payload, return_url=return_url)
    except LookupError:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Lien invalide") from None
    except ValueError as exc:
        raise HTTPException(status.HTTP_409_CONFLICT, str(exc)) from exc
    return ParentPayInitOut(**checkout)


@app.post(
    "/tresorerie/public/paiements/{token}/confirmer",
    response_model=PublicPaiementOut,
    tags=["tresorerie-public"],
)
def public_confirmer_paiement(token: str, db: Session = Depends(get_db)):
    """Confirmation sandbox ou vérification statut Orange Money."""
    from app.mobile_pay import is_sandbox

    row = crud.get_paiement_by_token(db, token)
    if not row:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Lien invalide") from None

    if not is_sandbox() and row.pay_token:
        try:
            row = crud.try_confirm_orange_payment(db, row)
        except Exception as exc:
            raise HTTPException(status.HTTP_502_BAD_GATEWAY, f"Orange Money : {exc}") from exc
        if row.status == STATUS_PAYE:
            return _public_paiement(row)
        raise HTTPException(status.HTTP_409_CONFLICT, "Paiement encore en attente sur Orange Money.")

    if not is_sandbox():
        raise HTTPException(
            status.HTTP_403_FORBIDDEN,
            "Confirmation manuelle désactivée — le paiement est validé par l'opérateur.",
        )
    try:
        row = crud.confirm_parent_payment(db, token)
    except LookupError:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Lien invalide") from None
    except ValueError as exc:
        raise HTTPException(status.HTTP_409_CONFLICT, str(exc)) from exc
    return _public_paiement(row)


@app.post("/tresorerie/webhooks/orange-money", tags=["tresorerie-webhooks"])
async def orange_money_webhook(request: Request, db: Session = Depends(get_db)):
    """Notification asynchrone Orange Money (notifUrl)."""
    body = await request.json()
    pay_token = (
        body.get("payToken")
        or body.get("pay_token")
        or (body.get("data") or {}).get("payToken")
    )
    if not pay_token:
        return {"status": "ignored", "reason": "payToken absent"}

    row = crud.get_paiement_by_pay_token(db, pay_token)
    if not row:
        return {"status": "ignored", "reason": "paiement inconnu"}

    from app.orange_money import is_success_status
    if is_success_status(body):
        crud.confirm_parent_payment(db, row.payment_token, provider_ref=pay_token)
        return {"status": "confirmed"}

    row = crud.try_confirm_orange_payment(db, row)
    return {"status": "paid" if row.status == STATUS_PAYE else "pending"}


@app.get("/tresorerie/public/paiements/{token}/recu.pdf", tags=["tresorerie-public"])
def public_recu_pdf(token: str, db: Session = Depends(get_db)):
    row = crud.get_paiement_by_token(db, token)
    if not row or row.status != STATUS_PAYE:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Reçu indisponible")
    pdf = render_recu_pdf(row)
    filename = f"{row.receipt_number or 'recu'}.pdf"
    return Response(
        content=pdf,
        media_type="application/pdf",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )
