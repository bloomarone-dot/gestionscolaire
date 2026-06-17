"""Envoi best-effort + historisation des notifications (§12.2).

Les providers (SMS / WhatsApp / Email) sont des stubs : ils journalisent l'envoi
et renvoient un statut. Brancher ici Twilio / passerelle SMS / SMTP en production.
Aucun envoi ne bloque jamais un parcours métier.
"""
import logging

from sqlalchemy.orm import Session

from app.mapping import build_notifications
from app.models import STATUS_SENT, Notification

logger = logging.getLogger(__name__)


def _send_stub(channel: str, recipient: str | None, content: str) -> str:
    """Provider factice — à remplacer par les intégrations réelles."""
    logger.info("[%s] -> %s : %s", channel, recipient, content)
    return STATUS_SENT


def persist_and_send(
    db: Session, tenant_id: int, event: str, items: list[dict]
) -> list[Notification]:
    """Envoie (stub) puis historise chaque notification. Jamais bloquant."""
    saved = []
    for item in items:
        try:
            status = _send_stub(item["channel"], item.get("recipient"), item["content"])
        except Exception as exc:  # best-effort
            logger.warning("Envoi échoué : %s", exc)
            from app.models import STATUS_FAILED
            status = STATUS_FAILED
        note = Notification(
            tenant_id=tenant_id, event=event, recipient=item.get("recipient"),
            channel=item["channel"], content=item["content"], status=status,
        )
        db.add(note)
        saved.append(note)
    db.commit()
    return saved


def handle_event(
    db: Session, event: str, data: dict, enabled_channels: set[str] | None = None
) -> list[Notification]:
    """Traduit un événement (§12.1) en notifications puis les envoie/historise."""
    tenant_id = data.get("tenant_id")
    if tenant_id is None:
        logger.warning("Événement %s sans tenant_id ignoré", event)
        return []
    items = build_notifications(event, data, enabled_channels)
    return persist_and_send(db, tenant_id, event, items)
