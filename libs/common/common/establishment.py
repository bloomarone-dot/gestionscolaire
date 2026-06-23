"""Types d'établissement — école MINESEC vs centre de formation en langues."""
from __future__ import annotations

ESTABLISHMENT_KIND_SCHOOL = "SCHOOL"
ESTABLISHMENT_KIND_LANGUAGE_CENTER = "LANGUAGE_CENTER"

VALID_ESTABLISHMENT_KINDS = frozenset({
    ESTABLISHMENT_KIND_SCHOOL,
    ESTABLISHMENT_KIND_LANGUAGE_CENTER,
})


def normalize_establishment_kind(kind: str | None) -> str:
    value = (kind or ESTABLISHMENT_KIND_SCHOOL).strip().upper()
    if value in VALID_ESTABLISHMENT_KINDS:
        return value
    return ESTABLISHMENT_KIND_SCHOOL


def is_language_center(kind: str | None) -> bool:
    return normalize_establishment_kind(kind) == ESTABLISHMENT_KIND_LANGUAGE_CENTER


def default_profile_for_kind(kind: str) -> dict[str, list[str]]:
    """Profil pédagogique par défaut selon le type d'établissement."""
    if normalize_establishment_kind(kind) == ESTABLISHMENT_KIND_LANGUAGE_CENTER:
        return {
            "subsystems": ["FRANCOPHONE"],
            "teaching_types": ["LANGUE"],
            "channels": ["INTERNAL"],
        }
    return {
        "subsystems": ["FRANCOPHONE", "ANGLOPHONE"],
        "teaching_types": ["GENERAL", "TECHNIQUE"],
        "channels": ["INTERNAL"],
    }
