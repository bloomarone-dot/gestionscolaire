from common.config import BaseServiceSettings


class Settings(BaseServiceSettings):
    service_name: str = "pedagogie-service"
    database_url: str = "postgresql+psycopg2://gs:gs@postgres:5432/pedagogie_db"


settings = Settings()
