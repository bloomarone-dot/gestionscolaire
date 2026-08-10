"""Unités et géométrie page (A4) — conversion centralisée mm ↔ points ReportLab."""
from __future__ import annotations

from typing import Literal

# 1 inch = 25.4 mm ; ReportLab : 1 inch = 72 points
MM_TO_PT = 72.0 / 25.4
PT_TO_MM = 25.4 / 72.0

A4_MM = {
    "portrait": (210.0, 297.0),
    "landscape": (297.0, 210.0),
}


def mm_to_pt(mm: float) -> float:
    return float(mm) * MM_TO_PT


def pt_to_mm(pt: float) -> float:
    return float(pt) * PT_TO_MM


def page_size_mm(orientation: Literal["portrait", "landscape"] = "portrait") -> tuple[float, float]:
    return A4_MM.get(orientation, A4_MM["portrait"])


def page_size_pt(orientation: Literal["portrait", "landscape"] = "portrait") -> tuple[float, float]:
    w, h = page_size_mm(orientation)
    return mm_to_pt(w), mm_to_pt(h)


def usable_area_mm(
    orientation: Literal["portrait", "landscape"],
    margins: dict[str, float],
) -> tuple[float, float, float, float]:
    """Retourne (x0, y0, width, height) utiles en mm (origine haut-gauche page)."""
    page_w, page_h = page_size_mm(orientation)
    left = float(margins.get("left", 10))
    right = float(margins.get("right", 10))
    top = float(margins.get("top", 10))
    bottom = float(margins.get("bottom", 10))
    return left, top, page_w - left - right, page_h - top - bottom
