from datetime import datetime
from typing import List, Optional

from pydantic import BaseModel

INTERNAL_CHANNEL = "INTERNAL"


class SchoolCreate(BaseModel):
    name: str
    code: Optional[str] = None
    city: Optional[str] = None
    address: Optional[str] = None
    phone: Optional[str] = None
    # Profil pédagogique actif (filtre amont §14)
    subsystems: List[str] = []   # ex. ["FRANCOPHONE"]
    teaching_types: List[str] = []  # ex. ["GENERAL"]
    channels: List[str] = ["INTERNAL"]


class SchoolUpdate(BaseModel):
    name: Optional[str] = None
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
    is_active: Optional[bool] = None


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
    subscription_plan: Optional[str] = None
    is_active: bool
    created_at: datetime
    subsystems: List[str] = []
    teaching_types: List[str] = []
    channels: List[str] = []
