from common.config import BaseServiceSettings


class Settings(BaseServiceSettings):
    service_name: str = "referentiel-service"
    database_url: str = "postgresql+psycopg2://gs:gs@postgres:5432/referentiel_db"


settings = Settings()
