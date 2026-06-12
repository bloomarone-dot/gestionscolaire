"""bulletins-service — calculs (moyennes/rangs), bulletin FR/EN, export PDF (§11).

Service d'agrégation : les données viennent des autres services (REST interne) et
sont calculées à la volée. Aucune table propre pour l'instant (persistance possible
en Phase 5 si l'archivage des bulletins est requis).
"""
from fastapi import Depends, FastAPI
from fastapi.responses import Response

from common.events import EventNames, EventPublisher
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


@app.get("/health", tags=["infra"])
def health() -> dict:
    return {"status": "ok", "service": "bulletins-service"}


@app.get("/bulletins/classe/{classe_id}", tags=["bulletins"])
def class_bulletins(
    classe_id: int,
    trimestre: int = 1,
    type_evaluation: str | None = None,
    ctx: TenantContext = Depends(require_tenant),
):
    return service.build_class_bulletins(ctx, classe_id, trimestre, type_evaluation)


@app.get("/bulletins/eleve/{eleve_id}", tags=["bulletins"])
def eleve_bulletin(
    eleve_id: int,
    trimestre: int = 1,
    type_evaluation: str | None = None,
    ctx: TenantContext = Depends(require_tenant),
):
    return service.build_eleve_bulletin(ctx, eleve_id, trimestre, type_evaluation)


@app.get("/bulletins/eleve/{eleve_id}/pdf", tags=["bulletins"])
def eleve_bulletin_pdf(
    eleve_id: int,
    trimestre: int = 1,
    type_evaluation: str | None = None,
    ctx: TenantContext = Depends(require_tenant),
):
    data = service.build_eleve_bulletin(ctx, eleve_id, trimestre, type_evaluation)
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
    ctx: TenantContext = Depends(require_tenant),
):
    """Publie le bulletin → événement BulletinPublished (notification parent §12).

    Best-effort : ne bloque jamais le parcours, même sans email parent.
    """
    data = service.build_eleve_bulletin(ctx, eleve_id, trimestre, type_evaluation)
    bulletin = data.get("bulletin") or {}
    if _publisher:
        _publisher.publish(EventNames.BULLETIN_PUBLISHED, {
            "tenant_id": ctx.tenant_id, "eleve_id": eleve_id,
            "nom": bulletin.get("nom"), "prenom": bulletin.get("prenom"),
            "classe": data.get("header", {}).get("classe"),
            "trimestre": trimestre,
        })
    return {"published": True, "eleve_id": eleve_id}
