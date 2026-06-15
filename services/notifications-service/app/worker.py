"""Consumer RabbitMQ : transforme les événements métier en notifications (§12).

Lancé dans un thread au démarrage du service. Best-effort : si le broker est
indisponible, on journalise et on réessaie sans faire tomber l'API.
"""
import logging
import threading
import time

from common.events import EventNames
from common.http_client import InternalClient
from common.tenant import TenantContext

from app.config import settings
from app.delivery import handle_event

logger = logging.getLogger(__name__)

ROUTING_KEYS = [
    EventNames.STUDENT_ENROLLED,
    EventNames.BULLETIN_PUBLISHED,
    EventNames.TEACHER_ASSIGNED,
    EventNames.CLASS_SUBJECTS_UPDATED,
    EventNames.STUDENT_TRANSFERRED,
    EventNames.STUDENT_PROMOTED,
]

_tenant_client = InternalClient(settings.tenant_service_url, settings.internal_shared_secret)


def _enabled_channels(tenant_id: int) -> set[str] | None:
    """Canaux activés par l'école (§12.2) ; None si indéterminé (→ pas de filtre)."""
    try:
        ctx = TenantContext(user_id=0, role="superadmin", tenant_id=tenant_id)
        school = _tenant_client.get(f"/tenants/schools/{tenant_id}", ctx=ctx)
        return set(school.get("channels", [])) or None
    except Exception as exc:
        logger.warning("Canaux école %s indéterminés : %s", tenant_id, exc)
        return None


def _make_handler(session_factory):
    def handler(event: str, data: dict) -> None:
        db = session_factory()
        try:
            enabled = _enabled_channels(data.get("tenant_id")) if data.get("tenant_id") else None
            handle_event(db, event, data, enabled)
        finally:
            db.close()
    return handler


def start_worker(session_factory) -> threading.Thread:
    """Démarre la boucle de consommation dans un thread démon."""
    from common.events import consume

    def _run():
        handler = _make_handler(session_factory)
        while True:
            try:
                consume(settings.rabbitmq_url, settings.notifications_queue, ROUTING_KEYS, handler)
            except Exception as exc:
                logger.warning("Consumer interrompu (%s) — nouvelle tentative dans 5s", exc)
                time.sleep(5)

    thread = threading.Thread(target=_run, name="notif-worker", daemon=True)
    thread.start()
    return thread
