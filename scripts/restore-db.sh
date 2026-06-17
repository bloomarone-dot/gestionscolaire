#!/usr/bin/env bash
# Restaure master.db + tenants (Linux / Hostinger VPS)
# Usage : ./scripts/restore-db.sh backups/db-20260609-120000.tar.gz
set -euo pipefail

if [ $# -lt 1 ]; then
  echo "Usage: $0 <archive.tar.gz ou .zip>"
  exit 1
fi

ARCHIVE="$1"
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"
TMP="$(mktemp -d)"

cleanup() { rm -rf "$TMP"; }
trap cleanup EXIT

mkdir -p "$TMP/extract"
case "$ARCHIVE" in
  *.tar.gz) tar -xzf "$ARCHIVE" -C "$TMP/extract" ;;
  *.zip) unzip -q "$ARCHIVE" -d "$TMP/extract" ;;
  *) echo "Format non supporté (tar.gz ou zip)"; exit 1 ;;
esac

DATA_DIR="$TMP/extract"
if [ -d "$TMP/extract/db-"* ]; then
  DATA_DIR="$(find "$TMP/extract" -maxdepth 1 -type d -name 'db-*' | head -1)"
fi

if [ ! -f "$DATA_DIR/master.db" ]; then
  echo "master.db introuvable dans l'archive"
  exit 1
fi

echo "Arrêt du backend..."
docker compose stop backend

echo "Restauration master.db..."
docker compose cp "$DATA_DIR/master.db" backend:/app/data/master.db

if [ -d "$DATA_DIR/tenants" ]; then
  echo "Restauration tenants/..."
  docker compose exec -T backend sh -c 'rm -rf /app/data/tenants && mkdir -p /app/data/tenants'
  for f in "$DATA_DIR/tenants"/*.db; do
    [ -f "$f" ] || continue
    docker compose cp "$f" "backend:/app/data/tenants/$(basename "$f")"
  done
fi

echo "Redémarrage..."
docker compose up -d backend

echo ""
echo "Restauration terminée. SEED_DEMO_ON_START doit être false en production."
