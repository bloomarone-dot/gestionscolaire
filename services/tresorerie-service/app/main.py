"""tresorerie-service — paiements, échéances et reçus (phase 5)."""
from fastapi import Depends, FastAPI, HTTPException, status
from fastapi.responses import Response
from sqlalchemy.orm import Session, sessionmaker

from common.db import Base, get_engine, init_engine
from common.roles import TREASURY_STAFF
from common.tenant import TenantContext, require_tenant

from app import crud
from app.config import settings
from app.models import STATUS_PAYE
from app.pdf import render_recu_pdf
from app.schemas import PaiementCreate, PaiementEncaisser, PaiementOut, TresorerieStats

app = FastAPI(title="tresorerie-service — SaaS Scolaire", version="0.1.0")

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
