#!/usr/bin/env bash
# Crée un raccourci bureau Linux pour ouvrir l'application dans le navigateur.
#
# Usage :
#   ./scripts/create-desktop-shortcut.sh
#   ./scripts/create-desktop-shortcut.sh "https://gestion.mon-ecole.cm/app/login" "Mon Ecole"
#
set -euo pipefail

URL="${1:-http://localhost:5180/app/login}"
NAME="${2:-EduGestion}"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ICON="${SCRIPT_DIR}/client/edugestion.ico"
DESKTOP="${XDG_DESKTOP_DIR:-$HOME/Desktop}"
if [[ ! -d "$DESKTOP" ]]; then
  DESKTOP="$HOME/Bureau"
fi
if [[ ! -d "$DESKTOP" ]]; then
  DESKTOP="$HOME"
fi

ICON_LINE=""
if [[ -f "$ICON" ]]; then
  ICON_DEST="$HOME/.local/share/icons/edugestion.png"
  mkdir -p "$(dirname "$ICON_DEST")"
  if command -v convert >/dev/null 2>&1; then
    convert "$ICON" "$ICON_DEST" 2>/dev/null || cp "$SCRIPT_DIR/../frontend/public/icons/icon-256.png" "$ICON_DEST" 2>/dev/null || true
  elif [[ -f "$SCRIPT_DIR/../frontend/public/icons/icon-256.png" ]]; then
    cp "$SCRIPT_DIR/../frontend/public/icons/icon-256.png" "$ICON_DEST"
  fi
  [[ -f "$ICON_DEST" ]] && ICON_LINE="Icon=$ICON_DEST"
fi

SHORTCUT="$DESKTOP/${NAME}.desktop"
cat > "$SHORTCUT" <<EOF
[Desktop Entry]
Version=1.0
Type=Application
Name=${NAME}
Comment=Gestion scolaire — élèves, notes et bulletins
Exec=xdg-open '${URL}'
${ICON_LINE}
Terminal=false
Categories=Education;Office;
StartupNotify=true
EOF

chmod +x "$SHORTCUT"
echo "Raccourci créé : $SHORTCUT"
echo "URL : $URL"
