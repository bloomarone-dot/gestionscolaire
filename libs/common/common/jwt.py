"""Émission et validation des JWT.

Le token porte les claims imposés par le cahier des charges :
``sub`` (identifiant de connexion = téléphone), ``tenant_id`` (école),
``role`` et ``user_id``. Le ``tenant_id`` est ``None`` pour l'admin plateforme
(superadmin), qui n'est rattaché à aucune école.
"""
from datetime import datetime, timedelta, timezone
from typing import Optional

from jose import JWTError, jwt
from pydantic import BaseModel

from common.config import get_base_settings


class TokenPayload(BaseModel):
    sub: str  # identifiant de connexion (téléphone)
    user_id: int
    role: str  # superadmin | admin | direction | enseignant | parent
    tenant_id: Optional[int] = None  # école ; None pour l'admin plateforme


def create_access_token(
    payload: TokenPayload,
    expires_delta: Optional[timedelta] = None,
) -> str:
    settings = get_base_settings()
    expire = datetime.now(timezone.utc) + (
        expires_delta or timedelta(minutes=settings.access_token_expire_minutes)
    )
    to_encode = payload.model_dump()
    to_encode["exp"] = expire
    return jwt.encode(to_encode, settings.jwt_secret, algorithm=settings.jwt_algorithm)


def decode_token(token: str) -> TokenPayload:
    """Décode et valide un JWT. Lève ``JWTError`` si invalide/expiré."""
    settings = get_base_settings()
    data = jwt.decode(token, settings.jwt_secret, algorithms=[settings.jwt_algorithm])
    return TokenPayload(
        sub=data["sub"],
        user_id=data["user_id"],
        role=data["role"],
        tenant_id=data.get("tenant_id"),
    )


__all__ = ["TokenPayload", "create_access_token", "decode_token", "JWTError"]
