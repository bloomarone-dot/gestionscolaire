#!/usr/bin/env bash
# Mise à jour Hostinger — gestionscolaire (conserve les données PostgreSQL).
#
# Usage :
#   cd /opt/gestionscolaire
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
git pull origin main

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
sleep 20

echo "→ Rebuild complet (frontend + services)..."
docker compose build --no-cache frontend auth-service personnel-service api-gateway evaluations-service pedagogie-service bulletins-service
docker compose up -d

sleep 15
echo
echo "→ Vérifications..."
curl -sf http://127.0.0.1:8082/health && echo "  API : OK" || echo "  API : ERREUR"
curl -sfI http://127.0.0.1:5180/ | head -1 || echo "  Frontend : ERREUR"
docker compose ps

echo
echo "✓ Mise à jour terminée."
echo "  Site : https://scolaire.bloomarone.com"
echo "  Comptes : ./scripts/list-accounts.sh"
