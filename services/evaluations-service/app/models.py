"""evaluations-service — saisie des notes par classe/matière/période (cahier §11.1).

`matiere_id` référence la matière de la classe (ClasseMatiere de pedagogie-service).
Les coefficients ne sont PAS stockés ici : ils appartiennent à pedagogie/référentiel
et sont récupérés par bulletins-service au moment du calcul.
"""
from datetime import datetime

from sqlalchemy import (
    Boolean,
    Column,
    Date,
    DateTime,
    Float,
    Integer,
    String,
    UniqueConstraint,
)

from common.db import Base


class Note(Base):
    __tablename__ = "notes"
    __table_args__ = (
        UniqueConstraint(
            "tenant_id", "eleve_id", "matiere_id", "trimestre", "type_evaluation",
            name="uq_note_unique",
        ),
    )

    id = Column(Integer, primary_key=True)
    tenant_id = Column(Integer, nullable=False, index=True)

    eleve_id = Column(Integer, nullable=False, index=True)
    classe_id = Column(Integer, nullable=False, index=True)
    matiere_id = Column(Integer, nullable=False, index=True)   # ClasseMatiere (pedagogie)
    enseignant_id = Column(Integer, nullable=True)

    trimestre = Column(Integer, nullable=False, default=1)
    type_evaluation = Column(String(20), nullable=False, default="sequence_1")
    valeur = Column(Float, nullable=False)
    description = Column(String(255), nullable=True)

    date_saisie = Column(DateTime, default=datetime.utcnow, nullable=False)


class PeriodeSaisie(Base):
    """Fenêtre autorisée de saisie/modification des notes (porté de l'existant)."""
    __tablename__ = "periodes_saisie"

    id = Column(Integer, primary_key=True)
    tenant_id = Column(Integer, nullable=False, index=True)
    classe_id = Column(Integer, nullable=False, index=True)
    matiere_id = Column(Integer, nullable=True, index=True)  # NULL = toutes matières
    trimestre = Column(Integer, nullable=True)
    type_evaluation = Column(String(20), nullable=True)

    date_debut = Column(Date, nullable=False)
    date_fin = Column(Date, nullable=False)
    is_open = Column(Boolean, default=True, nullable=False)
