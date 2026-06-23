from common.config import BaseServiceSettings


class PlanningSettings(BaseServiceSettings):
    service_name: str = "planning-service"


settings = PlanningSettings()
