"""Configuration de la gateway : table de routage vers les services aval."""
from common.config import BaseServiceSettings


class GatewaySettings(BaseServiceSettings):
    service_name: str = "api-gateway"

    # URLs internes des services (réseau docker-compose).
    auth_service_url: str = "http://auth-service:8000"
    tenant_service_url: str = "http://tenant-service:8000"
    referentiel_service_url: str = "http://referentiel-service:8000"
    pedagogie_service_url: str = "http://pedagogie-service:8000"
    personnel_service_url: str = "http://personnel-service:8000"
    eleves_service_url: str = "http://eleves-service:8000"
    evaluations_service_url: str = "http://evaluations-service:8000"
    bulletins_service_url: str = "http://bulletins-service:8000"
    notifications_service_url: str = "http://notifications-service:8000"
    tresorerie_service_url: str = "http://tresorerie-service:8000"
    planning_service_url: str = "http://planning-service:8000"
    progression_service_url: str = "http://progression-service:8000"

    cors_origins: str = "http://localhost:5173,http://127.0.0.1:5173,http://localhost:5180,http://127.0.0.1:5180"

    def routes(self) -> dict[str, str]:
        """Préfixe d'URL publique -> URL du service cible."""
        return {
            "auth": self.auth_service_url,
            "tenants": self.tenant_service_url,
            "referentiel": self.referentiel_service_url,
            "pedagogie": self.pedagogie_service_url,
            "personnel": self.personnel_service_url,
            "eleves": self.eleves_service_url,
            "evaluations": self.evaluations_service_url,
            "bulletins": self.bulletins_service_url,
            "notifications": self.notifications_service_url,
            "tresorerie": self.tresorerie_service_url,
            "planning": self.planning_service_url,
            "progression": self.progression_service_url,
        }


settings = GatewaySettings()
