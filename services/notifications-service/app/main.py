"""notifications-service — multi-canal, historique, consumer d'événements (§12).

L'API expose l'historique (§12.2) et l'envoi d'annonces. Un worker en arrière-plan
consomme les événements RabbitMQ et déclenche les notifications du tableau §12.1.
"""
from fastapi import Depends, FastAPI, HTTPException, status
from sqlalchemy.orm import Session, sessionmaker

from common.db import Base, get_engine, init_engine
from common.tenant import TenantContext, require_tenant

from app import delivery
from app.config import settings
from app.models import Notification
from app.schemas import AnnouncementIn, NotificationOut
from app.worker import start_worker

app = FastAPI(title="notifications-service — SaaS Scolaire", version="0.1.0")

_SessionLocal = None


@app.on_event("startup")
def _startup() -> None:
    global _SessionLocal
    init_engine(settings.database_url)
    Base.metadata.create_all(bind=get_engine())  # Alembic en Phase 5
    _SessionLocal = sessionmaker(bind=get_engine(), future=True)
    start_worker(_SessionLocal)  # consumer RabbitMQ en tâche de fond


def get_db() -> Session:
    db = _SessionLocal()
    try:
        yield db
    finally:
        db.close()


@app.get("/health", tags=["infra"])
def health() -> dict:
    return {"status": "ok", "service": "notifications-service"}


@app.get("/notifications", response_model=list[NotificationOut], tags=["notifications"])
def history(
    event: str | None = None,
    db: Session = Depends(get_db),
    ctx: TenantContext = Depends(require_tenant),
):
    """Historique des notifications de l'école (§12.2, preuve d'envoi)."""
    q = db.query(Notification).filter(Notification.tenant_id == ctx.tenant_id)
    if event:
        q = q.filter(Notification.event == event)
    return q.order_by(Notification.created_at.desc()).limit(500).all()


@app.get("/notifications/{notification_id}", response_model=NotificationOut, tags=["notifications"])
def get_notification(
    notification_id: int,
    db: Session = Depends(get_db),
    ctx: TenantContext = Depends(require_tenant),
):
    n = (
        db.query(Notification)
        .filter(Notification.tenant_id == ctx.tenant_id, Notification.id == notification_id)
        .first()
    )
    if not n:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Notification introuvable")
    return n


@app.post("/notifications/announce", response_model=list[NotificationOut],
          status_code=status.HTTP_201_CREATED, tags=["notifications"])
def announce(
    payload: AnnouncementIn,
    db: Session = Depends(get_db),
    ctx: TenantContext = Depends(require_tenant),
):
    """Annonce générale (§12.1) — texte libre, multi-canal, historisé."""
    items = [
        {"recipient": r, "channel": c, "content": payload.content}
        for r in (payload.recipients or [None])
        for c in payload.channels
    ]
    return delivery.persist_and_send(db, ctx.tenant_id, "Announcement", items)
