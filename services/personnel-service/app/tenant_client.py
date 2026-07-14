"""Lecture des paramètres opérationnels de l'établissement (tenant-service)."""
from common.http_client import InternalClient

from app.config import settings

_client = InternalClient(
    base_url=settings.tenant_service_url,
    internal_secret=settings.internal_shared_secret,
)


def fetch_operational_settings(ctx) -> dict:
    try:
        profile = _client.get("/tenants/me", ctx=ctx)
        return profile.get("operational_settings") or {}
    except Exception:
        return {}
