#!/bin/sh
set -e

DATA_DIR="/app/data"
SEED_DIR="/app/deploy-data"
MARKER="$DATA_DIR/.deploy-data-loaded"

mkdir -p "$DATA_DIR/tenants"

# Première initialisation : copier les données versionnées dans Git
if [ ! -f "$DATA_DIR/master.db" ] && [ -f "$SEED_DIR/master.db" ]; then
  echo "[entrypoint] Initialisation de la base depuis deploy-data/ ..."
  cp "$SEED_DIR/master.db" "$DATA_DIR/master.db"
  if [ -d "$SEED_DIR/tenants" ]; then
    cp "$SEED_DIR/tenants/"*.db "$DATA_DIR/tenants/" 2>/dev/null || true
  fi
  date -Iseconds > "$MARKER"
  echo "[entrypoint] Base initialisée."
fi

exec python -m uvicorn app.main:app --host 0.0.0.0 --port 8000
