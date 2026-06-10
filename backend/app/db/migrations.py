"""
Migrations légères au démarrage (SQLite dev).
"""
from sqlalchemy import text
from sqlalchemy.engine import Engine

from app.db.connection import is_sqlite

SCHOOL_COLUMN_MIGRATIONS = [
    ("directeur_first_name", "VARCHAR(100)"),
    ("directeur_last_name", "VARCHAR(100)"),
    ("directeur_email", "VARCHAR(100)"),
    ("directeur_phone", "VARCHAR(20)"),
    ("logo_url", "TEXT"),
    ("primary_color", "VARCHAR(7) DEFAULT '#10b981'"),
    ("secondary_color", "VARCHAR(7) DEFAULT '#f59e0b'"),
]

PERIODE_NOTE_COLUMNS = [
    ("classe_id", "INTEGER"),
    ("matiere_id", "INTEGER"),
    ("date_debut", "DATE"),
    ("date_fin", "DATE"),
    ("justification_autorisee", "BOOLEAN DEFAULT 1"),
    ("created_at", "DATETIME DEFAULT CURRENT_TIMESTAMP"),
    ("updated_at", "DATETIME DEFAULT CURRENT_TIMESTAMP"),
]


def run_master_migrations(engine: Engine) -> None:
    """Ajoute les colonnes manquantes sur la table schools (SQLite)."""
    if not is_sqlite():
        return

    with engine.connect() as conn:
        existing_schools = {
            row[1]
            for row in conn.execute(text("PRAGMA table_info(schools)")).fetchall()
        }
        for column_name, column_type in SCHOOL_COLUMN_MIGRATIONS:
            if column_name not in existing_schools:
                conn.execute(
                    text(f"ALTER TABLE schools ADD COLUMN {column_name} {column_type}")
                )

        conn.commit()


def run_tenant_migrations(engine: Engine) -> None:
    """Migrations légères sur les bases tenant (SQLite)."""
    if not is_sqlite():
        return

    with engine.connect() as conn:
        existing_periode = {
            row[1]
            for row in conn.execute(text("PRAGMA table_info(periodes_saisie_notes)")).fetchall()
        }
        if "id" not in existing_periode:
            conn.execute(text("""
                CREATE TABLE periodes_saisie_notes (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    classe_id INTEGER NOT NULL,
                    matiere_id INTEGER NOT NULL,
                    date_debut DATE NOT NULL,
                    date_fin DATE NOT NULL,
                    justification_autorisee BOOLEAN DEFAULT 1,
                    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
                )
            """))
        else:
            for column_name, column_type in PERIODE_NOTE_COLUMNS:
                if column_name not in existing_periode:
                    conn.execute(
                        text(f"ALTER TABLE periodes_saisie_notes ADD COLUMN {column_name} {column_type}")
                    )

        conn.commit()
