#!/usr/bin/env bash
# Crée ou met à jour le compte admin d'un établissement (login par téléphone).
#
# Usage :
#   ./scripts/create-establishment-admin.sh
#   ADMIN_PHONE=652209175 ADMIN_PASSWORD='MonMotDePasse!' TENANT_ID=1 ./scripts/create-establishment-admin.sh
#
# Prérequis : stack démarrée (docker compose up -d).
set -euo pipefail

API_URL="${EDUGESTION_API_URL:-http://127.0.0.1:8082}"
SUPER_PHONE="${SUPERADMIN_PHONE:-690000000}"
SUPER_PASSWORD="${SUPERADMIN_PASSWORD:-ChangeMe2026!}"

ADMIN_PHONE="${ADMIN_PHONE:-690000101}"
ADMIN_PASSWORD="${ADMIN_PASSWORD:-RoyalAdmin2026!}"
ADMIN_FIRST="${ADMIN_FIRST_NAME:-Admin}"
ADMIN_LAST="${ADMIN_LAST_NAME:-Etablissement}"
TENANT_ID="${TENANT_ID:-}"

echo "==> Connexion super-admin ($SUPER_PHONE)..."
TOKEN=$(curl -sf -X POST "$API_URL/auth/login" \
  -H 'Content-Type: application/json' \
  -d "{\"phone\":\"$SUPER_PHONE\",\"password\":\"$SUPER_PASSWORD\"}" \
  | python3 -c "import sys,json; print(json.load(sys.stdin)['access_token'])")

if [[ -z "$TENANT_ID" ]]; then
  echo "==> Établissements disponibles :"
  curl -sf "$API_URL/tenants/schools" -H "Authorization: Bearer $TOKEN" \
    | python3 -c "import sys,json; [print(f\"  id={s['id']}  {s['name']}\") for s in json.load(sys.stdin)]"
  echo
  read -rp "ID de l'établissement (tenant_id) : " TENANT_ID
fi

echo "==> Création admin établissement (téléphone $ADMIN_PHONE, tenant $TENANT_ID)..."
HTTP=$(curl -s -o /tmp/create-admin.json -w '%{http_code}' -X POST "$API_URL/auth/accounts" \
  -H "Authorization: Bearer $TOKEN" \
  -H 'Content-Type: application/json' \
  -d "{\"phone\":\"$ADMIN_PHONE\",\"password\":\"$ADMIN_PASSWORD\",\"role\":\"admin\",\"tenant_id\":$TENANT_ID,\"first_name\":\"$ADMIN_FIRST\",\"last_name\":\"$ADMIN_LAST\"}")

if [[ "$HTTP" == "201" ]]; then
  echo "✓ Compte admin créé."
elif [[ "$HTTP" == "409" ]]; then
  echo "! Le téléphone $ADMIN_PHONE existe déjà."
  echo "  Réinitialisez le mot de passe manuellement ou choisissez un autre numéro."
  cat /tmp/create-admin.json
  exit 1
else
  echo "Erreur HTTP $HTTP"
  cat /tmp/create-admin.json
  exit 1
fi

echo
echo "Connexion sur https://scolaire.bloomarone.com/login"
echo "  Téléphone   : $ADMIN_PHONE"
echo "  Mot de passe: $ADMIN_PASSWORD"
