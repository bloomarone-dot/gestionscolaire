"""Dispatch PDF bulletin : legacy vs V2 selon ``settings.use_bulletin_engine_v2``.

Quand le flag est FALSE, le chemin est strictement l'existant (``render_bulletin_pdf``).
Quand TRUE : resolve template → DataContext (depuis agrégation déjà calculée) → PDF V2.
Aucun recalcul métier.
"""
from __future__ import annotations

import io
import logging
import time
import zipfile
from typing import Any, Optional

from sqlalchemy.orm import Session, sessionmaker

from common.db import get_engine

from app import service
from app.config import settings
from app.pdf import render_bulletin_pdf
from app.crud_modeles import sanitize_zip_entry_name

logger = logging.getLogger("bulletins.pdf_dispatch")

_SessionLocal: sessionmaker | None = None


def _session() -> Session:
    global _SessionLocal
    if _SessionLocal is None:
        _SessionLocal = sessionmaker(bind=get_engine(), future=True, autoflush=False)
    return _SessionLocal()


def _periode_from_trimestre(trimestre: int, scope: str) -> Optional[str]:
    if scope == "annual":
        return "annual"
    return str(trimestre)


def _resolve_definition(
    db: Session,
    tenant_id: int,
    *,
    classe: dict | None,
    trimestre: int,
    scope: str,
    annee_scolaire: Optional[str] = None,
) -> tuple[dict[str, Any], Optional[int], Optional[int]]:
    """Retourne (definition, modele_id, version_id)."""
    from app import crud_modeles as crud

    classe = classe or {}
    modele = crud.resolve_modele(
        db,
        tenant_id,
        annee_scolaire=annee_scolaire or classe.get("annee_scolaire"),
        classe_id=classe.get("id") or classe.get("classe_id"),
        level_code=classe.get("level_code"),
        cycle_code=classe.get("cycle_code"),
        series_code=classe.get("series_code"),
        periode=_periode_from_trimestre(trimestre, scope),
    )
    if not modele:
        raise ValueError("Aucun modèle de bulletin résolu pour ce périmètre")
    definition = crud.get_definition_for_render(db, tenant_id, modele.id)
    return definition, modele.id, modele.current_version_id


def render_eleve_pdf(
    ctx,
    eleve_id: int,
    trimestre: int = 1,
    type_evaluation: Optional[str] = None,
    scope: str = "trimestre",
) -> tuple[bytes, str, dict[str, Any]]:
    """Génère le PDF d'un élève.

    Returns:
        (pdf_bytes, engine_label, meta) où engine_label est ``legacy`` ou ``v2``.
    """
    t0 = time.perf_counter()
    payload = service.build_eleve_bulletin(ctx, eleve_id, trimestre, type_evaluation, scope)
    if payload.get("error") or payload.get("bulletin") is None:
        raise ValueError(payload.get("error") or "Bulletin introuvable pour cet élève")

    if not settings.use_bulletin_engine_v2:
        pdf = render_bulletin_pdf(payload)
        meta = {
            "engine": "legacy",
            "tenant_id": ctx.tenant_id,
            "eleve_id": eleve_id,
            "duration_ms": round((time.perf_counter() - t0) * 1000, 1),
        }
        logger.info(
            "bulletin_pdf engine=legacy tenant_id=%s eleve_id=%s duration_ms=%s",
            ctx.tenant_id, eleve_id, meta["duration_ms"],
        )
        return pdf, "legacy", meta

    from app.engine.context_builder import BulletinDataContextBuilder
    from app.engine.pdf_v2 import generate_bulletin_pdf_v2

    header = payload.get("header") or {}
    classe_meta = {
        "id": header.get("classe_id"),
        "classe_id": header.get("classe_id"),
        "level_code": header.get("level_code"),
        "cycle_code": header.get("cycle_code"),
        "series_code": header.get("series_code"),
        "annee_scolaire": header.get("annee_scolaire") or header.get("annee"),
    }
    # Compléter depuis le client si manquant (sans recalcul notes)
    if not classe_meta.get("id"):
        try:
            from app import clients
            eleve = clients.get_eleve(ctx, eleve_id)
            cid = eleve.get("classe_id")
            if cid:
                classe = clients.get_classe(ctx, cid)
                classe_meta.update({
                    "id": cid,
                    "classe_id": cid,
                    "level_code": classe.get("level_code") or classe_meta.get("level_code"),
                    "cycle_code": classe.get("cycle_code") or classe_meta.get("cycle_code"),
                    "series_code": classe.get("series_code") or classe_meta.get("series_code"),
                    "annee_scolaire": classe.get("annee_scolaire") or classe_meta.get("annee_scolaire"),
                })
        except Exception:
            pass

    db = _session()
    try:
        definition, modele_id, version_id = _resolve_definition(
            db, ctx.tenant_id, classe=classe_meta, trimestre=trimestre, scope=scope,
            annee_scolaire=classe_meta.get("annee_scolaire"),
        )
        data_ctx = BulletinDataContextBuilder.from_legacy_eleve_result(payload)
        pdf = generate_bulletin_pdf_v2(definition, data_ctx)
    finally:
        db.close()

    meta = {
        "engine": "v2",
        "tenant_id": ctx.tenant_id,
        "eleve_id": eleve_id,
        "modele_id": modele_id,
        "version_id": version_id,
        "duration_ms": round((time.perf_counter() - t0) * 1000, 1),
    }
    logger.info(
        "bulletin_pdf engine=v2 tenant_id=%s eleve_id=%s modele_id=%s version_id=%s duration_ms=%s",
        ctx.tenant_id, eleve_id, modele_id, version_id, meta["duration_ms"],
    )
    return pdf, "v2", meta


