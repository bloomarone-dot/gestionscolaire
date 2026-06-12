from common.config import BaseServiceSettings


class Settings(BaseServiceSettings):
    service_name: str = "notifications-service"
    database_url: str = "postgresql+psycopg2://gs:gs@postgres:5432/notifications_db"
    # Canaux activés par l'école (§12.2) lus sur tenant-service.
    tenant_service_url: str = "http://tenant-service:8000"
    notifications_queue: str = "notifications"


settings = Settings()
