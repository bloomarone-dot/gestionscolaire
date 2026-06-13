"""tenant-service — profil des écoles (tenants) et configuration.

Chaque école = un tenant. `School.id` est le `tenant_id` porté par le JWT.
Le profil porte les **sous-systèmes / types d'enseignement actifs** : c'est le
filtre amont (§14) qui conditionne les listes proposées dans la cascade, et les
**canaux de notification** activés (§12.2).

Isolation : un admin d'école ne voit que SON école ; le superadmin voit tout
(filtrage applicatif ici, RLS PostgreSQL en défense-en-profondeur en Phase 5).
"""
from datetime import datetime

from sqlalchemy import (
    Boolean,
    Column,
    DateTime,
    ForeignKey,
    Integer,
    String,
    Text,
    UniqueConstraint,
)
from sqlalchemy.orm import relationship

from common.db import Base


class School(Base):
    __tablename__ = "schools"

    id = Column(Integer, primary_key=True)  # = tenant_id
    name = Column(String(150), nullable=False, index=True)
    code = Column(String(30), unique=True, nullable=True)

    city = Column(String(100), nullable=True)
    address = Column(String(255), nullable=True)
    phone = Column(String(20), nullable=True)

    # Identité visuelle / en-tête bulletin (porté depuis l'existant)
    logo_url = Column(Text, nullable=True)
    primary_color = Column(String(7), default="#4f46e5")
    secondary_color = Column(String(7), default="#f59e0b")
    bulletin_po_box = Column(String(100), nullable=True)
    bulletin_motto = Column(String(255), nullable=True)
    bulletin_delegation_regional = Column(String(255), nullable=True)
    bulletin_delegation_departementale = Column(String(255), nullable=True)
    bulletin_next_term_note = Column(String(255), nullable=True)

    subscription_plan = Column(String(40), default="standard")
    is_active = Column(Boolean, default=True, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    subsystems = relationship("SchoolSubsystem", cascade="all, delete-orphan", back_populates="school")
    teaching_types = relationship("SchoolTeachingType", cascade="all, delete-orphan", back_populates="school")
    channels = relationship("NotificationChannel", cascade="all, delete-orphan", back_populates="school")


class SchoolSubsystem(Base):
    """Sous-système activé pour l'école (FRANCOPHONE / ANGLOPHONE)."""
    __tablename__ = "school_subsystems"
    __table_args__ = (UniqueConstraint("school_id", "subsystem_code", name="uq_school_subsystem"),)

    id = Column(Integer, primary_key=True)
    school_id = Column(Integer, ForeignKey("schools.id"), nullable=False, index=True)
    subsystem_code = Column(String(20), nullable=False)  # référence le code du référentiel

    school = relationship("School", back_populates="subsystems")


class SchoolTeachingType(Base):
    """Type d'enseignement activé pour l'école (GENERAL / TECHNIQUE)."""
    __tablename__ = "school_teaching_types"
    __table_args__ = (UniqueConstraint("school_id", "type_code", name="uq_school_type"),)

    id = Column(Integer, primary_key=True)
    school_id = Column(Integer, ForeignKey("schools.id"), nullable=False, index=True)
    type_code = Column(String(20), nullable=False)

    school = relationship("School", back_populates="teaching_types")


class NotificationChannel(Base):
    """Canal de notification activé pour l'école (§12.2)."""
    __tablename__ = "notification_channels"
    __table_args__ = (UniqueConstraint("school_id", "channel", name="uq_school_channel"),)

    id = Column(Integer, primary_key=True)
    school_id = Column(Integer, ForeignKey("schools.id"), nullable=False, index=True)
    channel = Column(String(20), nullable=False)  # SMS | WHATSAPP | EMAIL | INTERNAL
    enabled = Column(Boolean, default=True, nullable=False)

    school = relationship("School", back_populates="channels")
