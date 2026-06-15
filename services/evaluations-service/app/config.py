from common.config import BaseServiceSettings


class Settings(BaseServiceSettings):
    service_name: str = "evaluations-service"
    database_url: str = "postgresql+psycopg2://gs:gs@postgres:5432/evaluations_db"


settings = Settings()
