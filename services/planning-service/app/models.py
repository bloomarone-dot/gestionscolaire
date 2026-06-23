"""planning-service — salles et créneaux hebdomadaires."""
from datetime import datetime, time

from sqlalchemy import Boolean, Column, DateTime, Integer, String, Text, Time

from common.db import Base


class Salle(Base):
    __tablename__ = "salles"

    id = Column(Integer, primary_key=True)
    tenant_id = Column(Integer, nullable=False, index=True)

    nom = Column(String(120), nullable=False)
    capacite = Column(Integer, nullable=True)
    etage = Column(String(40), nullable=True)
    notes = Column(Text, nullable=True)
    is_active = Column(Boolean, nullable=False, default=True)

    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)


class Seance(Base):
    __tablename__ = "seances"

    id = Column(Integer, primary_key=True)
    tenant_id = Column(Integer, nullable=False, index=True)

    jour_semaine = Column(Integer, nullable=False)  # 0 = lundi … 6 = dimanche
    heure_debut = Column(Time, nullable=False)
    heure_fin = Column(Time, nullable=False)

    classe_id = Column(Integer, nullable=True, index=True)
    classe_nom = Column(String(120), nullable=True)

    salle_id = Column(Integer, nullable=True, index=True)
    salle_nom = Column(String(120), nullable=True)

    enseignant_id = Column(Integer, nullable=True, index=True)
    enseignant_nom = Column(String(120), nullable=True)

    matiere_label = Column(String(120), nullable=True)
    notes = Column(Text, nullable=True)

    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
