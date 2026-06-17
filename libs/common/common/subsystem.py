"""Résolution sous-système (Francophone / Anglophone) depuis une classe."""
from __future__ import annotations

from typing import Any, Optional


def infer_subsystem_from_text(value: Optional[str]) -> Optional[str]:
    if not value:
        return None
    text = value.strip().lower()
    if "anglo" in text:
        return "ANGLOPHONE"
    if "franco" in text:
        return "FRANCOPHONE"
    return None


def resolve_subsystem_code(classe: Optional[dict[str, Any]]) -> Optional[str]:
    """Code officiel ANGLOPHONE | FRANCOPHONE pour une classe."""
    if not classe:
        return None
    code = classe.get("subsystem_code")
    if code in ("ANGLOPHONE", "FRANCOPHONE"):
        return code
    return infer_subsystem_from_text(classe.get("specialite_libre"))


def lang_for_classe(classe: Optional[dict[str, Any]]) -> str:
    return "en" if resolve_subsystem_code(classe) == "ANGLOPHONE" else "fr"
