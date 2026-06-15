from datetime import date, datetime
from typing import List, Optional

from pydantic import BaseModel, field_validator


def _check_note(v: float) -> float:
    if v < 0 or v > 20:
        raise ValueError("La note doit être comprise entre 0 et 20.")
    return v


class NoteIn(BaseModel):
    eleve_id: int
    classe_id: int
    matiere_id: int
    valeur: float
    trimestre: int = 1
    type_evaluation: str = "sequence_1"
    enseignant_id: Optional[int] = None
    description: Optional[str] = None

    @field_validator("valeur")
    @classmethod
    def _v(cls, v):
        return _check_note(v)


class NoteBulkItem(BaseModel):
    eleve_id: int
    valeur: float

    @field_validator("valeur")
    @classmethod
    def _v(cls, v):
        return _check_note(v)


class NoteBulkIn(BaseModel):
    classe_id: int
    matiere_id: int
    trimestre: int = 1
    type_evaluation: str = "sequence_1"
    enseignant_id: Optional[int] = None
    notes: List[NoteBulkItem]


class NoteOut(BaseModel):
    id: int
    eleve_id: int
    classe_id: int
    matiere_id: int
    valeur: float
    trimestre: int
    type_evaluation: str
    enseignant_id: Optional[int] = None
    date_saisie: datetime
    model_config = {"from_attributes": True}


class PeriodeIn(BaseModel):
    classe_id: int
    matiere_id: Optional[int] = None
    trimestre: Optional[int] = None
    type_evaluation: Optional[str] = None
    date_debut: date
    date_fin: date


class PeriodeOut(PeriodeIn):
    id: int
    is_open: bool
    model_config = {"from_attributes": True}
