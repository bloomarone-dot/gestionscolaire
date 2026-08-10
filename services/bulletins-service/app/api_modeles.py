"""Routes API V2 — modèles de bulletin (sous préfixe /bulletins pour le gateway)."""
from __future__ import annotations

from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.responses import Response
from sqlalchemy.orm import Session, sessionmaker

from common.db import get_engine
from common.roles import ADMIN, DIRECTION, GRADES_STAFF, SUPERADMIN
from common.tenant import TenantContext, require_tenant

from app import crud_modeles as crud
from app import service
from app.engine.pdf_v2 import generate_bulletin_pdf_v2, generate_bulletin_preview_v2
from app.schemas_modeles import (
    AssignationCreateIn,
    AssignationOut,
    AssignationUpdateIn,
    ModeleCreateIn,
    ModeleDetailOut,
    ModeleOut,
    ModeleUpdateIn,
    PreviewPdfIn,
    ResolveIn,
    VersionCreateIn,
    VersionOut,
)

MODELE_MANAGERS = frozenset({ADMIN, DIRECTION, SUPERADMIN})

router = APIRouter(tags=["bulletins-modeles-v2"])

_SessionLocal: sessionmaker | None = None


def _session_factory() -> sessionmaker:
    global _SessionLocal
    if _SessionLocal is None:
        _SessionLocal = sessionmaker(bind=get_engine(), future=True, autoflush=False)
    return _SessionLocal


def get_db():
    db = _session_factory()()
    try:
        yield db
    finally:
        db.close()


def require_modele_manager(ctx: TenantContext = Depends(require_tenant)) -> TenantContext:
    if ctx.role not in MODELE_MANAGERS:
        raise HTTPException(
            status.HTTP_403_FORBIDDEN,
            "Gestion des modèles réservée à l'admin / direction.",
        )
    return ctx


def require_grades_staff(ctx: TenantContext = Depends(require_tenant)) -> TenantContext:
    if ctx.role not in GRADES_STAFF:
        raise HTTPException(
            status.HTTP_403_FORBIDDEN,
            "Bulletins réservés au personnel pédagogique.",
        )
    return ctx


def _http(exc: crud.ModeleError) -> HTTPException:
    return HTTPException(status_code=exc.status_code, detail=str(exc))


def _detail(db: Session, modele) -> ModeleDetailOut:
    from app.models import BulletinModeleVersion

    current = None
    if modele.current_version_id:
        try:
            v = db.get(BulletinModeleVersion, modele.current_version_id)
        except Exception:
            # Schéma obsolète (ex. published_at manquant) → migrer puis réessayer.
            crud.ensure_bulletin_schema_once(db.get_bind())
            db.rollback()
            v = db.get(BulletinModeleVersion, modele.current_version_id)
        if v:
            current = VersionOut.model_validate(v)
    base = ModeleOut.model_validate(modele)
    return ModeleDetailOut(**base.model_dump(), current_version=current)


# ── Modèles ────────────────────────────────────────────────────────────────

@router.get("/bulletins/modeles", response_model=list[ModeleOut])
def api_list_modeles(
    db: Session = Depends(get_db),
    ctx: TenantContext = Depends(require_modele_manager),
):
    crud.ensure_bulletin_schema_once(db.get_bind())
    crud.ensure_system_demo_template(db)
    return crud.list_modeles(db, ctx.tenant_id)


@router.post("/bulletins/modeles", response_model=ModeleDetailOut, status_code=201)
def api_create_modele(
    payload: ModeleCreateIn,
    db: Session = Depends(get_db),
    ctx: TenantContext = Depends(require_modele_manager),
):
    crud.ensure_bulletin_schema_once(db.get_bind())
    try:
        modele = crud.create_modele(db, ctx.tenant_id, ctx.user_id, payload)
    except crud.ModeleError as exc:
        raise _http(exc) from exc
    return _detail(db, modele)


@router.get("/bulletins/modeles/{modele_id}", response_model=ModeleDetailOut)
def api_get_modele(
    modele_id: int,
    db: Session = Depends(get_db),
    ctx: TenantContext = Depends(require_modele_manager),
):
    crud.ensure_bulletin_schema_once(db.get_bind())
    try:
        modele = crud.get_modele_for_read(db, ctx.tenant_id, modele_id)
    except crud.ModeleError as exc:
        raise _http(exc) from exc
    return _detail(db, modele)


@router.put("/bulletins/modeles/{modele_id}", response_model=ModeleDetailOut)
def api_update_modele(
    modele_id: int,
    payload: ModeleUpdateIn,
    db: Session = Depends(get_db),
    ctx: TenantContext = Depends(require_modele_manager),
):
    try:
        modele = crud.update_modele(db, ctx.tenant_id, modele_id, payload)
    except crud.ModeleError as exc:
        raise _http(exc) from exc
    return _detail(db, modele)