def render_classe_pdf_zip(
    ctx,
    classe_id: int,
    trimestre: int = 1,
    type_evaluation: Optional[str] = None,
    scope: str = "trimestre",
) -> tuple[bytes, str, dict[str, Any]]:
    """Génère un ZIP de PDF pour toute la classe.

    Charge les données **une seule fois** via ``build_class_bulletins`` (pas de N+1 notes).
    Flag FALSE → PDF legacy par élève ; TRUE → PDF V2 (même template résolu pour la classe).
    """
    t0 = time.perf_counter()
    cls = service.build_class_bulletins(ctx, classe_id, trimestre, type_evaluation, scope)
    bulletins = cls.get("bulletins") or []
    header = cls.get("header") or {}

    buf = io.BytesIO()
    engine = "v2" if settings.use_bulletin_engine_v2 else "legacy"
    modele_id = None
    version_id = None
    definition = None
    data_builder = None

    if settings.use_bulletin_engine_v2:
        from app.engine.context_builder import BulletinDataContextBuilder
        from app.engine.pdf_v2 import generate_bulletin_pdf_v2

        data_builder = BulletinDataContextBuilder
        generate = generate_bulletin_pdf_v2
        db = _session()
        try:
            from app import clients
            classe = clients.get_classe(ctx, classe_id)
            definition, modele_id, version_id = _resolve_definition(
                db, ctx.tenant_id, classe=classe, trimestre=trimestre, scope=scope,
                annee_scolaire=classe.get("annee_scolaire") or header.get("annee"),
            )
        finally:
            db.close()

    with zipfile.ZipFile(buf, "w", compression=zipfile.ZIP_DEFLATED) as zf:
        for b in bulletins:
            eid = b.get("eleve_id")
            payload = {
                "header": header,
                "moyenne_classe": cls.get("moyenne_classe"),
                "effectif": cls.get("effectif"),
                "lang": cls.get("lang"),
                "bulletin": b,
            }
            if settings.use_bulletin_engine_v2:
                data_ctx = data_builder.from_legacy_eleve_result(payload)
                pdf = generate(definition, data_ctx)
            else:
                pdf = render_bulletin_pdf(payload)
            name = sanitize_zip_entry_name(eid, b.get("matricule"))
            zf.writestr(name, pdf)

    meta = {
        "engine": engine,
        "tenant_id": ctx.tenant_id,
        "classe_id": classe_id,
        "eleve_count": len(bulletins),
        "modele_id": modele_id,
        "version_id": version_id,
        "duration_ms": round((time.perf_counter() - t0) * 1000, 1),
    }
    logger.info(
        "bulletin_classe_pdf engine=%s tenant_id=%s classe_id=%s eleves=%s duration_ms=%s",
        engine, ctx.tenant_id, classe_id, len(bulletins), meta["duration_ms"],
    )
    return buf.getvalue(), engine, meta
