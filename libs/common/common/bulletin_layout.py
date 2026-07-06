"""Profil de présentation du bulletin — détection et adaptation multi-établissements."""
from __future__ import annotations

import json
import re
from copy import deepcopy
from typing import Any, Optional

from common.establishment import (
    ESTABLISHMENT_KIND_PRIMARY_SCHOOL,
    ESTABLISHMENT_KIND_SCHOOL,
    normalize_establishment_kind,
)

# Styles d'en-tête détectés ou configurés
HEADER_BILINGUAL = "bilingual"
HEADER_FR_ONLY = "fr_only"
HEADER_EN_ONLY = "en_only"
HEADER_SCHOOL_ONLY = "school_only"

DEFAULT_LAYOUT: dict[str, Any] = {
    "header_style": HEADER_BILINGUAL,
    "show_subject_groups": True,
    "show_series": True,
    "show_sanctions": True,
    "show_absences": True,
    "sequence_columns": 2,
    "period_mode": "trimestre",
    "ministry_fr": "MINISTERE DE L'ENSEIGNEMENT SECONDAIRE",
    "ministry_en": "MINISTRY OF SECONDARY EDUCATION",
    "report_title_fr": "BULLETIN",
    "report_title_en": "STUDENT'S PROGRESS REPORT CARD",
    "detected_colors": {},
    "confidence": 0.0,
    "source_filename": None,
}

PRIMARY_DEFAULTS: dict[str, Any] = {
    "header_style": HEADER_FR_ONLY,
    "show_subject_groups": False,
    "show_series": False,
    "show_sanctions": False,
    "show_absences": False,
    "sequence_columns": 2,
    "period_mode": "trimestre",
    "ministry_fr": "MINISTERE DE L'EDUCATION DE BASE",
    "ministry_en": "MINISTRY OF BASIC EDUCATION",
    "report_title_fr": "BULLETIN SCOLAIRE",
    "report_title_en": "PRIMARY SCHOOL REPORT",
}

LANG_CENTER_DEFAULTS: dict[str, Any] = {
    "header_style": HEADER_SCHOOL_ONLY,
    "show_subject_groups": False,
    "show_series": False,
    "show_sanctions": False,
    "show_absences": False,
    "sequence_columns": 2,
    "period_mode": "trimestre",
}

# Mots-clés pour la détection textuelle (bulletin PDF/image)
_RE_BILINGUAL = re.compile(
    r"republi(?:que|lic)\s+du\s+cameroun|republic\s+of\s+cameroon",
    re.I,
)
_RE_BASIC_EDU = re.compile(r"education\s+de\s+base|basic\s+education|maternelle|primaire|primary\s+school", re.I)
_RE_SECONDARY = re.compile(r"enseignement\s+secondaire|secondary\s+education", re.I)
_RE_GROUPS = re.compile(r"premier\s+groupe|first\s+group|deuxi[eè]me\s+groupe|second\s+group", re.I)
_RE_SERIES = re.compile(r"\bserie\b|\bseries\b", re.I)
_RE_SEQ = re.compile(r"\b(\d+)(?:e|è|re|nd|rd|th)?\s*(?:s[eé]q|seq)\b", re.I)
_RE_ANNUAL = re.compile(r"bulletin\s+annuel|annual\s+report", re.I)


def defaults_for_kind(establishment_kind: str | None) -> dict[str, Any]:
    kind = normalize_establishment_kind(establishment_kind)
    base = deepcopy(DEFAULT_LAYOUT)
    if kind == ESTABLISHMENT_KIND_PRIMARY_SCHOOL:
        base.update(PRIMARY_DEFAULTS)
    elif kind == "LANGUAGE_CENTER":
        base.update(LANG_CENTER_DEFAULTS)
    return base


def normalize_layout(data: Optional[dict[str, Any]], establishment_kind: str | None = None) -> dict[str, Any]:
    merged = defaults_for_kind(establishment_kind)
    if not data:
        return merged
    for key in (
        "header_style", "show_subject_groups", "show_series", "show_sanctions",
        "show_absences", "sequence_columns", "period_mode", "ministry_fr", "ministry_en",
        "report_title_fr", "report_title_en", "source_filename",
    ):
        if key in data and data[key] is not None:
            merged[key] = data[key]
    if isinstance(data.get("detected_colors"), dict):
        merged["detected_colors"] = data["detected_colors"]
    if data.get("confidence") is not None:
        merged["confidence"] = float(data["confidence"])
    return merged


