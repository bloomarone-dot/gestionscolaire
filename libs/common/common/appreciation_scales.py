"""Barèmes d'appréciation des bulletins — défauts officiels + normalisation."""
from __future__ import annotations

import json
from copy import deepcopy
from typing import Any, Optional

DEFAULT_APPRECIATION_SCALES: dict[str, list[dict[str, Any]]] = {
    "fr": [
        {"min": 18, "label": "EXCELLENT"},
        {"min": 16, "label": "TB"},
        {"min": 14, "label": "B"},
        {"min": 12, "label": "AB"},
        {"min": 10, "label": "PASSABLE"},
        {"min": 0, "label": "INSUFFISANT"},
    ],
    "en": [
        {"min": 18, "label": "EXCELLENT"},
        {"min": 16, "label": "A"},
        {"min": 10, "label": "IPA"},
        {"min": 0, "label": "CNA"},
    ],
}


def normalize_band(band: dict[str, Any]) -> dict[str, Any]:
    return {"min": float(band["min"]), "label": str(band["label"]).strip()}


def normalize_scales(data: Optional[dict[str, Any]]) -> dict[str, list[dict[str, Any]]]:
    """Fusionne avec les défauts ; trie par seuil décroissant."""
    base = deepcopy(DEFAULT_APPRECIATION_SCALES)
    if not data:
        return base
    for lang in ("fr", "en"):
        rows = data.get(lang)
        if not rows:
            continue
        cleaned = [normalize_band(b) for b in rows if b.get("label")]
        if cleaned:
            base[lang] = sorted(cleaned, key=lambda b: b["min"], reverse=True)
    return base


def parse_scales(raw: Any) -> dict[str, list[dict[str, Any]]]:
    if raw is None or raw == "":
        return deepcopy(DEFAULT_APPRECIATION_SCALES)
    if isinstance(raw, dict):
        return normalize_scales(raw)
    if isinstance(raw, str):
        try:
            return normalize_scales(json.loads(raw))
        except (json.JSONDecodeError, TypeError):
            return deepcopy(DEFAULT_APPRECIATION_SCALES)
    return deepcopy(DEFAULT_APPRECIATION_SCALES)


def dump_scales(scales: dict[str, Any]) -> str:
    return json.dumps(normalize_scales(scales), ensure_ascii=False)


def label_for_average(
    moyenne: Optional[float],
    lang: str,
    scales: Optional[dict[str, Any]] = None,
) -> str:
    if moyenne is None:
        return ""
    use = normalize_scales(scales).get(lang, DEFAULT_APPRECIATION_SCALES["fr"])
    for band in use:
        if moyenne >= band["min"]:
            return band["label"]
    return use[-1]["label"] if use else ""
