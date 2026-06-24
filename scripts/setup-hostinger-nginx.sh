#!/usr/bin/env bash
# Configure nginx sur le VPS pour proxy vers le frontend Docker (remplace la page par défaut).
#
# Usage (root sur Hostinger) :
#   cd /var/www/gestionscolaire
#   bash scripts/setup-hostinger-nginx.sh
#
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

WEB_PORT="${WEB_PORT:-5180}"
if [[ -f .env ]] && grep -q '^WEB_PORT=' .env; then
  WEB_PORT="$(grep '^WEB_PORT=' .env | cut -d= -f2 | tr -d ' \"')"
fi

DOMAIN="${SCOLAIRE_DOMAIN:-bloomaroneschool.bloomarone.com}"
CONF="/etc/nginx/sites-available/${DOMAIN}"
ENABLED="/etc/nginx/sites-enabled/${DOMAIN}"

echo "→ Domaine : $DOMAIN"
echo "→ Port frontend Docker : $WEB_PORT"
echo

if ! curl -sf "http://127.0.0.1:${WEB_PORT}/" >/dev/null 2>&1; then
  echo "ERREUR : rien ne répond sur http://127.0.0.1:${WEB_PORT}/"
  echo "Lancez d'abord : docker compose up -d"
  exit 1
fi

cat > "$CONF" <<EOF
upstream gestionscolaire_frontend {
    server 127.0.0.1:${WEB_PORT};
}

server {
    listen 80;
    listen [::]:80;
    server_name ${DOMAIN};

    location / {
        proxy_pass http://gestionscolaire_frontend;
        proxy_http_version 1.1;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
    }
}
EOF

ln -sf "$CONF" "$ENABLED"
rm -f /etc/nginx/sites-enabled/default

nginx -t
systemctl reload nginx

echo
echo "✓ Nginx configuré (HTTP)."
echo "  Test : curl -sI http://${DOMAIN}/ | head -3"
echo
echo "→ HTTPS (Let's Encrypt) :"
echo "  certbot --nginx -d ${DOMAIN}"
echo "  nginx -t && systemctl reload nginx"
