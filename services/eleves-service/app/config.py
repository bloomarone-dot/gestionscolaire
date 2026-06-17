from common.config import BaseServiceSettings


class Settings(BaseServiceSettings):
    service_name: str = "eleves-service"
    database_url: str = "postgresql+psycopg2://gs:gs@postgres:5432/eleves_db"
    # Matières héritées (§6.2) lues sur pedagogie-service (dérivation, sans duplication).
    pedagogie_service_url: str = "http://pedagogie-service:8000"


settings = Settings()
