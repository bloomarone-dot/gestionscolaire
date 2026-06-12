"""Appel REST interne au référentiel pour l'héritage des matières (§4.2)."""
from common.http_client import InternalClient
from common.tenant import TenantContext

from app.config import settings

_client = InternalClient(
    base_url=settings.referentiel_service_url,
    internal_secret=settings.internal_shared_secret,
)


def fetch_official_subjects(
    ctx: TenantContext, level_code: str, series_code: str | None
) -> list[dict]:
    """Retourne les matières officielles + coefficients pour un profil de classe.

    Format des éléments : {code, name, default_coefficient, is_obligatoire}.
    """
    params = {"level": level_code}
    if series_code:
        params["series"] = series_code
    return _client.get("/referentiel/subjects", ctx=ctx, params=params)
