"""Représentation intermédiaire (IR) — indépendante du PDF et du preview.

Pipeline cible :
Template + DataContext → runtime → RenderedDocument → (Preview | ReportLab)
"""
from __future__ import annotations

from typing import Any, Literal, Optional

from pydantic import BaseModel, Field


class RenderedFrame(BaseModel):
    x_mm: float
    y_mm: float
    width_mm: float
    height_mm: float


class RenderedElement(BaseModel):
    """Élément résolu prêt pour un backend de rendu."""

    id: str
    component_type: str
    frame: RenderedFrame
    z_index: int = 0
    visible: bool = True
    # Contenu déjà interpolé / structuré (table, champs, etc.)
    content: dict[str, Any] = Field(default_factory=dict)
    style: dict[str, Any] = Field(default_factory=dict)
    metadata: dict[str, Any] = Field(default_factory=dict)


class RenderedPage(BaseModel):
    index: int = 1
    size: Literal["A4"] = "A4"
    orientation: Literal["portrait", "landscape"] = "portrait"
    margins: dict[str, float] = Field(default_factory=dict)
    elements: list[RenderedElement] = Field(default_factory=list)


class RenderedDocument(BaseModel):
    schema_version: int = 1
    template_name: str = ""
    pages: list[RenderedPage] = Field(default_factory=list)
    warnings: list[str] = Field(default_factory=list)
    metadata: dict[str, Any] = Field(default_factory=dict)

    def to_serializable(self) -> dict[str, Any]:
        return self.model_dump(mode="json")
