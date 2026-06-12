from common.config import BaseServiceSettings


class Settings(BaseServiceSettings):
    service_name: str = "personnel-service"
    database_url: str = "postgresql+psycopg2://gs:gs@postgres:5432/personnel_db"


settings = Settings()
