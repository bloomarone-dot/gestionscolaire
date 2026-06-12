from common.config import BaseServiceSettings


class Settings(BaseServiceSettings):
    service_name: str = "bulletins-service"
    database_url: str = "postgresql+psycopg2://gs:gs@postgres:5432/bulletins_db"


settings = Settings()
