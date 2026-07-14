from common.config import BaseServiceSettings


class Settings(BaseServiceSettings):
    service_name: str = "personnel-service"
    database_url: str = "postgresql+psycopg2://gs:gs@postgres:5432/personnel_db"
    auth_service_url: str = "http://auth-service:8000"
    tenant_service_url: str = "http://tenant-service:8000"


settings = Settings()
