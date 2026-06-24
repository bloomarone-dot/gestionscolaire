#!/usr/bin/env bash
# Mise à jour Hostinger — gestionscolaire (conserve les données PostgreSQL).
#
# Usage :
#   cd /var/www/gestionscolaire
#   bash scripts/update-hostinger.sh
#
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

echo "=========================================="
echo "  Mise à jour gestionscolaire (Hostinger)"
echo "=========================================="
echo "Répertoire : $ROOT"
echo

if [[ -f docker-compose.override.yml ]] && grep -qE '^\s*backend:' docker-compose.override.yml 2>/dev/null; then
  echo "→ Override obsolète (backend) — sauvegarde..."
  mv docker-compose.override.yml "docker-compose.override.yml.bak.$(date +%Y%m%d%H%M%S)"
fi

docker stop gestionscolaire-backend-1 2>/dev/null || true
docker rm gestionscolaire-backend-1 2>/dev/null || true

echo "→ git pull origin main..."
git fetch origin main
git reset --hard origin/main

echo "→ Sauvegarde Postgres (optionnelle)..."
if docker compose ps postgres 2>/dev/null | grep -q Up; then
  STAMP="$(date +%Y%m%d-%H%M%S)"
  mkdir -p backups
  docker compose exec -T postgres pg_dumpall -U gs > "backups/pre-update-$STAMP.sql" 2>/dev/null \
    && echo "  Backup : backups/pre-update-$STAMP.sql" \
    || echo "  (backup ignoré)"
fi

echo "→ Infrastructure..."
docker compose up -d postgres redis rabbitmq
sleep 15

bash "$ROOT/scripts/ensure-postgres-databases.sh"

echo "→ Rebuild et démarrage (tous les services)..."
docker compose build --pull frontend api-gateway \
  auth-service tenant-service referentiel-service pedagogie-service \
  personnel-service eleves-service evaluations-service bulletins-service \
  notifications-service tresorerie-service planning-service
docker compose up -d

sleep 20
echo
echo "→ Vérifications..."
curl -sf http://127.0.0.1:8082/health && echo "  API gateway : OK" || echo "  API gateway : ERREUR"

WEB_PORT="${WEB_PORT:-5180}"
curl -sfI "http://127.0.0.1:${WEB_PORT}/" | head -1 || echo "  Frontend : ERREUR"

docker compose ps --status running | grep -E 'tresorerie|planning' && echo "  Nouveaux services : OK" || echo "  Vérifier tresorerie-service et planning-service"

docker compose ps

echo
echo "✓ Mise à jour terminée."
echo "  Site : https://bloomaroneschool.bloomarone.com"
echo "  Comptes : ./scripts/list-accounts.sh"
