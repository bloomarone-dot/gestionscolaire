"""Resolver de variables sécurisé — dictionnaires contrôlés uniquement.

Jamais d'eval/exec/getattr sur objets métier. Walk strict sur des dict JSON-ish.
"""
from __future__ import annotations

import re
from typing import Any, Optional

from app.engine.variables import (
    VariableValidationError,
    assert_safe_path,
    is_safe_path,
    validate_interpolated_text,
    _VAR_RE,
)


class ResolveError(ValueError):
    """Échec de résolution (chemin interdit)."""


_SCALAR = (str, int, float, bool, type(None))


def _is_plain_mapping(value: Any) -> bool:
    return isinstance(value, dict) and not hasattr(type(value), "__tablename__")


def resolve_path(
    root: dict[str, Any],
    path: str,
    *,
    missing: Any = None,
    strict_missing: bool = False,
) -> Any:
    """Résout ``school.name`` / ``subject.average`` dans un dict racine contrôlé.

    - Whitelist via ``assert_safe_path``
    - Traversée uniquement de ``dict`` / scalaires
    - Pas de ``getattr``, pas de listes indexées arbitraires
    """
    try:
        assert_safe_path(path, context="resolve")
    except VariableValidationError as exc:
        raise ResolveError(str(exc)) from exc

    if not isinstance(root, dict):
        raise ResolveError("La racine de résolution doit être un dict")

    cur: Any = root
    for part in path.split("."):
        if part.startswith("__") or "__" in part:
            raise ResolveError(f"Segment interdit « {part} »")
        if not _is_plain_mapping(cur):
            if strict_missing:
                raise ResolveError(f"Chemin « {path} » : parent non-objet à « {part} »")
            return missing
        if part not in cur:
            if strict_missing:
                raise ResolveError(f"Chemin « {path} » introuvable")
            return missing
        cur = cur[part]
        # Interdire de remonter vers des objets non JSON
        if cur is not None and not isinstance(cur, (*_SCALAR, dict, list)):
            raise ResolveError(
                f"Chemin « {path} » résout un type non autorisé ({type(cur).__name__})"
            )

    if isinstance(cur, (dict, list)):
        # Les templates ne doivent pas dump un objet entier via {{school}}
        if path.count(".") == 0:
            if strict_missing:
                raise ResolveError(f"Chemin « {path} » pointe vers un objet, pas une valeur")
            return missing
    return cur


def interpolate(
    text: str,
    root: dict[str, Any],
    *,
    missing: str = "",
) -> str:
    """Remplace ``{{path}}`` par des valeurs contrôlées."""
    if not text:
        return ""
    validate_interpolated_text(text, context="interpolate")

    def _repl(match: re.Match[str]) -> str:
        path = match.group(1)
        value = resolve_path(root, path, missing=None)
        if value is None:
            return missing
        if isinstance(value, bool):
            return "oui" if value else "non"
        if isinstance(value, float):
            return f"{value:.2f}".rstrip("0").rstrip(".") if value == int(value) else f"{value:.2f}"
        return str(value)

    return _VAR_RE.sub(_repl, text)


def try_resolve(root: dict[str, Any], path: str) -> tuple[bool, Any]:
    """Retourne (ok, value) sans lever pour chemins whitelistés absents."""
    if not is_safe_path(path):
        return False, None
    try:
        return True, resolve_path(root, path, missing=None)
    except ResolveError:
        return False, None
