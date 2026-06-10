"""
Gestion multi-tenant — SQLite (fichier par établissement) ou SQL Server (base dédiée par établissement)
"""
import os
from pathlib import Path
from typing import Generator, Optional
from urllib.parse import quote_plus

from fastapi import Depends, Header, HTTPException, status
from sqlalchemy import create_engine, text
from sqlalchemy.engine import Engine
from sqlalchemy.orm import Session, sessionmaker

from app.auth.security import get_current_user
from app.db.connection import DATABASE_URL, get_db_session, is_sqlite
from app.db.tenant_tables import create_tenant_tables
from app.db.migrations import run_tenant_migrations
from app.models.school import School

TENANT_DB_DIR = os.getenv("TENANT_DB_DIR", "./tenants")
DEFAULT_TENANT_DB_HOST = os.getenv("TENANT_DB_HOST", "localhost")
DEFAULT_TENANT_DB_PORT = int(os.getenv("TENANT_DB_PORT", "1433"))
DEFAULT_TENANT_DB_USERNAME = os.getenv("TENANT_DB_USERNAME", "sa")
DEFAULT_TENANT_DB_PASSWORD = os.getenv("TENANT_DB_PASSWORD", "YourPassword")


def tenant_schema_name(school_id: int) -> str:
    return f"school_{school_id}"


def _sqlite_tenant_path(schema_name: str) -> Path:
    return Path(TENANT_DB_DIR) / f"{schema_name}.db"


def _sqlite_tenant_url(schema_name: str) -> str:
    path = _sqlite_tenant_path(schema_name)
    return f"sqlite:///{path.resolve()}"


def default_tenant_db_credentials() -> dict:
    return {
        "db_host": DEFAULT_TENANT_DB_HOST,
        "db_port": DEFAULT_TENANT_DB_PORT,
        "db_username": DEFAULT_TENANT_DB_USERNAME,
        "db_password": DEFAULT_TENANT_DB_PASSWORD,
    }


def _sqlserver_url(host: str, port: int, username: str, password: str, database: str) -> str:
    user = quote_plus(username)
    pwd = quote_plus(password)
    return (
        f"mssql+pyodbc://{user}:{pwd}@{host}:{port}/{database}"
        f"?driver=ODBC+Driver+17+for+SQL+Server"
    )


