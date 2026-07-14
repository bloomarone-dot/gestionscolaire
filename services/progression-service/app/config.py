from common.config import BaseServiceSettings


class Settings(BaseServiceSettings):
    service_name: str = "progression-service"
    database_url: str = "postgresql+psycopg2://gs:gs@postgres:5432/progression_db"

    bulletins_service_url: str = "http://bulletins-service:8000"
    eleves_service_url: str = "http://eleves-service:8000"
    pedagogie_service_url: str = "http://pedagogie-service:8000"


settings = Settings()
