"""Schémas API — modèles / versions / assignations de bulletin (V2)."""
from __future__ import annotations

from datetime import datetime
from typing import Any, Optional

from pydantic import BaseModel, Field


class ModeleCreateIn(BaseModel):
    name: str = Field(..., min_length=1, max_length=160)
    description: Optional[str] = None
    establishment_kind: Optional[str] = Field(default=None, max_length=30)
    definition: dict[str, Any] = Field(default_factory=dict)
    is_default: bool = False


class ModeleUpdateIn(BaseModel):
    name: Optional[str] = Field(default=None, min_length=1, max_length=160)
    description: Optional[str] = None
    establishment_kind: Optional[str] = Field(default=None, max_length=30)
    is_default: Optional[bool] = None
    # Uniquement si status=DRAFT : met à jour la définition de la version courante
    definition: Optional[dict[str, Any]] = None


class VersionCreateIn(BaseModel):
    definition: dict[str, Any]
    notes: Optional[str] = None


class AssignationCreateIn(BaseModel):
    annee_scolaire: Optional[str] = Field(default=None, max_length=20)
    classe_id: Optional[int] = None
    level_code: Optional[str] = Field(default=None, max_length=30)
    cycle_code: Optional[str] = Field(default=None, max_length=30)
    series_code: Optional[str] = Field(default=None, max_length=30)
    periode: Optional[str] = Field(default=None, max_length=20)  # "1"|"2"|"3"|"annual"|null
    priority: int = Field(default=100, ge=0, le=10_000)
    is_active: bool = True


class AssignationUpdateIn(BaseModel):
    annee_scolaire: Optional[str] = Field(default=None, max_length=20)
    classe_id: Optional[int] = None
    level_code: Optional[str] = Field(default=None, max_length=30)
    cycle_code: Optional[str] = Field(default=None, max_length=30)
    series_code: Optional[str] = Field(default=None, max_length=30)
    periode: Optional[str] = Field(default=None, max_length=20)
    priority: Optional[int] = Field(default=None, ge=0, le=10_000)
    is_active: Optional[bool] = None


class VersionOut(BaseModel):
    id: int
    modele_id: int
    tenant_id: Optional[int] = None
    version_number: int
    schema_version: int
    definition: dict[str, Any]
    notes: Optional[str] = None
    created_by: Optional[int] = None
    created_at: datetime
    model_config = {"from_attributes": True}


class ModeleOut(BaseModel):
    id: int
    tenant_id: Optional[int] = None
    name: str
    description: Optional[str] = None
    status: str
    is_default: bool
    is_system: bool
    establishment_kind: Optional[str] = None
    current_version_id: Optional[int] = None
    created_by: Optional[int] = None
    created_at: datetime
    updated_at: datetime
    model_config = {"from_attributes": True}


class ModeleDetailOut(ModeleOut):
    current_version: Optional[VersionOut] = None


class AssignationOut(BaseModel):
    id: int
    tenant_id: int
    modele_id: int
    annee_scolaire: Optional[str] = None
    classe_id: Optional[int] = None
    level_code: Optional[str] = None
    cycle_code: Optional[str] = None
    series_code: Optional[str] = None
    periode: Optional[str] = None
    priority: int
    is_active: bool
    created_at: datetime
    updated_at: datetime
    model_config = {"from_attributes": True}


class PreviewPdfIn(BaseModel):
    """Identifiants uniquement — le serveur construit le DataContext."""

    modele_id: int
    eleve_id: int
    version_id: Optional[int] = None
    trimestre: int = Field(default=1, ge=1, le=3)
    scope: str = Field(default="trimestre", pattern=r"^(trimestre|annual)$")
    type_evaluation: Optional[str] = None


class ResolveIn(BaseModel):
    annee_scolaire: Optional[str] = None
    classe_id: Optional[int] = None
    level_code: Optional[str] = None
    cycle_code: Optional[str] = None
    series_code: Optional[str] = None
    periode: Optional[str] = None
