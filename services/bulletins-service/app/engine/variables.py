"""Catalogue de variables dynamiques autorisées (pas d'exécution de code).

Les textes de template peuvent contenir ``{{chemin.autorise}}``.
Seul un chemin présent dans le catalogue (ou matchant un préfixe listé)
est accepté. Aucun ``eval``, Jinja, filtre ou accès attribut arbitraire.
"""
from __future__ import annotations

import re
from typing import Iterable

# Chemins exacts autorisés (snapshot BulletinDataContext — étape 5).
ALLOWED_VARIABLE_PATHS: frozenset[str] = frozenset({
    # school
    "school.name",
    "school.name_fr",
    "school.name_en",
    "school.logo",
    "school.address",
    "school.city",
    "school.phone",
    "school.po_box",
    "school.motto",
    "school.delegation_regional",
    "school.delegation_departementale",
    # student
    "student.first_name",
    "student.last_name",
    "student.full_name",
    "student.photo",
    "student.matricule",
    "student.gender",
    "student.age",
    "student.status",
    "student.repeat_status",  # stub tant que redoublant n'existe pas en base
    "student.date_of_birth",
    # class / period
    "class.name",
    "class.size",
    "class.level_code",
    "class.cycle_code",
    "class.series_code",
    "class.subsystem_code",
    "academic_year.name",
    "term.name",
    "term.number",
    "term.scope",
    "term.label",
    "period.name",
    "period.number",
    "period.scope",
    "period.label",
    # summary
    "summary.general_average",
    "summary.class_average",
    "summary.rank",
    "summary.class_size",
    "summary.total_points",
    "summary.total_coefficients",
    "summary.decision",
    "summary.observation",
    # attendance stubs (domaine absences pas encore en place)
    "attendance.absences",
    "attendance.sanctions",
})

# Préfixes pour bindings de lignes (tableau de notes).
ALLOWED_ROW_BIND_PREFIXES: tuple[str, ...] = (
    "subject.",
    "grades.",
)

_VAR_RE = re.compile(r"\{\{\s*([a-zA-Z_][a-zA-Z0-9_]*(?:\.[a-zA-Z_][a-zA-Z0-9_]*)*)\s*\}\}")
_PATH_RE = re.compile(r"^[a-zA-Z_][a-zA-Z0-9_]*(?:\.[a-zA-Z_][a-zA-Z0-9_]*)*$")

_FORBIDDEN_IN_TEXT = ("{%", "%}", "${", "{{%", "javascript:", "data:text/html")


class VariableValidationError(ValueError):
    """Chemin de variable non autorisé ou texte dangereux."""


def is_safe_path(path: str) -> bool:
    if not path or not _PATH_RE.match(path):
        return False
    if "__" in path:
        return False
    if path in ALLOWED_VARIABLE_PATHS:
        return True
    return any(path.startswith(prefix) for prefix in ALLOWED_ROW_BIND_PREFIXES)


def assert_safe_path(path: str, *, context: str = "variable") -> str:
    if not is_safe_path(path):
        raise VariableValidationError(
            f"{context}: chemin non autorisé « {path} ». "
            "Seuls les champs du catalogue / préfixes subject.|grades. sont acceptés."
        )
    return path


def extract_variable_paths(text: str) -> list[str]:
    if not text:
        return []
    return [m.group(1) for m in _VAR_RE.finditer(text)]


def validate_interpolated_text(text: str | None, *, context: str = "text") -> None:
    """Valide un texte libre pouvant contenir des ``{{variables}}``."""
    if text is None:
        return
    lowered = text.lower()
    for frag in _FORBIDDEN_IN_TEXT:
        if frag in lowered or frag in text:
            raise VariableValidationError(f"{context}: fragment interdit « {frag} »")
    for path in extract_variable_paths(text):
        assert_safe_path(path, context=context)


def validate_bind_path(path: str, *, context: str = "bind") -> str:
    return assert_safe_path(path, context=context)


def list_catalog() -> list[str]:
    return sorted(ALLOWED_VARIABLE_PATHS)
