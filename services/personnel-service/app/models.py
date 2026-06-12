"""personnel-service — enseignants et direction/administration (cahier §7).

Le profil métier vit ici ; le compte de connexion (téléphone + mot de passe) est
créé dans `auth-service` et référencé par `account_id`.

Règles cahier :
- Enseignant (§7.1) : téléphone obligatoire, email facultatif, sexe obligatoire.
- Direction (§7.2) : DEUX téléphones obligatoires, email facultatif, fonction.
"""
from datetime import datetime

from sqlalchemy import Boolean, Column, DateTime, ForeignKey, Integer, String
from sqlalchemy.orm import relationship

from common.db import Base

ROLE_ENSEIGNANT = "ENSEIGNANT"
ROLE_DIRECTION = "DIRECTION"


class Personnel(Base):
    __tablename__ = "personnel"

    id = Column(Integer, primary_key=True)
    tenant_id = Column(Integer, nullable=False, index=True)
    role_type = Column(String(20), nullable=False)  # ENSEIGNANT | DIRECTION

    nom = Column(String(100), nullable=False)
    prenom = Column(String(100), nullable=True)
    sexe = Column(String(1), nullable=True)  # M | F (obligatoire pour enseignant)

    phone = Column(String(20), nullable=False)        # identifiant de connexion
    phone2 = Column(String(20), nullable=True)        # obligatoire pour la Direction
    email = Column(String(120), nullable=True)        # toujours facultatif

    specialite = Column(String(120), nullable=True)   # enseignant
    diplome = Column(String(120), nullable=True)      # enseignant
    fonction = Column(String(60), nullable=True)      # direction (Principal, Censeur…)

    account_id = Column(Integer, nullable=True)       # compte auth-service
    is_active = Column(Boolean, default=True, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    teachable_subjects = relationship(
        "TeachableSubject", cascade="all, delete-orphan", back_populates="personnel"
    )


class TeachableSubject(Base):
    """Matière qu'un enseignant peut enseigner (§7.1) — officielle ou spéciale."""
    __tablename__ = "teachable_subjects"

    id = Column(Integer, primary_key=True)
    tenant_id = Column(Integer, nullable=False, index=True)
    personnel_id = Column(Integer, ForeignKey("personnel.id"), nullable=False, index=True)
    subject_code = Column(String(30), nullable=True)        # code référentiel (officielle)
    special_subject_id = Column(Integer, nullable=True)     # matière spéciale école
    label = Column(String(120), nullable=False)

    personnel = relationship("Personnel", back_populates="teachable_subjects")
