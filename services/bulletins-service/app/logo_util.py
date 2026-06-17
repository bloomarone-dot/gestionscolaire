"""Chargement du logo établissement pour le PDF bulletin."""
from __future__ import annotations

import base64
import io
import os
import re
import tempfile
from pathlib import Path
from typing import Optional
from urllib.request import urlopen

_ASSETS = Path(__file__).resolve().parent / "assets"
_DEFAULT = _ASSETS / "rph_default_logo.png"


def resolve_logo_path(logo_url: Optional[str]) -> Optional[str]:
    """Retourne un chemin fichier utilisable par reportlab Image."""
    if logo_url:
        logo_url = logo_url.strip()
        if logo_url.startswith("data:"):
            match = re.match(r"data:image/[^;]+;base64,(.+)", logo_url, re.I | re.S)
            if match:
                raw = base64.b64decode(match.group(1))
                tmp = tempfile.NamedTemporaryFile(delete=False, suffix=".png")
                tmp.write(raw)
                tmp.close()
                return tmp.name
        if logo_url.startswith(("http://", "https://")):
            try:
                with urlopen(logo_url, timeout=8) as resp:
                    raw = resp.read()
                tmp = tempfile.NamedTemporaryFile(delete=False, suffix=".png")
                tmp.write(raw)
                tmp.close()
                return tmp.name
            except Exception:
                pass
        if os.path.isfile(logo_url):
            return logo_url
    if _DEFAULT.is_file():
        return str(_DEFAULT)
    return None
