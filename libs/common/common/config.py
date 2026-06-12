"""Configuration de base partagée par tous les services.

Chaque service hérite de ``BaseServiceSettings`` et y ajoute ses propres
réglages. Les valeurs proviennent des variables d'environnement (12-factor).
"""
from functools import lru_cache

from pydantic_settings import BaseSettings, SettingsConfigDict


class BaseServiceSettings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    # Identité du service (surchargée par chaque service)
    service_name: str = "service"

    # ── JWT (secret partagé entre auth-service et la gateway) ──
    jwt_secret: str = "change-me-in-prod"
    jwt_algorithm: str = "HS256"
    access_token_expire_minutes: int = 60

    # ── Base de données PostgreSQL du service ──
    # ex: postgresql+psycopg2://gs:gs@postgres:5432/auth_db
    database_url: str = "postgresql+psycopg2://gs:gs@localhost:5432/postgres"

    # ── Bus d'événements RabbitMQ ──
    rabbitmq_url: str = "amqp://guest:guest@localhost:5672/"
    events_exchange: str = "gs.events"

    # ── Cache Redis (référentiel) ──
    redis_url: str = "redis://localhost:6379/0"

    # ── Confiance réseau interne : les services lisent les en-têtes X-* posés
    # par la gateway et ne re-décodent pas le JWT. Ce secret protège ce canal. ──
    internal_shared_secret: str = "change-me-internal"


@lru_cache
def get_base_settings() -> BaseServiceSettings:
    return BaseServiceSettings()
