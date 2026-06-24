#!/usr/bin/env bash
# Corrige la page « Welcome to nginx » — proxy vers le frontend Docker.
# Usage : cd /var/www/gestionscolaire && bash scripts/fix-hostinger-nginx.sh
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

DOMAIN="${SCOLAIRE_DOMAIN:-bloomaroneschool.bloomarone.com}"
WEB_PORT="${WEB_PORT:-5180}"
if [[ -f .env ]] && grep -q '^WEB_PORT=' .env; then
  WEB_PORT="$(grep '^WEB_PORT=' .env | cut -d= -f2 | tr -d ' \"')"
fi

echo "=== 1. Docker frontend ==="
if ! docker compose ps --status running 2>/dev/null | grep -q frontend; then
  echo "→ Démarrage des conteneurs..."
  docker compose up -d
  sleep 10
fi
docker compose ps --format 'table {{.Name}}\t{{.Status}}\t{{.Ports}}' | grep -E 'NAME|frontend|gateway' || true

echo
echo "→ Test http://127.0.0.1:${WEB_PORT}/"
if curl -sf "http://127.0.0.1:${WEB_PORT}/" | head -c 200 | grep -qi 'welcome to nginx'; then
  echo "ERREUR : le port ${WEB_PORT} sert aussi la page nginx par défaut (mauvais conteneur ?)"
  exit 1
fi
if ! curl -sf "http://127.0.0.1:${WEB_PORT}/" >/dev/null; then
  echo "ERREUR : rien sur le port ${WEB_PORT}. Ports Docker :"
  docker compose ps
  ss -tlnp | grep -E '5180|5173|5174|8082' || true
  exit 1
fi
echo "OK — frontend Docker répond sur ${WEB_PORT}"

echo
echo "=== 2. Suppression des sites nginx par défaut ==="
rm -f /etc/nginx/sites-enabled/default
rm -f /etc/nginx/conf.d/default.conf
# Certains VPS Hostinger
rm -f /etc/nginx/sites-enabled/default.conf 2>/dev/null || true

echo
echo "=== 3. Configuration ${DOMAIN} ==="
CONF="/etc/nginx/sites-available/${DOMAIN}"
cat > "$CONF" <<EOF
# EduGestion — UNIQUEMENT scolaire.bloomarone.com (ne pas mettre default_server)
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

ln -sf "$CONF" "/etc/nginx/sites-enabled/${DOMAIN}"

echo
echo "=== 4. Autres blocs server actifs ==="
grep -r "listen\|server_name" /etc/nginx/sites-enabled/ /etc/nginx/conf.d/ 2>/dev/null || true

echo
nginx -t
systemctl reload nginx

echo
echo "=== 5. Test depuis le VPS ==="
curl -sI -H "Host: ${DOMAIN}" "http://127.0.0.1/" | head -5
BODY=$(curl -s -H "Host: ${DOMAIN}" "http://127.0.0.1/" | head -c 300)
if echo "$BODY" | grep -qi 'welcome to nginx'; then
  echo "ERREUR : nginx sert encore la page par défaut."
  echo "Envoyez : nginx -T | grep -A2 'server_name'"
  exit 1
fi

echo
echo "✓ HTTP OK — ouvrez http://${DOMAIN}/login puis lancez HTTPS :"
echo "  certbot --nginx -d ${DOMAIN}"
