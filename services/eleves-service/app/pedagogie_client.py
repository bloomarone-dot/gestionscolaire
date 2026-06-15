"""Lecture des matières activées d'une classe (héritage élève §6.2) via pedagogie-service."""
from common.http_client import InternalClient
from common.tenant import TenantContext

from app.config import settings

_client = InternalClient(
    base_url=settings.pedagogie_service_url,
    internal_secret=settings.internal_shared_secret,
)


def class_activated_subjects(ctx: TenantContext, classe_id: int) -> list[dict]:
    """Matières activées de la classe — celles dont hérite l'élève."""
    matieres = _client.get(f"/pedagogie/classes/{classe_id}/matieres", ctx=ctx)
    return [m for m in matieres if m.get("activated")]
