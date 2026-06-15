from common.config import BaseServiceSettings


class Settings(BaseServiceSettings):
    service_name: str = "personnel-service"
    database_url: str = "postgresql+psycopg2://gs:gs@postgres:5432/personnel_db"
    # Création du compte de connexion (téléphone + mot de passe) via auth-service.
    auth_service_url: str = "http://auth-service:8000"


settings = Settings()
