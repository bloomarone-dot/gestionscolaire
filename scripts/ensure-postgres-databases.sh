#!/usr/bin/env bash
# Crée les bases PostgreSQL manquantes (idempotent — volume pg_data déjà initialisé).
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

DATABASES=(
  auth_db tenant_db referentiel_db pedagogie_db personnel_db
  eleves_db evaluations_db bulletins_db notifications_db
  tresorerie_db planning_db
)

echo "→ Bases PostgreSQL..."
for db in "${DATABASES[@]}"; do
  docker compose exec -T postgres psql -U gs -d postgres -tc \
    "SELECT 1 FROM pg_database WHERE datname = '${db}'" | grep -q 1 \
    || docker compose exec -T postgres psql -U gs -d postgres -c "CREATE DATABASE ${db};"
  echo "  ${db} : OK"
done
