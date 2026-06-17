"""Création du compte de connexion (téléphone + mot de passe) via auth-service."""
import secrets

import httpx

from common.http_client import InternalClient
from common.tenant import TenantContext

from app.config import settings

_client = InternalClient(
    base_url=settings.auth_service_url,
    internal_secret=settings.internal_shared_secret,
)


class AuthClientError(Exception):
    """Erreur remontée par auth-service (statut HTTP + message lisible)."""

    def __init__(self, status_code: int, detail: str):
        self.status_code = status_code
        self.detail = detail
        super().__init__(detail)


def create_login_account(
    ctx: TenantContext,
    *,
    phone: str,
    role: str,                 # « enseignant » | « direction »
    first_name: str | None,
    last_name: str | None,
    phone2: str | None = None,
    email: str | None = None,
    password: str | None = None,
) -> dict:
    """Crée le compte d'authentification et renvoie sa représentation (avec id).

    Le mot de passe est généré s'il n'est pas fourni (à communiquer à l'agent).
    """
    pwd = password or secrets.token_urlsafe(9)
    try:
        account = _client.post(
            "/auth/accounts",
            ctx=ctx,
            json={
                "phone": phone,
                "password": pwd,
                "role": role,
                "tenant_id": ctx.tenant_id,
                "phone2": phone2,
                "email": email,
                "first_name": first_name,
                "last_name": last_name,
            },
        )
    except httpx.HTTPStatusError as exc:
        detail = "Impossible de créer le compte de connexion."
        try:
            body = exc.response.json()
            if isinstance(body.get("detail"), str):
                detail = body["detail"]
            elif isinstance(body.get("detail"), list):
                detail = ", ".join(
                    item.get("msg", str(item)) for item in body["detail"]
                )
        except Exception:
            pass
        raise AuthClientError(exc.response.status_code, detail) from exc
    account["generated_password"] = None if password else pwd
    return account


def delete_login_account(ctx: TenantContext, account_id: int) -> None:
    """Supprime un compte auth (rollback ou suppression du personnel)."""
    try:
        _client.delete(f"/auth/accounts/{account_id}", ctx=ctx)
    except httpx.HTTPStatusError:
        # Best-effort : ne pas masquer l'erreur principale si le rollback échoue.
        pass
