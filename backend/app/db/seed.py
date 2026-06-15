"""
Initialisation de la base de données et création du super-administrateur.
Usage: python -m app.db.seed
"""
import logging

from app.db.connection import SessionLocal, engine
from app.db.tenant_tables import create_master_tables
from app.models.school import Admin
from app.auth.security import hash_password

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

SUPERADMIN = {
    "username": "superadmin",
    "email": "superadmin@edusaas.fr",
    "password": "EduSaaS2026!",
    "first_name": "Super",
    "last_name": "Administrateur",
}


def create_superadmin(force: bool = False) -> Admin | None:
    """Crée le super-administrateur s'il n'existe pas encore."""
    create_master_tables(engine)
    db = SessionLocal()

    try:
        existing = db.query(Admin).filter(Admin.role == "superadmin").first()

        if existing and not force:
            logger.info(
                "Super-administrateur déjà présent: %s (%s)",
                existing.username,
                existing.email,
            )
            return existing

        if existing and force:
            db.delete(existing)
            db.commit()
            logger.info("Ancien super-administrateur supprimé.")

        username_taken = db.query(Admin).filter(
            Admin.username == SUPERADMIN["username"]
        ).first()
        if username_taken:
            raise RuntimeError(
                f"Le nom d'utilisateur '{SUPERADMIN['username']}' est déjà utilisé."
            )

        superadmin = Admin(
            username=SUPERADMIN["username"],
            email=SUPERADMIN["email"],
            hashed_password=hash_password(SUPERADMIN["password"]),
            first_name=SUPERADMIN["first_name"],
            last_name=SUPERADMIN["last_name"],
            role="superadmin",
            is_active=True,
        )
        db.add(superadmin)
        db.commit()
        db.refresh(superadmin)

        logger.info("Super-administrateur créé avec succès.")
        logger.info("  Username : %s", SUPERADMIN["username"])
        logger.info("  Email    : %s", SUPERADMIN["email"])
        logger.info("  Mot de passe : %s", SUPERADMIN["password"])

        return superadmin

    except Exception as e:
        db.rollback()
        logger.error("Erreur lors de la création du super-administrateur : %s", e)
        raise
    finally:
        db.close()


def init_db(force: bool = False):
    create_superadmin(force=force)


if __name__ == "__main__":
    init_db(force=True)
