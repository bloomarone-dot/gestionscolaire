"""Lecture des matières activées d'une classe (héritage élève §6.2) via pedagogie-service."""
from common.http_client import InternalClient
from common.tenant import TenantContext

from app.config import settings

_client = InternalClient(
    base_url=settings.pedagogie_service_url,
    internal_secret=settings.internal_shared_secret,
)


def list_classes(ctx: TenantContext) -> list[dict]:
    return _client.get("/pedagogie/classes", ctx=ctx)


def class_name_lookup(classes: list[dict]) -> dict[str, int]:
    """Nom personnalisé (insensible à la casse) → id de classe."""
    out: dict[str, int] = {}
    for c in classes:
        name = (c.get("nom_personnalise") or c.get("nom") or "").strip().lower()
        if name:
            out[name] = c["id"]
    return out


def class_id_to_name(classes: list[dict]) -> dict[int, str]:
    return {
        c["id"]: (c.get("nom_personnalise") or c.get("nom") or str(c["id"]))
        for c in classes
    }


def find_class(classes: list[dict], classe_id: int) -> dict | None:
    return next((c for c in classes if c.get("id") == classe_id), None)


def section_label(subsystem_code: str | None) -> str | None:
    if subsystem_code == "ANGLOPHONE":
        return "Anglophone"
    if subsystem_code == "FRANCOPHONE":
        return "Francophone"
    return None


def class_activated_subjects(ctx: TenantContext, classe_id: int) -> list[dict]:
    """Matières activées de la classe — celles dont hérite l'élève."""
    matieres = _client.get(f"/pedagogie/classes/{classe_id}/matieres", ctx=ctx)
    return [m for m in matieres if m.get("activated")]
