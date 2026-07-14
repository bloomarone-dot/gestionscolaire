"""Résolution de la classe de destination selon l'action d'inscription."""
from __future__ import annotations

NEXT_LEVEL = {
    "6E": "5E", "5E": "4E", "4E": "3E", "3E": "2ND", "2ND": "1ERE", "1ERE": "TLE", "TLE": None,
    "1CETIC": "2CETIC", "2CETIC": "3CETIC", "3CETIC": None,
    "2ND-T": "1ERE-T", "1ERE-T": "TLE-T", "TLE-T": None,
    "F1": "F2", "F2": "F3", "F3": "F4", "F4": "F5", "F5": "LS", "LS": "US", "US": None,
    "TF1": "TF2", "TF2": "TF3", "TF3": "TF4", "TF4": "TF5", "TF5": "LST", "LST": "UST", "UST": None,
}
NEXT_FR_PRIMARY = {
    "PS": "MS", "MS": "GS", "GS": "SIL", "SIL": "CP", "CP": "CE1",
    "CE1": "CE2", "CE2": "CM1", "CM1": "CM2", "CM2": None,
}
NEXT_EN_PRIMARY = {
    "P1": "P2", "P2": "P3", "P3": "P4", "P4": "P5", "P5": "P6", "P6": None,
}


def suggest_destination(
    classes: list[dict],
    source_classe: dict,
    enrollment_action: str,
    *,
    dest_action: str = "AUTO",
) -> tuple[int | None, str | None, str | None]:
    """Retourne (classe_id, level_code, series_code) suggérés."""
    action = (enrollment_action or "NONE").upper()
    source_id = source_classe.get("id")
    level = source_classe.get("level_code")
    series = source_classe.get("series_code")
    subsystem = source_classe.get("subsystem_code")

    if action in ("NONE", "EXCLUDE", "ABANDON"):
        return None, None, None

    if action == "STAY_SAME":
        return source_id, level, series

    if action == "EXIT":
        return None, None, None

    if dest_action == "SAME_CLASS":
        return source_id, level, series

    next_level = _next_level(level, subsystem)
    if action in ("PASS_HIGHER", "CYCLE_CHANGE") and next_level:
        dest = _find_class(classes, next_level, series, exclude_id=source_id)
        if dest:
            return dest.get("id"), dest.get("level_code"), dest.get("series_code")
        return None, next_level, series

    if action == "OTHER_CLASS":
        # Réorientation : même niveau, autre série si possible
        dest = _find_class(classes, level, None, exclude_id=source_id, prefer_different_series=series)
        if dest:
            return dest.get("id"), dest.get("level_code"), dest.get("series_code")

    if next_level:
        dest = _find_class(classes, next_level, series, exclude_id=source_id)
        if dest:
            return dest.get("id"), dest.get("level_code"), dest.get("series_code")

    return None, None, None


def _next_level(level: str | None, subsystem: str | None) -> str | None:
    if not level:
        return None
    if level in NEXT_FR_PRIMARY or level in NEXT_EN_PRIMARY:
        if subsystem == "ANGLOPHONE":
            return NEXT_EN_PRIMARY.get(level)
        return NEXT_FR_PRIMARY.get(level)
    return NEXT_LEVEL.get(level)


def _find_class(
    classes: list[dict],
    level: str | None,
    series: str | None,
    *,
    exclude_id: int | None = None,
    prefer_different_series: str | None = None,
) -> dict | None:
    candidates = [
        c for c in classes
        if c.get("level_code") == level and c.get("id") != exclude_id
    ]
    if not candidates:
        return None
    if prefer_different_series:
        alt = [c for c in candidates if c.get("series_code") != prefer_different_series]
        if alt:
            return alt[0]
    if series:
        match = next((c for c in candidates if c.get("series_code") == series), None)
        if match:
            return match
    return candidates[0]