def parse_layout(raw: Any, establishment_kind: str | None = None) -> dict[str, Any]:
    if raw is None or raw == "":
        return defaults_for_kind(establishment_kind)
    if isinstance(raw, dict):
        return normalize_layout(raw, establishment_kind)
    if isinstance(raw, str):
        try:
            return normalize_layout(json.loads(raw), establishment_kind)
        except (json.JSONDecodeError, TypeError):
            return defaults_for_kind(establishment_kind)
    return defaults_for_kind(establishment_kind)


def dump_layout(layout: dict[str, Any]) -> str:
    return json.dumps(normalize_layout(layout), ensure_ascii=False)


def detect_from_text(text: str, establishment_kind: str | None = None) -> dict[str, Any]:
    """Déduit la présentation à partir du texte extrait d'un bulletin modèle."""
    profile = defaults_for_kind(establishment_kind)
    t = text or ""
    hits = 0

    fr_hit = bool(re.search(r"republi(?:que|lic)\s+du\s+cameroun", t, re.I))
    en_hit = bool(re.search(r"republic\s+of\s+cameroon", t, re.I))
    if fr_hit and en_hit:
        profile["header_style"] = HEADER_BILINGUAL
        hits += 2
    elif fr_hit:
        profile["header_style"] = HEADER_FR_ONLY
        hits += 1
    elif en_hit:
        profile["header_style"] = HEADER_EN_ONLY
        hits += 1
    else:
        profile["header_style"] = HEADER_SCHOOL_ONLY

    if _RE_BASIC_EDU.search(t):
        profile["ministry_fr"] = "MINISTERE DE L'EDUCATION DE BASE"
        profile["ministry_en"] = "MINISTRY OF BASIC EDUCATION"
        profile["show_subject_groups"] = False
        profile["show_series"] = False
        profile["report_title_fr"] = "BULLETIN SCOLAIRE"
        hits += 2
    elif _RE_SECONDARY.search(t):
        profile["ministry_fr"] = "MINISTERE DE L'ENSEIGNEMENT SECONDAIRE"
        profile["ministry_en"] = "MINISTRY OF SECONDARY EDUCATION"
        hits += 1

    if _RE_GROUPS.search(t):
        profile["show_subject_groups"] = True
        hits += 1
    elif _RE_BASIC_EDU.search(t):
        profile["show_subject_groups"] = False

    profile["show_series"] = bool(_RE_SERIES.search(t))
    if profile["show_series"]:
        hits += 1

    seqs = {int(m.group(1)) for m in _RE_SEQ.finditer(t)}
    if seqs:
        profile["sequence_columns"] = max(2, min(6, len(seqs)))
        hits += 1

    if _RE_ANNUAL.search(t):
        profile["period_mode"] = "annual"
        hits += 1

    profile["show_sanctions"] = bool(re.search(r"sanction", t, re.I))
    profile["show_absences"] = bool(re.search(r"absence", t, re.I))

    profile["confidence"] = round(min(1.0, hits / 6.0), 2)
    return profile


def merge_detected_with_theme(
    profile: dict[str, Any],
    detected_colors: Optional[dict[str, str]] = None,
) -> dict[str, Any]:
    """Fusionne couleurs détectées dans le profil (pour suggestion de thème)."""
    out = deepcopy(profile)
    if detected_colors:
        out["detected_colors"] = detected_colors
    return out


def layout_to_theme_suggestions(colors: dict[str, str]) -> dict[str, str]:
    """Convertit les couleurs détectées en suggestions pour bulletin_theme."""
    mapping = {
        "national_header": colors.get("header"),
        "title_bar": colors.get("title_bar"),
        "grades_header": colors.get("table_header"),
        "group_row": colors.get("group_row"),
        "summary": colors.get("summary"),
        "signatures": colors.get("signatures"),
    }
    return {k: v for k, v in mapping.items() if v}
