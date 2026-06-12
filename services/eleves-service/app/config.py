from common.config import BaseServiceSettings


class Settings(BaseServiceSettings):
    service_name: str = "eleves-service"
    database_url: str = "postgresql+psycopg2://gs:gs@postgres:5432/eleves_db"


settings = Settings()
