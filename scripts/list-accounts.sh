#!/usr/bin/env bash
# Liste les comptes de connexion (auth-service / PostgreSQL).
set -euo pipefail

docker compose exec -T postgres psql -U gs -d auth_db -c \
  "SELECT id, phone, role, tenant_id, first_name, last_name, is_active FROM accounts ORDER BY id;"
