"""eleves-service — élèves, parents/tuteurs, transferts et promotions (cahier §6 & §10).

L'héritage des matières (§6.2) est DÉRIVÉ : un élève « possède » les matières
activées de sa classe (détenues par pedagogie-service). Aucune duplication ici —
ainsi toute modification au niveau classe s'applique automatiquement à tous ses
élèves, comme l'exige le cahier.
"""
from datetime import datetime

from sqlalchemy import (
    Column,
    Date,
    DateTime,
    ForeignKey,
    Integer,
    String,
    Text,
    UniqueConstraint,
)
from sqlalchemy.orm import relationship

from common.db import Base

# Statuts (§9.3)
STATUT_INSCRIT = "INSCRIT"
STATUT_TRANSFERE = "TRANSFERE"
STATUT_EXCLU = "EXCLU"
STATUT_DIPLOME = "DIPLOME"
STATUT_ABANDON = "ABANDON"
STATUT_RADIE = "RADIE"

MOUVEMENT_INSCRIPTION = "INSCRIPTION"
MOUVEMENT_REINSCRIPTION = "REINSCRIPTION"
MOUVEMENT_TRANSFERT = "TRANSFERT"
MOUVEMENT_RADIATION = "RADIATION"
MOUVEMENT_REDOUBLEMENT = "REDOUBLEMENT"
MOUVEMENT_PROMOTION = "PROMOTION"
MOUVEMENT_SORTIE = "SORTIE"

PRESENCE_PRESENT = "PRESENT"
PRESENCE_ABSENT = "ABSENT"
PRESENCE_RETARD = "RETARD"


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
    pieces = Column(Text, nullable=True)  # JSON checklist dossier

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
    mouvements = relationship("EleveMouvement", cascade="all, delete-orphan", back_populates="eleve")


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


class EleveMouvement(Base):
    """Historique inscription / transfert / radiation / redoublement."""
    __tablename__ = "eleve_mouvements"

    id = Column(Integer, primary_key=True)
    tenant_id = Column(Integer, nullable=False, index=True)
    eleve_id = Column(Integer, ForeignKey("eleves.id"), nullable=False, index=True)
    kind = Column(String(20), nullable=False)
    from_classe_id = Column(Integer, nullable=True)
    to_classe_id = Column(Integer, nullable=True)
    motif = Column(String(255), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    eleve = relationship("Eleve", back_populates="mouvements")


class ParentAccess(Base):
    """Code d'accès espace parent (téléphone + PIN), un par établissement."""
    __tablename__ = "parent_access"
    __table_args__ = (UniqueConstraint("tenant_id", "phone", name="uq_parent_access_phone"),)

    id = Column(Integer, primary_key=True)
    tenant_id = Column(Integer, nullable=False, index=True)
    phone = Column(String(20), nullable=False, index=True)
    pin_hash = Column(String(64), nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)


class Presence(Base):
    """Appel quotidien par classe."""
    __tablename__ = "presences"
    __table_args__ = (
        UniqueConstraint("tenant_id", "classe_id", "eleve_id", "jour", name="uq_presence_appel"),
    )

    id = Column(Integer, primary_key=True)
    tenant_id = Column(Integer, nullable=False, index=True)
    classe_id = Column(Integer, nullable=False, index=True)
    eleve_id = Column(Integer, ForeignKey("eleves.id"), nullable=False, index=True)
    jour = Column(Date, nullable=False, index=True)
    statut = Column(String(12), nullable=False, default=PRESENCE_PRESENT)
    motif = Column(String(255), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
