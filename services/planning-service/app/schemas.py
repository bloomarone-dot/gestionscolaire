from datetime import datetime, time

from pydantic import BaseModel, Field, field_validator


class SalleCreate(BaseModel):
    nom: str = Field(..., min_length=1, max_length=120)
    capacite: int | None = Field(None, ge=1)
    etage: str | None = None
    notes: str | None = None


class SalleUpdate(BaseModel):
    nom: str | None = Field(None, min_length=1, max_length=120)
    capacite: int | None = Field(None, ge=1)
    etage: str | None = None
    notes: str | None = None
    is_active: bool | None = None


class SalleOut(BaseModel):
    id: int
    tenant_id: int
    nom: str
    capacite: int | None
    etage: str | None
    notes: str | None
    is_active: bool
    created_at: datetime

    model_config = {"from_attributes": True}


class SeanceCreate(BaseModel):
    jour_semaine: int = Field(..., ge=0, le=6)
    heure_debut: time
    heure_fin: time
    classe_id: int | None = None
    classe_nom: str | None = None
    salle_id: int | None = None
    salle_nom: str | None = None
    enseignant_id: int | None = None
    enseignant_nom: str | None = None
    matiere_label: str | None = None
    notes: str | None = None

    @field_validator("heure_fin")
    @classmethod
    def fin_apres_debut(cls, v: time, info):
        debut = info.data.get("heure_debut")
        if debut and v <= debut:
            raise ValueError("L'heure de fin doit être après l'heure de début.")
        return v


class SeanceUpdate(BaseModel):
    jour_semaine: int | None = Field(None, ge=0, le=6)
    heure_debut: time | None = None
    heure_fin: time | None = None
    classe_id: int | None = None
    classe_nom: str | None = None
    salle_id: int | None = None
    salle_nom: str | None = None
    enseignant_id: int | None = None
    enseignant_nom: str | None = None
    matiere_label: str | None = None
    notes: str | None = None


class SeanceOut(BaseModel):
    id: int
    tenant_id: int
    jour_semaine: int
    heure_debut: time
    heure_fin: time
    classe_id: int | None
    classe_nom: str | None
    salle_id: int | None
    salle_nom: str | None
    enseignant_id: int | None
    enseignant_nom: str | None
    matiere_label: str | None
    notes: str | None
    created_at: datetime

    model_config = {"from_attributes": True}


class SemaineOut(BaseModel):
    jours: dict[str, list[SeanceOut]]
