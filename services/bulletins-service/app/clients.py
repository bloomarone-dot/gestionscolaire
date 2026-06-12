"""Agrégation des données du bulletin depuis les autres services (REST interne)."""
from common.http_client import InternalClient
from common.tenant import TenantContext

from app.config import settings

_eleves = InternalClient(settings.eleves_service_url, settings.internal_shared_secret)
_pedagogie = InternalClient(settings.pedagogie_service_url, settings.internal_shared_secret)
_evaluations = InternalClient(settings.evaluations_service_url, settings.internal_shared_secret)
_tenant = InternalClient(settings.tenant_service_url, settings.internal_shared_secret)


def get_classe(ctx: TenantContext, classe_id: int) -> dict:
    return _pedagogie.get(f"/pedagogie/classes/{classe_id}", ctx=ctx)


def get_students(ctx: TenantContext, classe_id: int) -> list[dict]:
    return _eleves.get("/eleves", ctx=ctx, params={"classe_id": classe_id})


def get_eleve(ctx: TenantContext, eleve_id: int) -> dict:
    return _eleves.get(f"/eleves/{eleve_id}", ctx=ctx)


def get_notes(ctx: TenantContext, classe_id: int, trimestre: int, type_evaluation: str | None) -> list[dict]:
    params = {"classe_id": classe_id, "trimestre": trimestre}
    if type_evaluation:
        params["type_evaluation"] = type_evaluation
    return _evaluations.get("/evaluations/notes", ctx=ctx, params=params)


def get_school(ctx: TenantContext) -> dict:
    return _tenant.get("/tenants/me", ctx=ctx)
