"""Fabrique d'application FastAPI standard pour les microservices.

Fournit une app préconfigurée (titre, endpoint ``/health``, OpenAPI) afin que
chaque service se réduise à : ses settings, ses modèles, ses routeurs.
"""
from typing import Callable, Optional

from fastapi import FastAPI


def create_service_app(
    *,
    title: str,
    version: str = "0.1.0",
    on_startup: Optional[Callable[[], None]] = None,
) -> FastAPI:
    app = FastAPI(title=title, version=version)

    @app.on_event("startup")
    def _startup() -> None:
        if on_startup is not None:
            on_startup()

    @app.get("/health", tags=["infra"])
    def health() -> dict:
        return {"status": "ok", "service": title}

    return app
