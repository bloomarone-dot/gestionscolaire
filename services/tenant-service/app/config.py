from common.config import BaseServiceSettings


class Settings(BaseServiceSettings):
    service_name: str = "tenant-service"
    database_url: str = "postgresql+psycopg2://gs:gs@postgres:5432/tenant_db"


settings = Settings()
