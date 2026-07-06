from datetime import datetime
from typing import Any, Dict, List, Optional

from pydantic import BaseModel, Field, field_validator

from common.establishment import (
    ESTABLISHMENT_KIND_LANGUAGE_CENTER,
    ESTABLISHMENT_KIND_SCHOOL,
    normalize_establishment_kind,
)

INTERNAL_CHANNEL = "INTERNAL"


class AppreciationBand(BaseModel):
    min: float = Field(ge=0, le=20)
    label: str = Field(min_length=1, max_length=40)


class AppreciationScales(BaseModel):
    fr: List[AppreciationBand] = Field(default_factory=list)
    en: List[AppreciationBand] = Field(default_factory=list)


class SchoolCreate(BaseModel):
    name: str
    code: Optional[str] = None
    city: Optional[str] = None
    address: Optional[str] = None
    phone: Optional[str] = None
    establishment_kind: str = ESTABLISHMENT_KIND_SCHOOL
    # Profil pédagogique actif (filtre amont §14) — défaut selon establishment_kind si vide
    subsystems: List[str] = []
    teaching_types: List[str] = []
    channels: List[str] = []

    @field_validator("establishment_kind")
    @classmethod
    def _kind(cls, value: str) -> str:
        return normalize_establishment_kind(value)


class SchoolUpdate(BaseModel):
    name: Optional[str] = None
    city: Optional[str] = None
    address: Optional[str] = None
    phone: Optional[str] = None
    establishment_kind: Optional[str] = None
    logo_url: Optional[str] = None
    primary_color: Optional[str] = None
    secondary_color: Optional[str] = None
    bulletin_po_box: Optional[str] = None
    bulletin_motto: Optional[str] = None
    bulletin_delegation_regional: Optional[str] = None
    bulletin_delegation_departementale: Optional[str] = None
    bulletin_next_term_note: Optional[str] = None
    bulletin_appreciation_scales: Optional[Dict[str, List[AppreciationBand]]] = None
    bulletin_theme: Optional[Dict[str, Any]] = None
    bulletin_layout_profile: Optional[Dict[str, Any]] = None
    bulletin_reference_url: Optional[str] = None
    is_active: Optional[bool] = None

    @field_validator("establishment_kind")
    @classmethod
    def _kind(cls, value: Optional[str]) -> Optional[str]:
        if value is None:
            return None
        return normalize_establishment_kind(value)

class ProfileUpdate(BaseModel):
    """Mise à jour du filtre amont (§14) et des canaux (§12.2)."""
    subsystems: Optional[List[str]] = None
    teaching_types: Optional[List[str]] = None
    channels: Optional[List[str]] = None


class SchoolListItem(BaseModel):
    id: int
    name: str
    code: Optional[str] = None
    city: Optional[str] = None
    establishment_kind: str = ESTABLISHMENT_KIND_SCHOOL
    is_active: bool
    model_config = {"from_attributes": True}


class SchoolProfile(BaseModel):
    id: int
    name: str
    code: Optional[str] = None
    city: Optional[str] = None
    address: Optional[str] = None
    phone: Optional[str] = None
    logo_url: Optional[str] = None
    primary_color: Optional[str] = None
    secondary_color: Optional[str] = None
    bulletin_po_box: Optional[str] = None
    bulletin_motto: Optional[str] = None
    bulletin_delegation_regional: Optional[str] = None
    bulletin_delegation_departementale: Optional[str] = None
    bulletin_next_term_note: Optional[str] = None
    bulletin_appreciation_scales: Dict[str, List[Dict[str, Any]]] = Field(default_factory=dict)
    bulletin_theme: Dict[str, Any] = Field(default_factory=dict)
    bulletin_layout_profile: Dict[str, Any] = Field(default_factory=dict)
    bulletin_reference_url: Optional[str] = None
    subscription_plan: Optional[str] = None
    establishment_kind: str = ESTABLISHMENT_KIND_SCHOOL
    is_active: bool
    created_at: datetime
    subsystems: List[str] = []
    teaching_types: List[str] = []
    channels: List[str] = []
