import os
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, declarative_base

# Récupère l'URL de la base depuis ton fichier .env ou ton conteneur Docker
# Si pas définie, par défaut, il utilise SQLite pour tes tests locaux
DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///./test.db")

engine = create_engine(DATABASE_URL, connect_args={"check_same_thread": False})
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

# Fonction pour injecter la session dans tes routes FastAPI
def get_db_session():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()