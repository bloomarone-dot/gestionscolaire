"""Création idempotente du compte super-administrateur (admin plateforme).

Le superadmin n'a pas de tenant (tenant_id = NULL) et se connecte, comme tout le
personnel, par téléphone + mot de passe.

Usage (dans le conteneur) :
    docker compose exec auth-service python -m app.seed

Variables d'environnement (sinon valeurs par défaut) :
    SUPERADMIN_PHONE       (défaut: 690000000)
    SUPERADMIN_PASSWORD    (défaut: ChangeMe2026!)
    SUPERADMIN_FIRST_NAME  (défaut: Super)
    SUPERADMIN_LAST_NAME   (défaut: Admin)
"""
import os
from typing import Optional

from sqlalchemy.orm import Session

from common.security import hash_password

from app.models import Account, Role


def create_superadmin(
    session: Session,
    *,
    phone: str,
    password: str,
    first_name: Optional[str] = None,
    last_name: Optional[str] = None,
    force: bool = False,
) -> Account:
    """Crée le superadmin s'il n'existe pas (idempotent).

    - Si un superadmin existe déjà et `force` est False → le retourne tel quel.
    - Si le téléphone est déjà pris par un autre compte → lève RuntimeError.
    """
    existing = session.query(Account).filter(Account.role == Role.SUPERADMIN).first()
    if existing and not force:
        return existing

    clash = session.query(Account).filter(Account.phone == phone).first()
    if clash and (not existing or clash.id != existing.id):
        raise RuntimeError(f"Le téléphone {phone} est déjà utilisé par un autre compte.")

    account = Account(
        phone=phone,
        hashed_password=hash_password(password),
        first_name=first_name,
        last_name=last_name,
        role=Role.SUPERADMIN,
        tenant_id=None,
        is_active=True,
    )
    session.add(account)
    session.commit()
    session.refresh(account)
    return account


def main() -> None:
    from sqlalchemy.orm import sessionmaker

    from common.db import Base, get_engine, init_engine

    from app.config import settings
    from app import models  # noqa: F401 — enregistre les tables

    init_engine(settings.database_url)
    Base.metadata.create_all(bind=get_engine())
    db = sessionmaker(bind=get_engine())()

    phone = os.getenv("SUPERADMIN_PHONE", "690000000")
    password = os.getenv("SUPERADMIN_PASSWORD", "ChangeMe2026!")
    try:
        existed = db.query(Account).filter(Account.role == Role.SUPERADMIN).first()
        account = create_superadmin(
            db,
            phone=phone,
            password=password,
            first_name=os.getenv("SUPERADMIN_FIRST_NAME", "Super"),
            last_name=os.getenv("SUPERADMIN_LAST_NAME", "Admin"),
        )
        if existed:
            print(f"✓ Super-administrateur déjà présent (téléphone {account.phone}). Aucun changement.")
        else:
            print("✓ Super-administrateur créé.")
            print(f"    Téléphone   : {phone}")
            print(f"    Mot de passe: {password}")
            print("  ⚠️  Changez ce mot de passe après la première connexion.")
    finally:
        db.close()


if __name__ == "__main__":
    main()
