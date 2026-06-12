from typing import Optional

from pydantic import BaseModel


class SubsystemOut(BaseModel):
    id: int
    code: str
    name: str
    model_config = {"from_attributes": True}


class TeachingTypeOut(BaseModel):
    id: int
    code: str
    name_fr: str
    name_en: str
    model_config = {"from_attributes": True}


class CycleOut(BaseModel):
    id: int
    code: str
    name_fr: str
    name_en: str
    order: int
    model_config = {"from_attributes": True}


class LevelOut(BaseModel):
    id: int
    code: str
    name: str
    exam: Optional[str] = None
    order: int
    model_config = {"from_attributes": True}


class SeriesOut(BaseModel):
    id: int
    code: str
    name_fr: str
    name_en: str
    model_config = {"from_attributes": True}


class ResolvedSubjectOut(BaseModel):
    """Matière héritée à la création de classe (§4.2 / §5.1)."""
    subject_id: int
    code: str
    name: str
    default_coefficient: float
    is_obligatoire: bool
    groupe: Optional[int] = None  # groupe de bulletin (second cycle francophone)
    type: str = "Officielle"


# ── Écriture (admin plateforme) ──────────────────────────────────────────────
class SubjectCreate(BaseModel):
    code: str
    name: str


class EligibilityCreate(BaseModel):
    subject_code: str
    level_code: str
    series_code: Optional[str] = None
    default_coefficient: float
    is_obligatoire: bool = False
    groupe: Optional[int] = None