class TenantManager:
    """Gestionnaire des connexions et provisioning par établissement."""

    def __init__(self):
        self.master_url = DATABASE_URL
        self.master_engine: Optional[Engine] = None
        self.tenant_engines: dict[str, Engine] = {}

    def _get_master_engine(self) -> Engine:
        if self.master_engine is None:
            connect_args = {"check_same_thread": False} if is_sqlite() else {}
            self.master_engine = create_engine(
                self.master_url, echo=False, connect_args=connect_args
            )
        return self.master_engine

    def get_tenant_engine(self, school: School) -> Engine:
        """Retourne (ou crée) le moteur SQLAlchemy pour un établissement."""
        schema_name = school.db_name or tenant_schema_name(school.id)
        cache_key = f"{school.id}:{schema_name}"

        if cache_key in self.tenant_engines:
            return self.tenant_engines[cache_key]

        if is_sqlite():
            Path(TENANT_DB_DIR).mkdir(parents=True, exist_ok=True)
            tenant_url = _sqlite_tenant_url(schema_name)
            engine = create_engine(
                tenant_url,
                echo=False,
                connect_args={"check_same_thread": False},
            )
        else:
            tenant_url = _sqlserver_url(
                school.db_host,
                school.db_port,
                school.db_username,
                school.db_password,
                school.db_name,
            )
            engine = create_engine(tenant_url, echo=False)

        self.tenant_engines[cache_key] = engine
        return engine

    def open_tenant_session(self, school: School) -> Session:
        engine = self.get_tenant_engine(school)
        SessionLocal = sessionmaker(bind=engine)
        return SessionLocal()

    def _ensure_sqlserver_database(self, school: School, database_name: str) -> None:
        """Crée la base SQL Server dédiée à l'établissement (style Sage 100)."""
        admin_engine = create_engine(
            _sqlserver_url(
                school.db_host,
                school.db_port,
                school.db_username,
                school.db_password,
                "master",
            ),
            echo=False,
            isolation_level="AUTOCOMMIT",
        )
        with admin_engine.connect() as conn:
            conn.execute(
                text(
                    f"IF NOT EXISTS (SELECT name FROM sys.databases WHERE name = N'{database_name}') "
                    f"CREATE DATABASE [{database_name}]"
                )
            )
        admin_engine.dispose()

    def test_server_connection(
        self,
        db_host: str,
        db_port: int,
        db_username: str,
        db_password: str,
    ) -> dict:
        """Teste l'accès au serveur SQL Server (connexion sur la base master)."""
        try:
            engine = create_engine(
                _sqlserver_url(db_host, db_port, db_username, db_password, "master"),
                echo=False,
            )
            with engine.connect() as conn:
                conn.execute(text("SELECT 1"))
            engine.dispose()
            return {
                "status": "connected",
                "message": "Connexion au serveur SQL Server OK",
            }
        except Exception as e:
            return {
                "status": "error",
                "message": str(e),
            }

    def provision_tenant(self, school: School) -> bool:
        """
        Provisionne la base tenant d'un établissement :
        - SQLite : crée le fichier + tables
        - SQL Server : crée une base dédiée + tables
        """
        database_name = school.db_name or tenant_schema_name(school.id)

        try:
            if is_sqlite():
                engine = self.get_tenant_engine(school)
                create_tenant_tables(engine)
                run_tenant_migrations(engine)
            else:
                self._ensure_sqlserver_database(school, database_name)
                engine = self.get_tenant_engine(school)
                create_tenant_tables(engine)
            return True
        except Exception as e:
            print(f"Erreur provisioning tenant {database_name}: {e}")
            return False

    def delete_tenant(self, school: School) -> bool:
        """Supprime la base tenant d'un établissement."""
        schema_name = school.db_name or tenant_schema_name(school.id)
        cache_key = f"{school.id}:{schema_name}"
        self.tenant_engines.pop(cache_key, None)

        try:
            if is_sqlite():
                path = _sqlite_tenant_path(schema_name)
                if path.exists():
                    path.unlink()
                return True

            admin_engine = create_engine(
                _sqlserver_url(
                    school.db_host,
                    school.db_port,
                    school.db_username,
                    school.db_password,
                    "master",
                ),
                echo=False,
                isolation_level="AUTOCOMMIT",
            )
            with admin_engine.connect() as conn:
                conn.execute(
                    text(
                        f"IF EXISTS (SELECT name FROM sys.databases WHERE name = N'{schema_name}') "
                        f"BEGIN "
                        f"ALTER DATABASE [{schema_name}] SET SINGLE_USER WITH ROLLBACK IMMEDIATE; "
                        f"DROP DATABASE [{schema_name}]; "
                        f"END"
                    )
                )
            admin_engine.dispose()
            return True
        except Exception as e:
            print(f"Erreur suppression tenant {schema_name}: {e}")
            return False

    def test_connection(self, school: School) -> dict:
        """Teste la connexion à la base tenant."""
        schema_name = school.db_name or tenant_schema_name(school.id)
        try:
            if is_sqlite():
                path = _sqlite_tenant_path(schema_name)
                if not path.exists():
                    return {
                        "status": "missing",
                        "message": "Base tenant non provisionnée",
                        "schema": schema_name,
                    }
                engine = self.get_tenant_engine(school)
            else:
                engine = self.get_tenant_engine(school)

            with engine.connect() as conn:
                conn.execute(text("SELECT 1"))
            return {
                "status": "connected",
                "message": "Connexion OK",
                "schema": schema_name,
            }
        except Exception as e:
            return {
                "status": "error",
                "message": str(e),
                "schema": schema_name,
            }

    def count_in_tenant(self, school: School, model) -> int:
        """Compte les enregistrements d'un modèle dans le tenant."""
        session = self.open_tenant_session(school)
        try:
            return session.query(model).count()
        except Exception:
            return 0
        finally:
            session.close()

    # Rétrocompatibilité
    def create_tenant_schema(self, school_id: int, schema_name: str) -> bool:
        school = School(id=school_id, db_name=schema_name)
        return self.provision_tenant(school)

    def delete_tenant_schema(self, schema_name: str) -> bool:
        school = School(id=0, db_name=schema_name)
        return self.delete_tenant(school)

    def get_tenant_session(
        self,
        school_id: int,
        db_host: str,
        db_port: int,
        db_name: str,
        db_username: str,
        db_password: str,
    ) -> Session:
        school = School(
            id=school_id,
            db_host=db_host,
            db_port=db_port,
            db_name=db_name,
            db_username=db_username,
            db_password=db_password,
        )
        return self.open_tenant_session(school)

    def get_master_session(self) -> Session:
        SessionLocal = sessionmaker(bind=self._get_master_engine())
        return SessionLocal()


tenant_manager = TenantManager()


def provision_all_schools(master_db: Session) -> None:
    """Provisionne les tenants manquants pour tous les établissements existants."""
    schools = master_db.query(School).all()
    for school in schools:
        if not school.db_name:
            school.db_name = tenant_schema_name(school.id)
        tenant_manager.provision_tenant(school)
    master_db.commit()


def get_tenant_session(
    current_user: dict = Depends(get_current_user),
    master_db: Session = Depends(get_db_session),
    x_school_id: Optional[int] = Header(None, alias="X-School-Id"),
) -> Generator[Session, None, None]:
    """
    Dépendance FastAPI : retourne la session DB de l'établissement courant.
    Le superadmin peut cibler un établissement via le header X-School-Id.
    """
    school_id = current_user.get("school_id")
    if current_user.get("role") == "superadmin" and x_school_id:
        school_id = x_school_id

    if not school_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Établissement non spécifié dans le token",
        )

    school = master_db.query(School).filter(School.id == school_id).first()
    if not school:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Établissement non trouvé",
        )

    if not school.db_name:
        school.db_name = tenant_schema_name(school.id)
        master_db.commit()

    session = tenant_manager.open_tenant_session(school)
    try:
        yield session
    finally:
        session.close()
