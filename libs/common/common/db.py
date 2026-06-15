"""Accès base de données partagé + multi-tenant par Row-Level Security.

Chaque service appelle ``init_engine(database_url)`` au démarrage, puis utilise
``tenant_session(tenant_id)`` pour obtenir une session dont toutes les requêtes
sont automatiquement filtrées par les policies RLS PostgreSQL.

Le filtrage repose sur ``SET LOCAL app.tenant_id = :tid`` exécuté à l'ouverture
de la transaction ; les policies comparent ``tenant_id`` à
``current_setting('app.tenant_id')``. Voir ``apply_tenant_rls`` pour générer la
policy sur une table.
"""
from contextlib import contextmanager
from typing import Iterator, Optional

from sqlalchemy import create_engine, text
from sqlalchemy.orm import Session, sessionmaker, declarative_base

Base = declarative_base()

_engine = None
_SessionLocal: Optional[sessionmaker] = None


def init_engine(database_url: str, *, echo: bool = False):
    """Initialise l'engine et la factory de sessions du service (idempotent)."""
    global _engine, _SessionLocal
    if _engine is None:
        _engine = create_engine(database_url, echo=echo, pool_pre_ping=True, future=True)
        _SessionLocal = sessionmaker(bind=_engine, autoflush=False, future=True)
    return _engine


def get_engine():
    if _engine is None:
        raise RuntimeError("init_engine() doit être appelé au démarrage du service.")
    return _engine


def add_missing_columns(table: str, columns: dict[str, str]) -> None:
    """Ajoute des colonnes manquantes à une table existante (PostgreSQL).

    `create_all` ne modifie jamais une table déjà créée : ce helper comble les
    colonnes ajoutées au modèle après coup, de façon idempotente et sans perte de
    données. No-op hors PostgreSQL (SQLite des tests : tables fraîches).
    """
    eng = get_engine()
    if eng.dialect.name != "postgresql":
        return
    try:
        with eng.begin() as conn:
            for col, ddl in columns.items():
                conn.execute(text(f"ALTER TABLE {table} ADD COLUMN IF NOT EXISTS {col} {ddl}"))
    except Exception:  # best-effort : ne bloque pas le démarrage
        pass


@contextmanager
def tenant_session(tenant_id: Optional[int]) -> Iterator[Session]:
    """Session liée à un tenant : positionne ``app.tenant_id`` pour la RLS.

    ``tenant_id=None`` (admin plateforme) ouvre une session sans restriction de
    tenant — réservée aux rôles autorisés à bypasser la RLS côté DB.
    """
    if _SessionLocal is None:
        raise RuntimeError("init_engine() doit être appelé au démarrage du service.")
    session = _SessionLocal()
    try:
        if tenant_id is not None:
            session.execute(
                text("SET LOCAL app.tenant_id = :tid"), {"tid": str(tenant_id)}
            )
        yield session
        session.commit()
    except Exception:
        session.rollback()
        raise
    finally:
        session.close()


def apply_tenant_rls(table_name: str, *, tenant_column: str = "tenant_id") -> list[str]:
    """Retourne les ordres SQL activant la RLS sur une table école.

    À jouer dans les migrations Alembic des tables porteuses de ``tenant_id``.
    """
    return [
        f"ALTER TABLE {table_name} ENABLE ROW LEVEL SECURITY",
        f"ALTER TABLE {table_name} FORCE ROW LEVEL SECURITY",
        (
            f"CREATE POLICY {table_name}_tenant_isolation ON {table_name} "
            f"USING ({tenant_column} = current_setting('app.tenant_id')::int) "
            f"WITH CHECK ({tenant_column} = current_setting('app.tenant_id')::int)"
        ),
    ]
