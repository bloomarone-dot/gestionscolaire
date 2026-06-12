#!/usr/bin/env bash
# Crée le super-administrateur dans auth-service (idempotent).
# À lancer une fois la stack démarrée : ./scripts/seed-superadmin.sh
#
# Personnalisation :
#   SUPERADMIN_PHONE=691234567 SUPERADMIN_PASSWORD='MonMotDePasse!' ./scripts/seed-superadmin.sh
set -euo pipefail

docker compose exec -T \
  -e SUPERADMIN_PHONE="${SUPERADMIN_PHONE:-690000000}" \
  -e SUPERADMIN_PASSWORD="${SUPERADMIN_PASSWORD:-ChangeMe2026!}" \
  -e SUPERADMIN_FIRST_NAME="${SUPERADMIN_FIRST_NAME:-Super}" \
  -e SUPERADMIN_LAST_NAME="${SUPERADMIN_LAST_NAME:-Admin}" \
  auth-service python -m app.seed
