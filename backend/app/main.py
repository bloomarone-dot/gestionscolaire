import os
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api import endpoints, auth, schools, admin, professor, superadmin, notes, bulletins
from app.db.connection import engine, SessionLocal
from app.db.tenant_tables import create_master_tables
from app.db.migrations import run_master_migrations
from app.db.multi_tenant import provision_all_schools
from app.models import school  # noqa: F401 — enregistre les modèles
from app.models.school import Admin


def _seed_demo_if_empty(db) -> None:
    """Crée les comptes démo si la base est vide — désactivé par défaut (prod / client)."""
    if os.getenv("SEED_DEMO_ON_START", "false").lower() not in ("1", "true", "yes"):
        return
    if db.query(Admin).count() > 0:
        return
    from app.db.demo_seed import run_demo_seed

    run_demo_seed()


@asynccontextmanager
async def lifespan(app: FastAPI):
    create_master_tables(engine)
    run_master_migrations(engine)
    db = SessionLocal()
    try:
        provision_all_schools(db)
        _seed_demo_if_empty(db)
    finally:
        db.close()
    yield


app = FastAPI(title="SaaS Scolaire API", lifespan=lifespan)

_cors_raw = os.getenv(
    "CORS_ORIGINS",
    "http://localhost:5173,http://127.0.0.1:5173",
)
_cors_origins = [o.strip() for o in _cors_raw.split(",") if o.strip()]

app.add_middleware(
    CORSMiddleware,
    allow_origins=_cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router, prefix="/auth", tags=["Authentication"])
app.include_router(schools.router, tags=["School Management"])
app.include_router(admin.router, tags=["Admin Management"])
app.include_router(professor.router, tags=["Professor Management"])
app.include_router(superadmin.router, prefix="/superadmin", tags=["Super Admin"])
app.include_router(notes.router, tags=["Notes"])
app.include_router(bulletins.router, tags=["Bulletins"])
app.include_router(endpoints.router, tags=["Legacy"])


@app.get("/", tags=["General"])
def read_root():
    return {"message": "Bienvenue sur l'API SaaS Scolaire. Le serveur est opérationnel !"}
