"""Sections francophone / anglophone — règles métier partagées."""

VALID_SECTIONS = frozenset({"francophone", "anglophone"})
PROF_SECTIONS = frozenset({"francophone", "anglophone", "les_deux"})


def section_lang(section: str | None) -> str:
    return "en" if section == "anglophone" else "fr"


def sections_compatible(prof_section: str | None, classe_section: str | None) -> bool:
    prof = prof_section or "francophone"
    classe = classe_section or "francophone"
    if prof == "les_deux":
        return True
    return prof == classe


def validate_section(value: str | None, *, allow_both: bool = False) -> str:
    allowed = PROF_SECTIONS if allow_both else VALID_SECTIONS
    section = value or "francophone"
    if section not in allowed:
        raise ValueError(f"Section invalide : {section}")
    return section
