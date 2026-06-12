"""Référentiel national MINESEC — modèle de données (lecture seule pour les écoles).

Arborescence (cahier des charges §2) :
    Sous-système → Type d'enseignement → Cycle → Niveau → Série/Spécialité

Matières (cahier §3) : chaque matière officielle est enregistrée UNE SEULE FOIS
(`subjects`) puis reliée aux niveaux/séries via `subject_eligibility`, avec un
coefficient par défaut.

NB : la notion de « domaine » (§3.1) est volontairement écartée à la demande du
client — pas de table `domains`, pas de colonne domaine sur `subjects`.

Ces tables sont COMMUNES à toutes les écoles : aucun `tenant_id`, aucune RLS.
"""
from sqlalchemy import (
    Boolean,
    Column,
    Float,
    ForeignKey,
    Integer,
    String,
    UniqueConstraint,
)
from sqlalchemy.orm import relationship

from common.db import Base


class Subsystem(Base):
    """Sous-système : Francophone / Anglophone."""
    __tablename__ = "subsystems"

    id = Column(Integer, primary_key=True)
    code = Column(String(20), unique=True, nullable=False)  # FRANCOPHONE | ANGLOPHONE
    name = Column(String(50), nullable=False)


class TeachingType(Base):
    """Type d'enseignement : Général / Technique."""
    __tablename__ = "teaching_types"

    id = Column(Integer, primary_key=True)
    code = Column(String(20), unique=True, nullable=False)  # GENERAL | TECHNIQUE
    name_fr = Column(String(50), nullable=False)
    name_en = Column(String(50), nullable=False)


class Cycle(Base):
    """Cycle : Premier / Second."""
    __tablename__ = "cycles"

    id = Column(Integer, primary_key=True)
    code = Column(String(20), unique=True, nullable=False)  # PREMIER | SECOND
    name_fr = Column(String(50), nullable=False)
    name_en = Column(String(50), nullable=False)
    order = Column(Integer, nullable=False, default=1)


class Level(Base):
    """Niveau (6ème, 2nde, Form 1, Lower Sixth…) — rattaché à sous-système+type+cycle."""
    __tablename__ = "levels"
    __table_args__ = (UniqueConstraint("subsystem_id", "code", name="uq_level_subsystem_code"),)

    id = Column(Integer, primary_key=True)
    code = Column(String(20), nullable=False)  # 6E, 2ND, 1ERE, TLE, F1, LS, TF1…
    name = Column(String(80), nullable=False)
    subsystem_id = Column(Integer, ForeignKey("subsystems.id"), nullable=False)
    teaching_type_id = Column(Integer, ForeignKey("teaching_types.id"), nullable=False)
    cycle_id = Column(Integer, ForeignKey("cycles.id"), nullable=False)
    exam = Column(String(50), nullable=True)  # BEPC, Probatoire, BAC, GCE O Level…
    order = Column(Integer, nullable=False, default=1)

    subsystem = relationship("Subsystem")
    teaching_type = relationship("TeachingType")
    cycle = relationship("Cycle")
    series = relationship("LevelSeries", back_populates="level")


class SeriesSpecialty(Base):
    """Série / Spécialité (A1, A2, A4, C, D, F1 Génie Civil, Arts, Science…)."""
    __tablename__ = "series_specialties"

    id = Column(Integer, primary_key=True)
    code = Column(String(30), unique=True, nullable=False)
    name_fr = Column(String(80), nullable=False)
    name_en = Column(String(80), nullable=False)

    levels = relationship("LevelSeries", back_populates="series")


class LevelSeries(Base):
    """Éligibilité Série ↔ Niveau (quelles séries sont proposées pour un niveau)."""
    __tablename__ = "level_series"
    __table_args__ = (UniqueConstraint("level_id", "series_id", name="uq_level_series"),)

    id = Column(Integer, primary_key=True)
    level_id = Column(Integer, ForeignKey("levels.id"), nullable=False)
    series_id = Column(Integer, ForeignKey("series_specialties.id"), nullable=False)

    level = relationship("Level", back_populates="series")
    series = relationship("SeriesSpecialty", back_populates="levels")


class Subject(Base):
    """Matière officielle — enregistrée une seule fois (sans domaine, cf. décision client)."""
    __tablename__ = "subjects"

    id = Column(Integer, primary_key=True)
    code = Column(String(30), unique=True, nullable=False)
    name = Column(String(120), nullable=False)  # FR pour francophone, EN pour anglophone


class SubjectEligibility(Base):
    """Matière ↔ Niveau ↔ (Série) ↔ coefficient par défaut (cahier §3).

    - `series_id` NULL = tronc commun (premier cycle, anglophone Form 1-5).
    - `is_obligatoire` pilote l'avertissement de décochage (§5.2). La liste
      officielle des matières obligatoires par série n'est pas fournie par le
      cahier : seed à False par défaut, à compléter avec le client.
    """
    __tablename__ = "subject_eligibility"
    __table_args__ = (
        UniqueConstraint(
            "subject_id", "level_id", "series_id", name="uq_eligibility"
        ),
    )

    id = Column(Integer, primary_key=True)
    subject_id = Column(Integer, ForeignKey("subjects.id"), nullable=False)
    level_id = Column(Integer, ForeignKey("levels.id"), nullable=False)
    series_id = Column(Integer, ForeignKey("series_specialties.id"), nullable=True)
    default_coefficient = Column(Float, nullable=False)
    is_obligatoire = Column(Boolean, nullable=False, default=False)
    # Groupe de bulletin (1 ou 2), uniquement à partir du second cycle francophone ;
    # NULL ailleurs. Peut varier selon la série (cf. décision client).
    groupe = Column(Integer, nullable=True)

    subject = relationship("Subject")
    level = relationship("Level")
    series = relationship("SeriesSpecialty")
