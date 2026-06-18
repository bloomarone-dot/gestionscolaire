#!/usr/bin/env bash
# Vérifie que les fichiers clés de la dernière version sont bien sur GitHub main.
set -euo pipefail

BASE="https://raw.githubusercontent.com/bloomarone-dot/gestionscolaire/main"
FILES=(
  "frontend/src/components/BulletinPreviewModal.jsx"
  "scripts/fix-teacher-tenant-ids.sh"
  "scripts/update-hostinger.sh"
  "scripts/list-accounts.sh"
  "services/personnel-service/app/auth_client.py"
  "services/personnel-service/app/main.py"
)

echo "=== Vérification GitHub main ==="
SHA=$(curl -sf "https://api.github.com/repos/bloomarone-dot/gestionscolaire/commits/main" | python3 -c "import sys,json; print(json.load(sys.stdin)['sha'][:8])" 2>/dev/null || echo "?")
echo "Dernier commit : $SHA"
echo

OK=0
FAIL=0
for f in "${FILES[@]}"; do
  CODE=$(curl -s -o /dev/null -w "%{http_code}" "$BASE/$f")
  if [[ "$CODE" == "200" ]]; then
    echo "  OK   $f"
    OK=$((OK + 1))
  else
    echo "  MANQUANT ($CODE)  $f"
    FAIL=$((FAIL + 1))
  fi
done

echo
if [[ $FAIL -eq 0 ]]; then
  echo "✓ GitHub contient tous les fichiers clés ($OK/$((OK+FAIL)))."
else
  echo "✗ $FAIL fichier(s) manquant(s) — faites git push origin main."
  exit 1
fi
