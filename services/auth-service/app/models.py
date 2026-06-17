"""Modèle d'identité — comptes du personnel et des parents.

Le `auth-service` est la source de vérité de l'authentification. Les profils
métier riches (spécialité enseignant, enfants d'un parent…) vivent dans
`personnel-service` / `eleves-service` et référencent ce compte par `user_id`.

Conformité cahier des charges :
- **login = téléphone + mot de passe** (jamais email) ;
- **email facultatif** partout (jamais bloquant) ;
- la Direction possède **deux téléphones** (`phone` + `phone2`) — règle appliquée
  par le service appelant à la création (cf. personnel-service).
"""
from datetime import datetime

from sqlalchemy import Boolean, Column, DateTime, Integer, String

from common.db import Base


class Role:
    SUPERADMIN = "superadmin"   # admin plateforme — tenant_id NULL
    ADMIN = "admin"             # admin établissement
    DIRECTION = "direction"     # principal / censeur — 2 téléphones
    ENSEIGNANT = "enseignant"
    PARENT = "parent"


class Account(Base):
    __tablename__ = "accounts"

    id = Column(Integer, primary_key=True, index=True)

    # Identifiant de connexion : téléphone (unique sur la plateforme).
    phone = Column(String(20), unique=True, nullable=False, index=True)
    phone2 = Column(String(20), nullable=True)  # 2e numéro (Direction)

    # Email : toujours facultatif.
    email = Column(String(120), nullable=True)

    hashed_password = Column(String(255), nullable=False)
    first_name = Column(String(100), nullable=True)
    last_name = Column(String(100), nullable=True)

    role = Column(String(20), nullable=False, default=Role.ENSEIGNANT)
    # École de rattachement ; NULL pour l'admin plateforme (superadmin).
    tenant_id = Column(Integer, nullable=True, index=True)

    is_active = Column(Boolean, default=True, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
