"""BulletinRenderer V2 — Template + DataContext → RenderedDocument (multi-pages).

Pur (pas d'I/O réseau/DB). Indépendant de ``app.pdf`` legacy.
"""
from __future__ import annotations

from typing import Any, Optional

from app.engine.context import BulletinDataContext
from app.engine.ir import RenderedDocument
from app.engine.pagination import paginate_document
from app.engine.registry import ComponentRegistry, get_registry
from app.engine.runtime import (
    RuntimeIssue,
    build_rendered_document as _build_single_page_document,
    validate_runtime,
)
from app.engine.template_schema import BulletinTemplateV1
from app.engine.units import page_size_mm


class BulletinRenderer:
    """Orchestrateur : validation runtime → IR page 1 → pagination tableaux."""

    def __init__(self, registry: Optional[ComponentRegistry] = None):
        self.registry = registry or get_registry()

    def validate(
        self,
        template: BulletinTemplateV1 | dict[str, Any],
        context: BulletinDataContext | dict[str, Any] | None = None,
        *,
        raise_on_error: bool = True,
    ) -> list[RuntimeIssue]:
        return validate_runtime(
            template, context, registry=self.registry, raise_on_error=raise_on_error,
        )

    def render(
        self,
        template: BulletinTemplateV1 | dict[str, Any],
        context: BulletinDataContext | dict[str, Any] | None = None,
    ) -> RenderedDocument:
        doc = _build_single_page_document(template, context, registry=self.registry)
        doc = self._annotate_overflow(doc)
        return paginate_document(doc)

    def preview(
        self,
        template: BulletinTemplateV1 | dict[str, Any],
        context: BulletinDataContext | dict[str, Any] | None = None,
    ) -> dict[str, Any]:
        """Preview JSON = sérialisation du même RenderedDocument (pas un 2e moteur)."""
        from app.engine.preview import rendered_document_to_preview

        return rendered_document_to_preview(self.render(template, context))

    def _annotate_overflow(self, doc: RenderedDocument) -> RenderedDocument:
        if not doc.pages:
            return doc
        page = doc.pages[0]
        page_w, page_h = page_size_mm(page.orientation)
        margins = page.margins or {}
        warnings = list(doc.warnings or [])
        for el in page.elements:
            fr = el.frame
            right = fr.x_mm + fr.width_mm + float(margins.get("left", 0))
            bottom = fr.y_mm + fr.height_mm + float(margins.get("top", 0))
            # Frames sont en coords utiles (hors marges) dans notre IR actuelle
            if fr.x_mm < -0.5 or fr.y_mm < -0.5:
                warnings.append(
                    f"Élément « {el.id} » hors zone positive (x={fr.x_mm}, y={fr.y_mm})"
                )
            if fr.x_mm + fr.width_mm > page_w - float(margins.get("left", 0)) - float(margins.get("right", 0)) + 1:
                warnings.append(
                    f"Élément « {el.id} » déborde horizontalement de la zone utile"
                )
            usable_h = page_h - float(margins.get("top", 0)) - float(margins.get("bottom", 0))
            if fr.y_mm + fr.height_mm > usable_h + 1:
                warnings.append(
                    f"Élément « {el.id} » déborde verticalement de la zone utile "
                    f"(y+h={fr.y_mm + fr.height_mm:.1f} > {usable_h:.1f})"
                )
        return RenderedDocument(
            schema_version=doc.schema_version,
            template_name=doc.template_name,
            pages=doc.pages,
            warnings=warnings,
            metadata=doc.metadata,
        )


def render_bulletin_document(
    template: BulletinTemplateV1 | dict[str, Any],
    context: BulletinDataContext | dict[str, Any] | None = None,
) -> RenderedDocument:
    """Point d'entrée unique Template+Context → IR paginé."""
    return BulletinRenderer().render(template, context)
