"""Résolution sous-système (Francophone / Anglophone) depuis une classe."""
from __future__ import annotations

import re
import unicodedata
from typing import Any, Optional

_ANGLO_PATTERNS = (
    re.compile(r"\bform\b", re.I),
    re.compile(r"\bform\s*\d", re.I),
    re.compile(r"\blower\s*six\b", re.I),
    re.compile(r"\bupper\s*six\b", re.I),
)

_FRANCO_PATTERNS = (
    re.compile(r"\b6[eè]me\b", re.I),
    re.compile(r"\b5[eè]me\b", re.I),
    re.compile(r"\b4[eè]me\b", re.I),
    re.compile(r"\b3[eè]me\b", re.I),
    re.compile(r"\b2nde\b", re.I),
    re.compile(r"\b1[eè]re?\b", re.I),
    re.compile(r"\bpremi[eè]re\b", re.I),
    re.compile(r"\bterminale?\b", re.I),
    re.compile(r"\btle\b", re.I),
    re.compile(r"\bseconde\b", re.I),
)


def _norm_text(value: str) -> str:
    text = unicodedata.normalize("NFKD", value.strip().lower())
    return "".join(ch for ch in text if not unicodedata.combining(ch))


def infer_subsystem_from_text(value: Optional[str]) -> Optional[str]:
    """Déduit ANGLOPHONE / FRANCOPHONE depuis un libellé (nom de classe, section…)."""
    if not value:
        return None
    text = _norm_text(str(value))
    if "anglo" in text:
        return "ANGLOPHONE"
    if "franco" in text:
        return "FRANCOPHONE"
    for pattern in _ANGLO_PATTERNS:
        if pattern.search(text):
            return "ANGLOPHONE"
    for pattern in _FRANCO_PATTERNS:
        if pattern.search(text):
            return "FRANCOPHONE"
    return None


def resolve_subsystem_code(classe: Optional[dict[str, Any]]) -> Optional[str]:
    """Code officiel ANGLOPHONE | FRANCOPHONE pour une classe."""
    if not classe:
        return None
    code = classe.get("subsystem_code")
    if code in ("ANGLOPHONE", "FRANCOPHONE"):
        return code
    for field in (
        "specialite_libre",
        "section",
        "niveau_libre",
        "nom_personnalise",
        "nom",
        "name",
    ):
        found = infer_subsystem_from_text(classe.get(field))
        if found:
            return found
    return None


def lang_for_classe(classe: Optional[dict[str, Any]]) -> str:
    return "en" if resolve_subsystem_code(classe) == "ANGLOPHONE" else "fr"
