"""gs-common — bibliothèque partagée des microservices SaaS Scolaire.

Expose les briques transverses : configuration, sécurité (JWT + mots de passe),
contexte multi-tenant (RLS PostgreSQL), accès base de données, bus d'événements
RabbitMQ et client HTTP interne.
"""

from common.config import BaseServiceSettings
from common.security import hash_password, verify_password
from common.jwt import TokenPayload, create_access_token, decode_token
from common.tenant import TenantContext, require_tenant, require_roles

__all__ = [
    "BaseServiceSettings",
    "hash_password",
    "verify_password",
    "TokenPayload",
    "create_access_token",
    "decode_token",
    "TenantContext",
    "require_tenant",
    "require_roles",
]
