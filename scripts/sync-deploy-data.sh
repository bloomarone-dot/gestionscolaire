#!/usr/bin/env bash
# Copie la base Docker vers deploy-data/ pour commit Git
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"
mkdir -p deploy-data/tenants

docker compose stop backend
docker compose cp backend:/app/data/master.db deploy-data/master.db
for f in $(docker compose exec -T backend sh -c 'ls /app/data/tenants/*.db 2>/dev/null'); do
  name=$(basename "$f")
  docker compose cp "backend:/app/data/tenants/$name" "deploy-data/tenants/$name"
done
docker compose start backend

echo "deploy-data/ prêt pour: git add deploy-data/"
