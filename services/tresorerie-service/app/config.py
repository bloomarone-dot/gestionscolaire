from common.config import BaseServiceSettings


class TresorerieSettings(BaseServiceSettings):
    service_name: str = "tresorerie-service"


settings = TresorerieSettings()