@router.delete("/bulletins/modeles/{modele_id}", status_code=204)
def api_delete_modele(
    modele_id: int,
    db: Session = Depends(get_db),
    ctx: TenantContext = Depends(require_modele_manager),
):
    try:
        crud.delete_modele(db, ctx.tenant_id, modele_id)
    except crud.ModeleError as exc:
        raise _http(exc) from exc
    return Response(status_code=204)


@router.post("/bulletins/modeles/{modele_id}/duplicate", response_model=ModeleDetailOut, status_code=201)
def api_duplicate_modele(
    modele_id: int,
    db: Session = Depends(get_db),
    ctx: TenantContext = Depends(require_modele_manager),
):
    try:
        modele = crud.duplicate_modele(db, ctx.tenant_id, ctx.user_id, modele_id)
    except crud.ModeleError as exc:
        raise _http(exc) from exc
    return _detail(db, modele)


@router.post("/bulletins/modeles/{modele_id}/publish", response_model=ModeleDetailOut)
def api_publish_modele(
    modele_id: int,
    version_id: Optional[int] = None,
    db: Session = Depends(get_db),
    ctx: TenantContext = Depends(require_modele_manager),
):
    try:
        modele = crud.publish_modele(db, ctx.tenant_id, modele_id, version_id=version_id)
    except crud.ModeleError as exc:
        raise _http(exc) from exc
    return _detail(db, modele)


@router.post("/bulletins/modeles/{modele_id}/archive", response_model=ModeleDetailOut)
def api_archive_modele(
    modele_id: int,
    db: Session = Depends(get_db),
    ctx: TenantContext = Depends(require_modele_manager),
):
    try:
        modele = crud.archive_modele(db, ctx.tenant_id, modele_id)
    except crud.ModeleError as exc:
        raise _http(exc) from exc
    return _detail(db, modele)


# ── Versions ───────────────────────────────────────────────────────────────

@router.get("/bulletins/modeles/{modele_id}/versions", response_model=list[VersionOut])
def api_list_versions(
    modele_id: int,
    db: Session = Depends(get_db),
    ctx: TenantContext = Depends(require_modele_manager),
):
    try:
        return crud.list_versions(db, ctx.tenant_id, modele_id)
    except crud.ModeleError as exc:
        raise _http(exc) from exc


@router.post("/bulletins/modeles/{modele_id}/versions", response_model=VersionOut, status_code=201)
def api_create_version(
    modele_id: int,
    payload: VersionCreateIn,
    db: Session = Depends(get_db),
    ctx: TenantContext = Depends(require_modele_manager),
):
    try:
        return crud.create_version(db, ctx.tenant_id, ctx.user_id, modele_id, payload)
    except crud.ModeleError as exc:
        raise _http(exc) from exc


@router.get("/bulletins/modeles/{modele_id}/versions/{version_id}", response_model=VersionOut)
def api_get_version(
    modele_id: int,
    version_id: int,
    db: Session = Depends(get_db),
    ctx: TenantContext = Depends(require_modele_manager),
):
    try:
        return crud.get_version(db, ctx.tenant_id, modele_id, version_id)
    except crud.ModeleError as exc:
        raise _http(exc) from exc


@router.put("/bulletins/modeles/{modele_id}/versions/{version_id}", response_model=VersionOut)
def api_update_version(
    modele_id: int,
    version_id: int,
    payload: VersionCreateIn,
    db: Session = Depends(get_db),
    ctx: TenantContext = Depends(require_modele_manager),
):
    try:
        return crud.update_version_definition(
            db, ctx.tenant_id, modele_id, version_id, payload.definition,
        )
    except crud.ModeleError as exc:
        raise _http(exc) from exc


# ── Assignations ───────────────────────────────────────────────────────────

@router.get("/bulletins/modeles/{modele_id}/assignations", response_model=list[AssignationOut])
def api_list_assignations(
    modele_id: int,
    db: Session = Depends(get_db),
    ctx: TenantContext = Depends(require_modele_manager),
):
    try:
        return crud.list_assignations(db, ctx.tenant_id, modele_id)
    except crud.ModeleError as exc:
        raise _http(exc) from exc


@router.post("/bulletins/modeles/{modele_id}/assignations", response_model=AssignationOut, status_code=201)
def api_create_assignation(
    modele_id: int,
    payload: AssignationCreateIn,
    db: Session = Depends(get_db),
    ctx: TenantContext = Depends(require_modele_manager),
):
    try:
        return crud.create_assignation(db, ctx.tenant_id, modele_id, payload)
    except crud.ModeleError as exc:
        raise _http(exc) from exc


@router.put(
    "/bulletins/modeles/{modele_id}/assignations/{assignation_id}",
    response_model=AssignationOut,
)
def api_update_assignation(
    modele_id: int,
    assignation_id: int,
    payload: AssignationUpdateIn,
    db: Session = Depends(get_db),
    ctx: TenantContext = Depends(require_modele_manager),
):
    try:
        return crud.update_assignation(db, ctx.tenant_id, modele_id, assignation_id, payload)
    except crud.ModeleError as exc:
        raise _http(exc) from exc


