"""Clients inter-services pour le moteur de progression."""
from common.http_client import InternalClient
from common.tenant import TenantContext

from app.config import settings

_bulletins = InternalClient(settings.bulletins_service_url, settings.internal_shared_secret)
_eleves = InternalClient(settings.eleves_service_url, settings.internal_shared_secret)
_pedagogie = InternalClient(settings.pedagogie_service_url, settings.internal_shared_secret)


def get_students(ctx: TenantContext, classe_id: int) -> list[dict]:
    return _eleves.get("/eleves", ctx=ctx, params={"classe_id": classe_id})


def get_classe(ctx: TenantContext, classe_id: int) -> dict:
    return _pedagogie.get(f"/pedagogie/classes/{classe_id}", ctx=ctx)


def get_classes(ctx: TenantContext) -> list[dict]:
    return _pedagogie.get("/pedagogie/classes", ctx=ctx)


def get_active_year(ctx: TenantContext) -> dict | None:
    years = _pedagogie.get("/pedagogie/annees-scolaires", ctx=ctx)
    for y in years or []:
        if y.get("is_active"):
            return y
    return years[0] if years else None


def get_class_bulletin(ctx: TenantContext, classe_id: int) -> dict:
    return _bulletins.get(
        f"/bulletins/classe/{classe_id}",
        ctx=ctx,
        params={"scope": "annual", "trimestre": 3},
    )


def apply_promotions(ctx: TenantContext, payload: dict) -> dict:
    return _eleves.post("/eleves/promotions/apply", ctx=ctx, json=payload)
