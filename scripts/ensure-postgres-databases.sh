#!/usr/bin/env bash
# Crée les bases PostgreSQL manquantes (idempotent — volume pg_data déjà initialisé).
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

DATABASES=(
  auth_db tenant_db referentiel_db pedagogie_db personnel_db
  eleves_db evaluations_db bulletins_db notifications_db
  tresorerie_db planning_db progression_db
)

echo "→ Bases PostgreSQL..."
for db in "${DATABASES[@]}"; do
  # -Atc : une seule ligne sans padding ; ignore erreur si déjà créée (course / rejeu).
  exists="$(
    docker compose exec -T postgres psql -U gs -d postgres -Atc \
      "SELECT 1 FROM pg_database WHERE datname = '${db}'" 2>/dev/null || true
  )"
  if [[ "${exists}" != "1" ]]; then
    docker compose exec -T postgres psql -U gs -d postgres -c \
      "CREATE DATABASE ${db};" >/dev/null 2>&1 \
      || true
  fi
  echo "  ${db} : OK"
done
