from common.config import BaseServiceSettings


class Settings(BaseServiceSettings):
    service_name: str = "pedagogie-service"
    database_url: str = "postgresql+psycopg2://gs:gs@postgres:5432/pedagogie_db"
    # Référentiel national (héritage des matières §4.2) consommé en REST interne.
    referentiel_service_url: str = "http://referentiel-service:8000"


settings = Settings()
