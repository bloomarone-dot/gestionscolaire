"""BulletinDataContext — snapshot sérialisable pour le rendu (pas d'ORM).

Le template ne voit jamais d'objets SQLAlchemy ni d'attributs Python arbitraires.
Toutes les valeurs sont des dict/list/scalaires JSON-compatibles.
"""
from __future__ import annotations

import json
from dataclasses import dataclass, field
from typing import Any, Optional


class DataContextError(ValueError):
    """Contexte de données invalide ou non sérialisable."""


_ALLOWED_SCALAR = (str, int, float, bool, type(None))


def _assert_jsonish(value: Any, *, path: str = "root") -> Any:
    """Rejette tout objet non sérialisable (ORM, classes custom, callables)."""
    if isinstance(value, _ALLOWED_SCALAR):
        return value
    if isinstance(value, dict):
        out: dict[str, Any] = {}
        for k, v in value.items():
            if not isinstance(k, str):
                raise DataContextError(f"{path}: clés dict doivent être des str")
            if k.startswith("__"):
                raise DataContextError(f"{path}: clé interdite « {k} »")
            out[k] = _assert_jsonish(v, path=f"{path}.{k}")
        return out
    if isinstance(value, (list, tuple)):
        return [_assert_jsonish(v, path=f"{path}[]") for v in value]
    # Pas de datetime brut : exiger ISO str côté producteur (étape 5)
    raise DataContextError(
        f"{path}: type non autorisé {type(value).__name__}. "
        "Le DataContext n'accepte que dict/list/str/number/bool/null."
    )


def _clean_dict(data: Optional[dict[str, Any]], *, name: str) -> dict[str, Any]:
    if data is None:
        return {}
    if not isinstance(data, dict):
        raise DataContextError(f"{name} doit être un objet JSON")
    return _assert_jsonish(data, path=name)


def _clean_list(data: Optional[list[Any]], *, name: str) -> list[Any]:
    if data is None:
        return []
    if not isinstance(data, list):
        raise DataContextError(f"{name} doit être une liste JSON")
    return _assert_jsonish(data, path=name)


@dataclass(frozen=True)
class BulletinDataContext:
    """Contexte contrôlé passé au moteur de template.

    Racines exposées au resolver (clés du root dict) :
    school, student, class, academic_year, term, period, subjects, summary, attendance, meta.
    """

    school: dict[str, Any] = field(default_factory=dict)
    student: dict[str, Any] = field(default_factory=dict)
    class_: dict[str, Any] = field(default_factory=dict)  # exposé comme "class"
    academic_year: dict[str, Any] = field(default_factory=dict)
    term: dict[str, Any] = field(default_factory=dict)
    period: dict[str, Any] = field(default_factory=dict)  # alias pratique {{period.label}}
    subjects: list[dict[str, Any]] = field(default_factory=list)
    summary: dict[str, Any] = field(default_factory=dict)
    attendance: dict[str, Any] = field(default_factory=dict)
    meta: dict[str, Any] = field(default_factory=dict)

    def root_dict(self) -> dict[str, Any]:
        """Dictionnaire racine pour le resolver (copie superficielle des racines)."""
        period = self.period or dict(self.term)
        if period and "label" not in period and "name" in period:
            period = {**period, "label": period.get("name")}
        return {
            "school": self.school,
            "student": self.student,
            "class": self.class_,
            "academic_year": self.academic_year,
            "term": self.term,
            "period": period,
            "subjects": self.subjects,
            "summary": self.summary,
            "attendance": self.attendance,
            "meta": self.meta,
        }

    def to_serializable(self) -> dict[str, Any]:
        """Export JSON-safe (preuve : pas d'ORM)."""
        data = self.root_dict()
        # Round-trip JSON pour garantir la sérialisabilité
        return json.loads(json.dumps(data, ensure_ascii=False))

    def has_root(self, name: str) -> bool:
        root = self.root_dict().get(name)
        if root is None:
            return False
        if isinstance(root, dict):
            return len(root) > 0
        if isinstance(root, list):
            return len(root) > 0
        return True

    @classmethod
    def from_mapping(cls, data: Optional[dict[str, Any]] = None) -> BulletinDataContext:
        """Construit un contexte depuis un dict (rejet si non JSON-ish)."""
        data = data or {}
        if not isinstance(data, dict):
            raise DataContextError("BulletinDataContext attend un objet JSON")
        class_data = data.get("class") if "class" in data else data.get("class_")
        term = _clean_dict(data.get("term"), name="term")
        period = _clean_dict(data.get("period"), name="period") or dict(term)
        if period and "label" not in period and period.get("name"):
            period = {**period, "label": period["name"]}
        return cls(
            school=_clean_dict(data.get("school"), name="school"),
            student=_clean_dict(data.get("student"), name="student"),
            class_=_clean_dict(class_data if isinstance(class_data, dict) else {}, name="class"),
            academic_year=_clean_dict(data.get("academic_year"), name="academic_year"),
            term=term,
            period=period,
            subjects=_clean_list(data.get("subjects"), name="subjects"),
            summary=_clean_dict(data.get("summary"), name="summary"),
            attendance=_clean_dict(data.get("attendance"), name="attendance"),
            meta=_clean_dict(data.get("meta"), name="meta"),
        )

    @classmethod
    def empty(cls) -> BulletinDataContext:
        return cls()
