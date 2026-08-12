from datetime import date, datetime
from typing import List, Optional

from pydantic import BaseModel, Field, field_validator

from app.pieces import default_pieces, parse_pieces


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
    photo_url: Optional[str] = None
    etat_sante: Optional[str] = None
    matricule: Optional[str] = None  # généré si absent (§6.1)

    subsystem_code: Optional[str] = None
    type_code: Optional[str] = None
    cycle_code: Optional[str] = None
    level_code: Optional[str] = None
    series_code: Optional[str] = None
    classe_id: Optional[int] = None  # classe filtrée choisie (§6 étape 5)

    parents: List[ParentIn] = []
    pieces: Optional[dict] = None

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
    date_naissance: Optional[date] = None
    lieu_naissance: Optional[str] = None
    photo_url: Optional[str] = None
    etat_sante: Optional[str] = None
    classe_id: Optional[int] = None
    statut: Optional[str] = None
    subsystem_code: Optional[str] = None
    type_code: Optional[str] = None
    cycle_code: Optional[str] = None
    level_code: Optional[str] = None
    series_code: Optional[str] = None
    pieces: Optional[dict] = None


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
    pieces_complets: bool = False


class EleveDetail(EleveRow):
    date_naissance: Optional[date] = None
    lieu_naissance: Optional[str] = None
    photo_url: Optional[str] = None
    etat_sante: Optional[str] = None
    subsystem_code: Optional[str] = None
    type_code: Optional[str] = None
    cycle_code: Optional[str] = None
    level_code: Optional[str] = None
    series_code: Optional[str] = None
    created_at: datetime
    parents: List[ParentOut] = []
    enrollment_action: Optional[str] = None  # NEW | PROMOTION | REDOUBLE | TRANSFER | DOWNGRADE
    previous_level_code: Optional[str] = None
    previous_classe_id: Optional[int] = None
    pieces: dict = Field(default_factory=default_pieces)

    @field_validator("pieces", mode="before")
    @classmethod
    def _pieces(cls, v):
        return parse_pieces(v)


class TransferIn(BaseModel):
    """§6.3 — transfert vers une autre classe (même niveau)."""
    new_classe_id: int


class PromotionItem(BaseModel):
    eleve_id: int
    status: str                      # ADMIS | REDOUBLE | REORIENTE | SORTANT
    dest_classe_id: Optional[int] = None
    new_series_code: Optional[str] = None
    new_level_code: Optional[str] = None   # centres de langues (CECRL)


class PromotionApply(BaseModel):
    source_classe_id: int
    items: List[PromotionItem]


class RadiationIn(BaseModel):
    motif: str
    destination_ecole: Optional[str] = None

    @field_validator("motif")
    @classmethod
    def _motif(cls, v):
        if not v or not v.strip():
            raise ValueError("Le motif de radiation est obligatoire.")
        return v.strip()


class MouvementOut(BaseModel):
    id: int
    kind: str
    from_classe_id: Optional[int] = None
    to_classe_id: Optional[int] = None
    motif: Optional[str] = None
    created_at: datetime
    model_config = {"from_attributes": True}


class ParentCodeOut(BaseModel):
    phone: str
    pin: str
    message: str


class ParentLoginIn(BaseModel):
    phone: str
    pin: str

    @field_validator("phone", "pin")
    @classmethod
    def _required(cls, v, info):
        if not v or not str(v).strip():
            raise ValueError(f"{info.field_name} obligatoire.")
        return str(v).strip()


class ParentLoginOut(BaseModel):
    access_token: str
    token_type: str = "bearer"
    phone: str
    role: str = "parent"


class PresenceItemIn(BaseModel):
    eleve_id: int
    statut: str  # PRESENT | ABSENT | RETARD
    motif: Optional[str] = None


class AppelIn(BaseModel):
    classe_id: int
    jour: date
    items: List[PresenceItemIn]


class PresenceOut(BaseModel):
    id: int
    eleve_id: int
    classe_id: int
    jour: date
    statut: str
    motif: Optional[str] = None
    model_config = {"from_attributes": True}


class ParentChildOut(BaseModel):
    id: int
    matricule: str
    nom: str
    prenom: Optional[str] = None
    classe_id: Optional[int] = None
    classe_nom: Optional[str] = None
    statut: str
    pieces: dict
    pieces_complets: bool
    pension: Optional[dict] = None
    absences: List[PresenceOut] = []
    mouvements: List[MouvementOut] = []


class ParentDashboardOut(BaseModel):
    phone: str
    enfants: List[ParentChildOut]
