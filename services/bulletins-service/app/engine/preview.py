"""Preview layout — même RenderedDocument que le PDF (sérialisation JSON)."""
from __future__ import annotations

from typing import Any

from app.engine.ir import RenderedDocument
from app.engine.units import mm_to_pt, page_size_mm, page_size_pt


def rendered_document_to_preview(doc: RenderedDocument) -> dict[str, Any]:
    """Structure consommable par une UI future (canvas) sans second moteur."""
    payload = doc.to_serializable()
    pages_out = []
    for page in doc.pages:
        w_mm, h_mm = page_size_mm(page.orientation)
        w_pt, h_pt = page_size_pt(page.orientation)
        pages_out.append({
            **page.model_dump(mode="json"),
            "geometry": {
                "width_mm": w_mm,
                "height_mm": h_mm,
                "width_pt": w_pt,
                "height_pt": h_pt,
                "unit": "mm",
            },
        })
    return {
        "kind": "bulletin_preview_v2",
        "template_name": doc.template_name,
        "page_count": len(doc.pages),
        "warnings": list(doc.warnings or []),
        "metadata": dict(doc.metadata or {}),
        "pages": pages_out,
        "conversion": {"mm_to_pt": mm_to_pt(1.0)},
    }
