#!/usr/bin/env bash
# Sauvegarde master.db + bases tenant (Linux / Hostinger VPS)
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

STAMP="$(date +%Y%m%d-%H%M%S)"
OUT_DIR="$ROOT/backups/db-$STAMP"
mkdir -p "$OUT_DIR"

echo "Arrêt du backend..."
docker compose stop backend

echo "Copie master.db..."
docker compose cp backend:/app/data/master.db "$OUT_DIR/master.db"

echo "Copie tenants/..."
docker compose cp backend:/app/data/tenants "$OUT_DIR/tenants"

echo "Redémarrage du backend..."
docker compose start backend

ARCHIVE="$OUT_DIR.tar.gz"
tar -czf "$ARCHIVE" -C "$ROOT/backups" "db-$STAMP"
rm -rf "$OUT_DIR"

echo ""
echo "Sauvegarde créée : $ARCHIVE"
echo "Ne pas committer dans Git."
