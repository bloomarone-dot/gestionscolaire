"""Thème visuel du bulletin — couleurs par section (SaaS multi-établissements)."""
from __future__ import annotations

import json
import re
from copy import deepcopy
from typing import Any, Optional

HEX_RE = re.compile(r"^#[0-9A-Fa-f]{6}$")

# Sections configurables (clé → libellé FR pour l'UI admin)
BULLETIN_THEME_SECTIONS: dict[str, str] = {
    "national_header": "En-tête national (bilingue + logo)",
    "title_bar": "Bandeau titre (BULLETIN)",
    "identity_label": "Identité élève — labels (NOM, CLASSE…)",
    "identity_row": "Identité élève — ligne grise",
    "grades_header": "En-tête du tableau des notes",
    "group_row": "Bandeaux de groupes (1er, 2e, 3e groupe)",
    "grade_row": "Lignes des matières / notes",
    "summary": "Synthèse (totaux, moyennes, décision)",
    "signatures": "Zone signatures (parents, principal…)",
    "border": "Couleur des bordures",
    "text": "Couleur du texte",
}

DEFAULT_BULLETIN_THEME: dict[str, str] = {
    "national_header": "#d9ead3",
    "title_bar": "#6fa8dc",
    "identity_label": "#cfe2f3",
    "identity_row": "#eeeeee",
    "grades_header": "#6fa8dc",
    "group_row": "#9fc5e8",
    "grade_row": "#ffffff",
    "summary": "#fce5cd",
    "signatures": "#d9ead3",
    "border": "#000000",
    "text": "#000000",
}

BULLETIN_THEME_PRESETS: dict[str, dict[str, str]] = {
    "royal_priesthood": deepcopy(DEFAULT_BULLETIN_THEME),
    "cameroon_classic": {
        "national_header": "#d4edda",
        "title_bar": "#cce5ff",
        "identity_label": "#cce5ff",
        "identity_row": "#cce5ff",
        "grades_header": "#cce5ff",
        "group_row": "#4a7ab8",
        "grade_row": "#ffffff",
        "summary": "#ffe5cc",
        "signatures": "#d4edda",
        "border": "#222222",
        "text": "#000000",
    },
    "minimal": {
        "national_header": "#f5f5f5",
        "title_bar": "#e0e0e0",
        "identity_label": "#fafafa",
        "identity_row": "#f0f0f0",
        "grades_header": "#e8e8e8",
        "group_row": "#dddddd",
        "grade_row": "#ffffff",
        "summary": "#f5f5f5",
        "signatures": "#f0f0f0",
        "border": "#333333",
        "text": "#000000",
    },
}


def _norm_hex(value: Any, fallback: str) -> str:
    if not isinstance(value, str):
        return fallback
    v = value.strip()
    if not v.startswith("#"):
        v = f"#{v}"
    if HEX_RE.match(v):
        return v.lower()
    return fallback


def normalize_theme(data: Optional[dict[str, Any]]) -> dict[str, str]:
    """Fusionne avec les valeurs par défaut."""
    base = deepcopy(DEFAULT_BULLETIN_THEME)
    if not data:
        return base
    preset = data.get("preset")
    if isinstance(preset, str) and preset in BULLETIN_THEME_PRESETS:
        base.update(BULLETIN_THEME_PRESETS[preset])
    for key in BULLETIN_THEME_SECTIONS:
        if key in data and data[key]:
            base[key] = _norm_hex(data[key], base[key])
    return base


def parse_theme(raw: Any) -> dict[str, str]:
    if raw is None or raw == "":
        return deepcopy(DEFAULT_BULLETIN_THEME)
    if isinstance(raw, dict):
        return normalize_theme(raw)
    if isinstance(raw, str):
        try:
            return normalize_theme(json.loads(raw))
        except (json.JSONDecodeError, TypeError):
            return deepcopy(DEFAULT_BULLETIN_THEME)
    return deepcopy(DEFAULT_BULLETIN_THEME)


def dump_theme(theme: dict[str, Any]) -> str:
    normalized = normalize_theme(theme)
    payload = {k: normalized[k] for k in BULLETIN_THEME_SECTIONS}
    if theme.get("preset"):
        payload["preset"] = theme["preset"]
    return json.dumps(payload, ensure_ascii=False)


def preset_theme(name: str) -> dict[str, str]:
    if name not in BULLETIN_THEME_PRESETS:
        return deepcopy(DEFAULT_BULLETIN_THEME)
    merged = normalize_theme({"preset": name})
    return {**merged, "preset": name}
