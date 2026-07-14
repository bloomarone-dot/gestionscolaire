"""eleves-service — élèves, parents/tuteurs, transferts et promotions (cahier §6 & §10).

L'héritage des matières (§6.2) est DÉRIVÉ : un élève « possède » les matières
activées de sa classe (détenues par pedagogie-service). Aucune duplication ici —
ainsi toute modification au niveau classe s'applique automatiquement à tous ses
élèves, comme l'exige le cahier.
"""
from datetime import datetime

from sqlalchemy import (
    Boolean,
    Column,
    Date,
    DateTime,
    ForeignKey,
    Integer,
    String,
)
from sqlalchemy.orm import relationship

from common.db import Base

# Statuts (§9.3)
STATUT_INSCRIT = "INSCRIT"
STATUT_TRANSFERE = "TRANSFERE"
STATUT_EXCLU = "EXCLU"
STATUT_DIPLOME = "DIPLOME"
STATUT_ABANDON = "ABANDON"


class Eleve(Base):
    __tablename__ = "eleves"

    id = Column(Integer, primary_key=True)
    tenant_id = Column(Integer, nullable=False, index=True)

    matricule = Column(String(40), nullable=False, index=True)  # auto, modifiable (§6.1)
    nom = Column(String(100), nullable=False)
    prenom = Column(String(100), nullable=True)
    date_naissance = Column(Date, nullable=True)
    sexe = Column(String(1), nullable=True)
    lieu_naissance = Column(String(120), nullable=True)
    photo_url = Column(String, nullable=True)
    etat_sante = Column(String, nullable=True)  # allergies, groupe sanguin, notes médicales

    # Profil pédagogique (cascade §6, codes du référentiel)
    subsystem_code = Column(String(20), nullable=True)
    type_code = Column(String(20), nullable=True)
    cycle_code = Column(String(20), nullable=True)
    level_code = Column(String(20), nullable=True)
    series_code = Column(String(30), nullable=True)

    classe_id = Column(Integer, nullable=True, index=True)  # classe pedagogie-service
    statut = Column(String(15), nullable=False, default=STATUT_INSCRIT)

    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    parents = relationship("Parent", cascade="all, delete-orphan", back_populates="eleve")


class Parent(Base):
    """Parent / tuteur (§6.1) — téléphone obligatoire, email facultatif."""
    __tablename__ = "parents"

    id = Column(Integer, primary_key=True)
    tenant_id = Column(Integer, nullable=False, index=True)
    eleve_id = Column(Integer, ForeignKey("eleves.id"), nullable=False, index=True)

    nom = Column(String(120), nullable=False)
    phone = Column(String(20), nullable=False)     # obligatoire
    phone2 = Column(String(20), nullable=True)
    adresse = Column(String(255), nullable=True)
    email = Column(String(120), nullable=True)     # facultatif — jamais bloquant

    eleve = relationship("Eleve", back_populates="parents")
