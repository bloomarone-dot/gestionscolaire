#!/usr/bin/env bash
# Répare les comptes enseignant/direction créés sans tenant_id (bug superadmin corrigé).
set -euo pipefail
cd "$(dirname "$0")/.."

echo "==> Lecture des fiches personnel (account_id → tenant_id)..."
mapfile -t rows < <(
  docker compose exec -T postgres psql -U gs -d personnel_db -At -F $'\t' -c \
    "SELECT account_id, tenant_id FROM personnel WHERE account_id IS NOT NULL;"
)

fixed=0
for row in "${rows[@]}"; do
  account_id="${row%%$'\t'*}"
  tenant_id="${row#*$'\t'}"
  [ -z "$account_id" ] || [ -z "$tenant_id" ] && continue
  updated=$(
    docker compose exec -T postgres psql -U gs -d auth_db -At -c \
      "UPDATE accounts SET tenant_id = ${tenant_id} WHERE id = ${account_id} AND tenant_id IS NULL RETURNING id;"
  )
  if [ -n "$updated" ]; then
    echo "  Compte #${account_id} → tenant ${tenant_id}"
    fixed=$((fixed + 1))
  fi
done

echo "==> ${fixed} compte(s) corrigé(s)."
