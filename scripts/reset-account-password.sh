#!/usr/bin/env bash
# Réinitialise le mot de passe d'un compte (par téléphone).
#
# Usage :
#   PHONE=690000101 NEW_PASSWORD='RoyalAdmin2026!' ./scripts/reset-account-password.sh
set -euo pipefail

PHONE="${PHONE:?Définissez PHONE=...}"
NEW_PASSWORD="${NEW_PASSWORD:?Définissez NEW_PASSWORD=...}"

docker compose exec -T auth-service python - <<PY
from sqlalchemy import select
from sqlalchemy.orm import sessionmaker
from common.db import init_engine, get_engine
from common.security import hash_password
from app.config import settings
from app.models import Account

init_engine(settings.database_url)
db = sessionmaker(bind=get_engine())()
acc = db.scalar(select(Account).where(Account.phone == "${PHONE}"))
if not acc:
    raise SystemExit("Compte introuvable pour le téléphone ${PHONE}")
acc.hashed_password = hash_password("${NEW_PASSWORD}")
db.commit()
print(f"✓ Mot de passe mis à jour pour {acc.phone} (role={acc.role}, tenant={acc.tenant_id})")
PY
