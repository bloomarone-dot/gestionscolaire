"""bulletins-service — calculs (moyennes/rangs), bulletin FR/EN, export PDF (§11).

Service d'agrégation : les données viennent des autres services (REST interne) et
sont calculées à la volée. Persistance des *modèles* configurables (moteur v2) dans
``bulletins_db`` — opt-in via ``USE_BULLETIN_ENGINE_V2`` ; le PDF legacy reste
inchangé et les routes ``/bulletins/eleve|classe`` ne changent pas de contrat.
"""
from fastapi import Depends, FastAPI, File, HTTPException, UploadFile, status
from fastapi.responses import Response

from common.db import Base, get_engine, init_engine
from common.events import EventNames, EventPublisher
from common.roles import GRADES_STAFF
from common.tenant import TenantContext, require_tenant

from app import service
from app.config import settings
from app.layout_analyzer import analyze_bulletin_template
from app.pdf import render_bulletin_pdf
from app import clients
from app import models as _bulletin_models  # noqa: F401 — enregistre les tables ORM
from app.api_modeles import router as modeles_router

app = FastAPI(title="bulletins-service — SaaS Scolaire", version="0.1.0")
app.include_router(modeles_router)

_publisher: EventPublisher | None = None


@app.on_event("startup")
def _startup() -> None:
    global _publisher
    _publisher = EventPublisher(settings.rabbitmq_url, settings.events_exchange)
    # Tables moteur v2 (BulletinModele*) — create_all idempotent, comme les autres services.
    init_engine(settings.database_url)
    Base.metadata.create_all(bind=get_engine())


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


@app.post("/bulletins/template/analyze", tags=["bulletins"])
async def analyze_template(
    file: UploadFile = File(...),
    ctx: TenantContext = Depends(require_grades_staff),
):
    """Analyse un bulletin modèle (PDF/image) et détecte la présentation."""
    data = await file.read()
    if not data:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "Fichier vide")
    if len(data) > 8 * 1024 * 1024:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "Fichier trop volumineux (max 8 Mo)")
    school = clients.get_school(ctx)
    kind = school.get("establishment_kind") or "SCHOOL"
    try:
        return analyze_bulletin_template(data, file.filename or "bulletin.pdf", kind)
    except ValueError as exc:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, str(exc)) from exc


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
