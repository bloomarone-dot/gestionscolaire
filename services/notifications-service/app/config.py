from common.config import BaseServiceSettings


class Settings(BaseServiceSettings):
    service_name: str = "notifications-service"
    database_url: str = "postgresql+psycopg2://gs:gs@postgres:5432/notifications_db"


settings = Settings()
