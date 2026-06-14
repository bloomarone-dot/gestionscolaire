"""pedagogie-service — classes de l'école et leurs matières (cahier §4 & §5).

Données tenant : chaque ligne porte `tenant_id` (= école). Isolation applicative
ici, RLS PostgreSQL en Phase 5.

- `Classe` : créée par cascade (§4) ou en « classe spéciale » hors référentiel (§4.3).
- `SpecialSubject` : matière spéciale propre à l'école (§5.3), sans domaine.
- `ClasseMatiere` : matières de la classe (§5.1), officielles (héritées du
  référentiel) ou spéciales, avec coefficient, activation et enseignant assigné.
"""
from datetime import datetime

from sqlalchemy import (
    Boolean,
    Date,
    Column,
    DateTime,
    Float,
    ForeignKey,
    Integer,
    String,
)
from sqlalchemy.orm import relationship

from common.db import Base

SOURCE_OFFICIELLE = "OFFICIELLE"
SOURCE_SPECIALE = "SPECIALE"


class Classe(Base):
    __tablename__ = "classes"

    id = Column(Integer, primary_key=True)
    tenant_id = Column(Integer, nullable=False, index=True)

    nom_personnalise = Column(String(120), nullable=False)  # seul champ libre (§4.1)

    # Profil (cascade §4) — codes du référentiel national
    subsystem_code = Column(String(20), nullable=True)
    type_code = Column(String(20), nullable=True)
    cycle_code = Column(String(20), nullable=True)
    level_code = Column(String(20), nullable=True)
    series_code = Column(String(30), nullable=True)

    # Classe spéciale (§4.3) — niveau/spécialité en texte libre, aucune matière pré-remplie
    is_special = Column(Boolean, default=False, nullable=False)
    niveau_libre = Column(String(120), nullable=True)
    specialite_libre = Column(String(120), nullable=True)

    effectif_max = Column(Integer, nullable=True)
    prof_principal_id = Column(Integer, nullable=True)
    annee_scolaire_id = Column(Integer, ForeignKey("annees_scolaires.id"), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    matieres = relationship("ClasseMatiere", cascade="all, delete-orphan", back_populates="classe")
    annee_scolaire = relationship("AnneeScolaire", back_populates="classes")


class AnneeScolaire(Base):
    """Année scolaire d'un établissement, une seule active par tenant."""
    __tablename__ = "annees_scolaires"

    id = Column(Integer, primary_key=True)
    tenant_id = Column(Integer, nullable=False, index=True)
    annee = Column(String(20), nullable=False)
    date_debut = Column(Date, nullable=True)
    date_fin = Column(Date, nullable=True)
    is_active = Column(Boolean, default=False, nullable=False)
    is_archived = Column(Boolean, default=False, nullable=False)
    archived_at = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    classes = relationship("Classe", back_populates="annee_scolaire")


class SpecialSubject(Base):
    """Matière spéciale propre à l'école (§5.3) — réutilisable, sans domaine."""
    __tablename__ = "special_subjects"

    id = Column(Integer, primary_key=True)
    tenant_id = Column(Integer, nullable=False, index=True)
    nom = Column(String(120), nullable=False)
    coefficient = Column(Float, nullable=False, default=1)
    volume_horaire = Column(Integer, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)


class ClasseMatiere(Base):
    """Matière d'une classe (§5.1)."""
    __tablename__ = "classe_matieres"

    id = Column(Integer, primary_key=True)
    tenant_id = Column(Integer, nullable=False, index=True)
    classe_id = Column(Integer, ForeignKey("classes.id"), nullable=False, index=True)

    source = Column(String(12), nullable=False, default=SOURCE_OFFICIELLE)  # OFFICIELLE | SPECIALE
    subject_code = Column(String(30), nullable=True)  # code référentiel (officielle)
    special_subject_id = Column(Integer, ForeignKey("special_subjects.id"), nullable=True)

    nom = Column(String(120), nullable=False)  # libellé affiché (dénormalisé)
    coefficient = Column(Float, nullable=False, default=1)
    volume_horaire = Column(Integer, nullable=True)
    enseignant_id = Column(Integer, nullable=True)
    groupe = Column(Integer, nullable=True)  # groupe de bulletin (second cycle francophone)

    activated = Column(Boolean, default=True, nullable=False)
    is_obligatoire = Column(Boolean, default=False, nullable=False)

    classe = relationship("Classe", back_populates="matieres")
    special_subject = relationship("SpecialSubject")
