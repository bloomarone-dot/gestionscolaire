"""referentiel-service — Référentiel national MINESEC (lecture seule écoles, écriture admin plateforme).

Squelette bootable (health + init engine). La logique métier est ajoutée lors de
la phase dédiée, en suivant la structure du service de référence `auth-service`.
"""
from common.db import init_engine
from common.service import create_service_app

from app.config import settings


def _startup() -> None:
    # Engine paresseux (pool_pre_ping) : aucune table créée ici — Alembic en Phase 5.
    init_engine(settings.database_url)


app = create_service_app(title="referentiel-service — SaaS Scolaire", on_startup=_startup)
