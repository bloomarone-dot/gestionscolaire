"""Création du compte de connexion (téléphone + mot de passe) via auth-service."""
import secrets

from common.http_client import InternalClient
from common.tenant import TenantContext

from app.config import settings

_client = InternalClient(
    base_url=settings.auth_service_url,
    internal_secret=settings.internal_shared_secret,
)


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
    account = _client.post(
        "/auth/accounts",
        ctx=ctx,
        json={
            "phone": phone, "password": pwd, "role": role,
            "phone2": phone2, "email": email,
            "first_name": first_name, "last_name": last_name,
        },
    )
    account["generated_password"] = None if password else pwd
    return account
