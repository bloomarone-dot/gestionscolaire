"""
Séparation tables maître / tenant et création des schémas par établissement.
"""
from sqlalchemy.engine import Engine

from app.db.connection import Base

MASTER_TABLE_NAMES = frozenset({"schools", "admins", "activity_logs"})

TENANT_TABLE_NAMES = frozenset({
    "users",
    "annees_scolaires",
    "classes",
    "matieres",
    "professeurs",
    "attributions_professeurs",
    "eleves",
    "notes",
    "emploi_temps",
    "bulletins",
})


def _tables_for(names: frozenset):
    return [
        Base.metadata.tables[name]
        for name in names
        if name in Base.metadata.tables
    ]


def create_master_tables(engine: Engine) -> None:
    """Crée uniquement les tables de la BD maître (superadmin)."""
    tables = _tables_for(MASTER_TABLE_NAMES)
    if tables:
        Base.metadata.create_all(bind=engine, tables=tables)


def create_tenant_tables(engine: Engine, schema_name: str | None = None) -> None:
    """
    Crée les tables métier dans un tenant.
    - SQLite : fichier dédié par établissement (pas de schema)
    - SQL Server : tables dans le schema school_X
    """
    tables = _tables_for(TENANT_TABLE_NAMES)
    if not tables:
        return

    if schema_name:
        for table in tables:
            table.schema = schema_name

    try:
        Base.metadata.create_all(bind=engine, tables=tables)
    finally:
        if schema_name:
            for table in tables:
                table.schema = None
