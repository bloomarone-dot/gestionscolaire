from common.config import BaseServiceSettings


class AuthSettings(BaseServiceSettings):
    service_name: str = "auth-service"
    database_url: str = "postgresql+psycopg2://gs:gs@postgres:5432/auth_db"


settings = AuthSettings()
