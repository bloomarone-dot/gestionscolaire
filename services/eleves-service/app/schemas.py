from datetime import date, datetime
from typing import List, Optional

from pydantic import BaseModel, field_validator


class ParentIn(BaseModel):
    """§6.1 — téléphone obligatoire, email facultatif (jamais bloquant)."""
    nom: str
    phone: str
    phone2: Optional[str] = None
    adresse: Optional[str] = None
    email: Optional[str] = None

    @field_validator("nom", "phone")
    @classmethod
    def _required(cls, v, info):
        if not v or not v.strip():
            raise ValueError(f"{info.field_name} du parent est obligatoire.")
        return v.strip()


class EleveCreate(BaseModel):
    nom: str
    prenom: Optional[str] = None
    date_naissance: Optional[date] = None
    sexe: Optional[str] = None
    lieu_naissance: Optional[str] = None
    matricule: Optional[str] = None  # généré si absent (§6.1)

    subsystem_code: Optional[str] = None
    type_code: Optional[str] = None
    cycle_code: Optional[str] = None
    level_code: Optional[str] = None
    series_code: Optional[str] = None
    classe_id: Optional[int] = None  # classe filtrée choisie (§6 étape 5)

    parents: List[ParentIn] = []

    @field_validator("nom")
    @classmethod
    def _nom(cls, v):
        if not v or not v.strip():
            raise ValueError("Le nom de l'élève est obligatoire.")
        return v.strip()


class EleveUpdate(BaseModel):
    nom: Optional[str] = None
    prenom: Optional[str] = None
    matricule: Optional[str] = None
    sexe: Optional[str] = None
    lieu_naissance: Optional[str] = None
    photo_url: Optional[str] = None
    classe_id: Optional[int] = None
    statut: Optional[str] = None


class EleveImportResult(BaseModel):
    imported: int = 0
    updated: int = 0
    skipped: int = 0
    errors: List[str] = []
    classe_id: Optional[int] = None
    classe_nom: Optional[str] = None
    section: Optional[str] = None  # Francophone | Anglophone


class ParentOut(BaseModel):
    nom: str
    phone: str
    phone2: Optional[str] = None
    email: Optional[str] = None
    model_config = {"from_attributes": True}


class EleveRow(BaseModel):
    """Ligne du tableau « Élèves » (§9.3)."""
    id: int
    matricule: str
    nom: str
    prenom: Optional[str] = None
    classe_id: Optional[int] = None
    sexe: Optional[str] = None
    contact_parent: Optional[str] = None
    statut: str


class EleveDetail(EleveRow):
    date_naissance: Optional[date] = None
    lieu_naissance: Optional[str] = None
    subsystem_code: Optional[str] = None
    type_code: Optional[str] = None
    level_code: Optional[str] = None
    series_code: Optional[str] = None
    created_at: datetime
    parents: List[ParentOut] = []


class TransferIn(BaseModel):
    """§6.3 — transfert vers une autre classe (même niveau)."""
    new_classe_id: int


class PromotionItem(BaseModel):
    eleve_id: int
    status: str                      # ADMIS | REDOUBLE | REORIENTE | SORTANT
    dest_classe_id: Optional[int] = None
    new_series_code: Optional[str] = None


class PromotionApply(BaseModel):
    source_classe_id: int
    items: List[PromotionItem]
