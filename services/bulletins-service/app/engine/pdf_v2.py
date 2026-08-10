"""Entrée PDF V2 — opt-in, hors routes legacy.

Pipeline :
Template + DataContext → BulletinRenderer → RenderedDocument → ReportLabAdapter → bytes
"""
from __future__ import annotations

from typing import Any, Optional, Union

from app.engine.context import BulletinDataContext
from app.engine.ir import RenderedDocument
from app.engine.preview import rendered_document_to_preview
from app.engine.renderer import BulletinRenderer, render_bulletin_document
from app.engine.reportlab_adapter import render_pdf_bytes
from app.engine.template_schema import BulletinTemplateV1


def generate_bulletin_document_v2(
    template: Union[BulletinTemplateV1, dict[str, Any]],
    context: Union[BulletinDataContext, dict[str, Any], None] = None,
) -> RenderedDocument:
    return render_bulletin_document(template, context)


def generate_bulletin_preview_v2(
    template: Union[BulletinTemplateV1, dict[str, Any]],
    context: Union[BulletinDataContext, dict[str, Any], None] = None,
) -> dict[str, Any]:
    """Preview JSON — même renderer que le PDF."""
    return BulletinRenderer().preview(template, context)


def generate_bulletin_pdf_v2(
    template: Union[BulletinTemplateV1, dict[str, Any]],
    context: Union[BulletinDataContext, dict[str, Any], None] = None,
) -> bytes:
    """Génère un PDF V2 (bytes). Non branché sur /bulletins/*/pdf legacy."""
    doc = generate_bulletin_document_v2(template, context)
    pdf = render_pdf_bytes(doc)
    if not pdf or not pdf.startswith(b"%PDF"):
        raise RuntimeError("PDF V2 invalide ou vide")
    return pdf
