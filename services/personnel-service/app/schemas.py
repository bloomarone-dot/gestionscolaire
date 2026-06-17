from datetime import datetime
from typing import List, Optional

from pydantic import BaseModel, field_validator, model_validator

from common.phone import normalize_phone


def _required(value: Optional[str], field: str) -> str:
    if not value or not value.strip():
        raise ValueError(f"{field} est obligatoire.")
    return value.strip()


class TeachableSubjectIn(BaseModel):
    label: str
    subject_code: Optional[str] = None
    special_subject_id: Optional[int] = None


class EnseignantCreate(BaseModel):
    """§7.1 — téléphone + sexe obligatoires, email facultatif."""
    nom: str
    prenom: Optional[str] = None
    sexe: str
    phone: str
    phone2: Optional[str] = None
    email: Optional[str] = None
    specialite: Optional[str] = None
    diplome: Optional[str] = None
    teachable_subjects: List[TeachableSubjectIn] = []
    password: Optional[str] = None  # généré si absent

    @field_validator("nom", "phone", "sexe")
    @classmethod
    def _not_empty(cls, v, info):
        return _required(v, info.field_name)

    @field_validator("phone", "phone2")
    @classmethod
    def _normalize_phones(cls, value: Optional[str]) -> Optional[str]:
        if value is None or not str(value).strip():
            return value
        return normalize_phone(value)


class DirectionCreate(BaseModel):
    """§7.2 — DEUX téléphones obligatoires + fonction, email facultatif."""
    nom: str
    prenom: Optional[str] = None
    phone: str
    phone2: str
    fonction: str
    email: Optional[str] = None
    password: Optional[str] = None

    @field_validator("nom", "phone", "fonction")
    @classmethod
    def _not_empty(cls, v, info):
        return _required(v, info.field_name)

    @field_validator("phone", "phone2")
    @classmethod
    def _normalize_phones(cls, value: Optional[str]) -> Optional[str]:
        if value is None or not str(value).strip():
            return value
        return normalize_phone(value)

    @model_validator(mode="after")
    def _two_phones(self):
        if not self.phone2 or not self.phone2.strip():
            raise ValueError("La Direction doit fournir DEUX numéros de téléphone (§7.2).")
        return self


class PersonnelUpdate(BaseModel):
    nom: Optional[str] = None
    prenom: Optional[str] = None
    sexe: Optional[str] = None
    phone2: Optional[str] = None
    email: Optional[str] = None
    specialite: Optional[str] = None
    diplome: Optional[str] = None
    fonction: Optional[str] = None
    is_active: Optional[bool] = None


class PersonnelRow(BaseModel):
    """Ligne du tableau « Enseignants » (§9.2)."""
    id: int
    role_type: str
    nom: str
    prenom: Optional[str] = None
    phone: str
    email: Optional[str] = None
    fonction: Optional[str] = None
    matieres: List[str] = []
    is_active: bool


class PersonnelDetail(PersonnelRow):
    sexe: Optional[str] = None
    phone2: Optional[str] = None
    specialite: Optional[str] = None
    diplome: Optional[str] = None
    account_id: Optional[int] = None
    created_at: datetime