@router.delete("/bulletins/modeles/{modele_id}/assignations/{assignation_id}", status_code=204)
def api_delete_assignation(
    modele_id: int,
    assignation_id: int,
    db: Session = Depends(get_db),
    ctx: TenantContext = Depends(require_modele_manager),
):
    try:
        crud.delete_assignation(db, ctx.tenant_id, modele_id, assignation_id)
    except crud.ModeleError as exc:
        raise _http(exc) from exc
    return Response(status_code=204)


@router.get("/bulletins/v2/catalog")
def api_catalog_v2(
    ctx: TenantContext = Depends(require_modele_manager),
):
    """Catalogue éditeur : composants registry + variables whitelist (source backend)."""
    from app.engine.registry import get_registry
    from app.engine.variables import ALLOWED_ROW_BIND_PREFIXES, list_catalog

    _ = ctx
    registry = get_registry()
    components = []
    for definition in registry.list():
        try:
            defaults = definition.props_model.model_construct().model_dump(mode="json")
        except Exception:
            defaults = {}
        components.append({
            "type": definition.type,
            "category": definition.category,
            "description": definition.description,
            "required_context_roots": sorted(definition.required_context_roots),
            "default_props": defaults,
        })
    from app.engine.starter_templates import list_starters_for_catalog

    return {
        "schema_version": 1,
        "page_sizes": ["A4"],
        "orientations": ["portrait", "landscape"],
        "components": components,
        "variables": list_catalog(),
        "row_bind_prefixes": list(ALLOWED_ROW_BIND_PREFIXES),
        "categories": [
            {"id": "structure", "label": "Structure"},
            {"id": "content", "label": "Contenu"},
            {"id": "layout", "label": "Mise en page"},
            {"id": "design", "label": "Design"},
            {"id": "school", "label": "Établissement"},
            {"id": "student", "label": "Élève"},
            {"id": "academic", "label": "Scolaire"},
            {"id": "summary", "label": "Résumé"},
            {"id": "signature", "label": "Signatures"},
            {"id": "other", "label": "Autres"},
        ],
        # Starters système (immuables) — définitions pour deep copy à la création.
        "starters": list_starters_for_catalog(include_definitions=True),
    }


@router.post("/bulletins/v2/resolve", response_model=ModeleOut)
def api_resolve_modele(
    payload: ResolveIn,
    db: Session = Depends(get_db),
    ctx: TenantContext = Depends(require_modele_manager),
):
    try:
        modele = crud.resolve_modele(db, ctx.tenant_id, **payload.model_dump())
    except crud.ModeleError as exc:
        raise _http(exc) from exc
    if not modele:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Aucun modèle résolu pour ce périmètre")
    return modele


# ── Preview / PDF V2 ──────────────────────────────────────────────────────

@router.post("/bulletins/v2/preview")
def api_preview_v2(
    payload: PreviewPdfIn,
    db: Session = Depends(get_db),
    ctx: TenantContext = Depends(require_grades_staff),
):
    try:
        definition = crud.get_definition_for_render(
            db, ctx.tenant_id, payload.modele_id, payload.version_id,
        )
        data_ctx = service.build_eleve_data_context(
            ctx, payload.eleve_id, payload.trimestre, payload.type_evaluation, payload.scope,
        )
        return generate_bulletin_preview_v2(definition, data_ctx)
    except crud.ModeleError as exc:
        raise _http(exc) from exc
    except ValueError as exc:
        raise HTTPException(status.HTTP_404_NOT_FOUND, str(exc)) from exc
    except Exception as exc:
        # Erreurs clients internes (élève autre tenant, etc.)
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Ressource introuvable") from exc


@router.post("/bulletins/v2/pdf")
def api_pdf_v2(
    payload: PreviewPdfIn,
    db: Session = Depends(get_db),
    ctx: TenantContext = Depends(require_grades_staff),
):
    try:
        definition = crud.get_definition_for_render(
            db, ctx.tenant_id, payload.modele_id, payload.version_id,
        )
        data_ctx = service.build_eleve_data_context(
            ctx, payload.eleve_id, payload.trimestre, payload.type_evaluation, payload.scope,
        )
        pdf = generate_bulletin_pdf_v2(definition, data_ctx)
    except crud.ModeleError as exc:
        raise _http(exc) from exc
    except ValueError as exc:
        raise HTTPException(status.HTTP_404_NOT_FOUND, str(exc)) from exc
    except Exception as exc:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Ressource introuvable") from exc
    return Response(
        content=pdf,
        media_type="application/pdf",
        headers={"Content-Disposition": f'inline; filename="bulletin_v2_{payload.eleve_id}.pdf"'},
    )
