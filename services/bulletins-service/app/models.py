"""Persistance des modèles de bulletin configurables (moteur v2).

Tables dans ``bulletins_db`` (auparavant inutilisée). Aucun impact sur le PDF
legacy ni sur les routes ``/bulletins/eleve|classe``.
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
    Index,
)
from sqlalchemy.types import JSON

from common.db import Base


# Statuts modèle
STATUS_DRAFT = "DRAFT"
STATUS_PUBLISHED = "PUBLISHED"
STATUS_ARCHIVED = "ARCHIVED"
MODELE_STATUSES = frozenset({STATUS_DRAFT, STATUS_PUBLISHED, STATUS_ARCHIVED})


class BulletinModele(Base):
    """Métadonnées d'un modèle de bulletin (par tenant, ou système si tenant_id NULL)."""

    __tablename__ = "bulletin_modeles"
    __table_args__ = (
        Index("ix_bulletin_modeles_tenant_status", "tenant_id", "status"),
    )

    id = Column(Integer, primary_key=True)
    # NULL = template système (lecture seule, duplicable vers un tenant)
    tenant_id = Column(Integer, nullable=True, index=True)
    name = Column(String(160), nullable=False)
    description = Column(Text, nullable=True)
    status = Column(String(20), nullable=False, default=STATUS_DRAFT, index=True)
    is_default = Column(Boolean, nullable=False, default=False)
    is_system = Column(Boolean, nullable=False, default=False)
    # Filtre optionnel : SCHOOL | PRIMARY_SCHOOL | LANGUAGE_CENTER | null = tous
    establishment_kind = Column(String(30), nullable=True)
    # Version courante (pointeur) — la définition vit dans BulletinModeleVersion
    current_version_id = Column(Integer, nullable=True)
    created_by = Column(Integer, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)


class BulletinModeleVersion(Base):
    """Snapshot immuable (en pratique) d'une définition JSON validée."""

    __tablename__ = "bulletin_modele_versions"
    __table_args__ = (
        UniqueConstraint("modele_id", "version_number", name="uq_bulletin_modele_version"),
        Index("ix_bulletin_modele_versions_tenant", "tenant_id"),
    )

    id = Column(Integer, primary_key=True)
    modele_id = Column(Integer, ForeignKey("bulletin_modeles.id"), nullable=False, index=True)
    # Dénormalisé pour filtrage multi-tenant sans jointure
    tenant_id = Column(Integer, nullable=True, index=True)
    version_number = Column(Integer, nullable=False, default=1)
    schema_version = Column(Integer, nullable=False, default=1)
    # Définition = BulletinTemplateV1 sérialisé (validé avant insert)
    definition = Column(JSON, nullable=False)
    notes = Column(Text, nullable=True)
    # Renseigné à la publication → la version devient immuable (y compris historiques).
    published_at = Column(DateTime, nullable=True)
    created_by = Column(Integer, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)


class BulletinModeleAssignation(Base):
    """Règle de sélection du modèle à utiliser pour une génération.

    Priorité (plus petit = plus prioritaire) — résolution à l'étape 9 :
    classe > level_code > cycle_code > défaut établissement > système.
    """

    __tablename__ = "bulletin_modele_assignations"
    __table_args__ = (
        Index("ix_bulletin_assign_tenant_active", "tenant_id", "is_active"),
    )

    id = Column(Integer, primary_key=True)
    tenant_id = Column(Integer, nullable=False, index=True)
    modele_id = Column(Integer, ForeignKey("bulletin_modeles.id"), nullable=False, index=True)

    annee_scolaire = Column(String(20), nullable=True, index=True)
    classe_id = Column(Integer, nullable=True, index=True)
    level_code = Column(String(30), nullable=True)
    cycle_code = Column(String(30), nullable=True)
    series_code = Column(String(30), nullable=True)
    # null = toutes périodes ; sinon 1|2|3 ou 'annual'
    periode = Column(String(20), nullable=True)

    priority = Column(Integer, nullable=False, default=100)
    is_active = Column(Boolean, nullable=False, default=True)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)
