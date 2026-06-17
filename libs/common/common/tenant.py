"""Contexte multi-tenant côté service.

La gateway valide le JWT et propage l'identité via des en-têtes internes signés
(``X-User-Id``, ``X-Role``, ``X-Tenant-Id``, ``X-Internal-Secret``). Les services
n'ont pas à re-décoder le JWT : ils font confiance à ces en-têtes sur le réseau
interne, protégé par ``internal_shared_secret``.
"""
from typing import Optional

from fastapi import Depends, Header, HTTPException, status
from pydantic import BaseModel

from common.config import get_base_settings


class TenantContext(BaseModel):
    user_id: int
    role: str
    tenant_id: Optional[int] = None  # None = admin plateforme (superadmin)


def _verify_internal(secret: Optional[str]) -> None:
    expected = get_base_settings().internal_shared_secret
    if secret != expected:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Requête interne non autorisée (en-tête de confiance invalide).",
        )


def get_context(
    x_user_id: Optional[int] = Header(None, alias="X-User-Id"),
    x_role: Optional[str] = Header(None, alias="X-Role"),
    x_tenant_id: Optional[int] = Header(None, alias="X-Tenant-Id"),
    x_internal_secret: Optional[str] = Header(None, alias="X-Internal-Secret"),
) -> TenantContext:
    """Dépendance FastAPI : reconstruit le contexte d'appel depuis la gateway."""
    _verify_internal(x_internal_secret)
    if not x_user_id or not x_role:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Contexte utilisateur manquant.",
        )
    return TenantContext(user_id=x_user_id, role=x_role, tenant_id=x_tenant_id)


def require_tenant(ctx: TenantContext = Depends(get_context)) -> TenantContext:
    """Exige un ``tenant_id`` (route de données école)."""
    if ctx.tenant_id is None:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Établissement (tenant) non spécifié pour cette opération.",
        )
    return ctx


def require_roles(*roles: str):
    """Fabrique une dépendance qui restreint l'accès à certains rôles."""

    def _checker(ctx: TenantContext = Depends(get_context)) -> TenantContext:
        if ctx.role not in roles:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Rôle '{ctx.role}' non autorisé pour cette opération.",
            )
        return ctx

    return _checker
