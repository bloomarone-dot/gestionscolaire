from common.config import BaseServiceSettings


class Settings(BaseServiceSettings):
    service_name: str = "bulletins-service"
    database_url: str = "postgresql+psycopg2://gs:gs@postgres:5432/bulletins_db"
    # Agrégation des données du bulletin (REST interne).
    eleves_service_url: str = "http://eleves-service:8000"
    pedagogie_service_url: str = "http://pedagogie-service:8000"
    evaluations_service_url: str = "http://evaluations-service:8000"
    tenant_service_url: str = "http://tenant-service:8000"


settings = Settings()
