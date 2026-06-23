"""bulletins-service — calculs (moyennes/rangs), bulletin FR/EN, export PDF (§11).

Service d'agrégation : les données viennent des autres services (REST interne) et
sont calculées à la volée. Aucune table propre pour l'instant (persistance possible
en Phase 5 si l'archivage des bulletins est requis).
"""
from fastapi import Depends, FastAPI, HTTPException, status
from fastapi.responses import Response

from common.events import EventNames, EventPublisher
from common.roles import GRADES_STAFF
from common.tenant import TenantContext, require_tenant

from app import service
from app.config import settings
from app.pdf import render_bulletin_pdf

app = FastAPI(title="bulletins-service — SaaS Scolaire", version="0.1.0")

_publisher: EventPublisher | None = None


@app.on_event("startup")
def _startup() -> None:
    global _publisher
    _publisher = EventPublisher(settings.rabbitmq_url, settings.events_exchange)


def require_grades_staff(ctx: TenantContext = Depends(require_tenant)) -> TenantContext:
    if ctx.role not in GRADES_STAFF:
        raise HTTPException(status.HTTP_403_FORBIDDEN, "Bulletins réservés au personnel pédagogique.")
    return ctx


@app.get("/health", tags=["infra"])
def health() -> dict:
    return {"status": "ok", "service": "bulletins-service"}


def _ensure_bulletin(data: dict) -> dict:
    if data.get("error"):
        raise HTTPException(status_code=404, detail=data["error"])
    if data.get("bulletin") is None:
        raise HTTPException(status_code=404, detail="Bulletin introuvable pour cet élève")
    return data


@app.get("/bulletins/classe/{classe_id}", tags=["bulletins"])
def class_bulletins(
    classe_id: int,
    trimestre: int = 1,
    type_evaluation: str | None = None,
    scope: str = "trimestre",
    ctx: TenantContext = Depends(require_grades_staff),
):
    return service.build_class_bulletins(ctx, classe_id, trimestre, type_evaluation, scope)


@app.get("/bulletins/eleve/{eleve_id}", tags=["bulletins"])
def eleve_bulletin(
    eleve_id: int,
    trimestre: int = 1,
    type_evaluation: str | None = None,
    scope: str = "trimestre",
    ctx: TenantContext = Depends(require_grades_staff),
):
    return _ensure_bulletin(
        service.build_eleve_bulletin(ctx, eleve_id, trimestre, type_evaluation, scope),
    )


@app.get("/bulletins/eleve/{eleve_id}/pdf", tags=["bulletins"])
def eleve_bulletin_pdf(
    eleve_id: int,
    trimestre: int = 1,
    type_evaluation: str | None = None,
    scope: str = "trimestre",
    ctx: TenantContext = Depends(require_grades_staff),
):
    data = _ensure_bulletin(
        service.build_eleve_bulletin(ctx, eleve_id, trimestre, type_evaluation, scope),
    )
    pdf = render_bulletin_pdf(data)
    return Response(
        content=pdf, media_type="application/pdf",
        headers={"Content-Disposition": f'inline; filename="bulletin_{eleve_id}.pdf"'},
    )


@app.post("/bulletins/eleve/{eleve_id}/publish", tags=["bulletins"])
def publish_bulletin(
    eleve_id: int,
    trimestre: int = 1,
    type_evaluation: str | None = None,
    scope: str = "trimestre",
    ctx: TenantContext = Depends(require_grades_staff),
):
    """Publie le bulletin → événement BulletinPublished (notification parent §12).

    Best-effort : ne bloque jamais le parcours, même sans email parent.
    """
    data = _ensure_bulletin(
        service.build_eleve_bulletin(ctx, eleve_id, trimestre, type_evaluation, scope),
    )
    bulletin = data.get("bulletin") or {}
    if _publisher:
        _publisher.publish(EventNames.BULLETIN_PUBLISHED, {
            "tenant_id": ctx.tenant_id, "eleve_id": eleve_id,
            "nom": bulletin.get("nom"), "prenom": bulletin.get("prenom"),
            "classe": data.get("header", {}).get("classe"),
            "trimestre": trimestre,
        })
    return {"published": True, "eleve_id": eleve_id}
