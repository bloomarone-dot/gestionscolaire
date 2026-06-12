from datetime import datetime
from typing import List, Optional

from pydantic import BaseModel, model_validator


class ClasseCreate(BaseModel):
    """Création par cascade (§4.1) ou classe spéciale (§4.3)."""
    nom_personnalise: str
    effectif_max: Optional[int] = None
    prof_principal_id: Optional[int] = None

    # Cascade (classe standard)
    subsystem_code: Optional[str] = None
    type_code: Optional[str] = None
    cycle_code: Optional[str] = None
    level_code: Optional[str] = None
    series_code: Optional[str] = None

    # Classe spéciale
    is_special: bool = False
    niveau_libre: Optional[str] = None
    specialite_libre: Optional[str] = None

    @model_validator(mode="after")
    def _check(self):
        if self.is_special:
            if not (self.niveau_libre or "").strip():
                raise ValueError("Une classe spéciale exige un niveau personnalisé.")
        else:
            if not self.level_code:
                raise ValueError("Le niveau (level_code) est obligatoire pour une classe standard.")
        return self


class MatiereOut(BaseModel):
    id: int
    nom: str
    source: str            # OFFICIELLE | SPECIALE
    type: str              # « Officielle » | « Spéciale » (libellé §5.1)
    subject_code: Optional[str] = None
    coefficient: float
    volume_horaire: Optional[int] = None
    enseignant_id: Optional[int] = None
    activated: bool
    is_obligatoire: bool
    groupe: Optional[int] = None  # groupe de bulletin (second cycle francophone)


class ClasseListItem(BaseModel):
    """Ligne du tableau « Classes » (§9.1) — données détenues par pedagogie-service."""
    id: int
    nom_personnalise: str
    subsystem_code: Optional[str] = None
    type_code: Optional[str] = None
    level_code: Optional[str] = None
    series_code: Optional[str] = None
    niveau_libre: Optional[str] = None
    specialite_libre: Optional[str] = None
    effectif_max: Optional[int] = None
    prof_principal_id: Optional[int] = None
    nb_matieres: int
    statut: str            # « Standard » | « Spéciale »


class ClasseDetail(ClasseListItem):
    is_special: bool
    cycle_code: Optional[str] = None
    created_at: datetime
    matieres: List[MatiereOut] = []


class MatiereUpdate(BaseModel):
    activated: Optional[bool] = None
    coefficient: Optional[float] = None
    volume_horaire: Optional[int] = None
    enseignant_id: Optional[int] = None
    confirm: bool = False  # requis pour décocher une matière obligatoire (§5.2)


class SpecialMatiereCreate(BaseModel):
    """Ajout d'une matière spéciale à une classe (§5.3) — sans domaine."""
    nom: str
    coefficient: float = 1
    volume_horaire: Optional[int] = None
