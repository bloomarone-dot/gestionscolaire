"""Registre de critères extensibles pour les règles de progression.

Chaque critère est un composant enregistré via ``register_criterion``.
Ajouter un nouveau critère = implémenter ``evaluate`` + appeler ``register_criterion``
sans modifier l'architecture du moteur.
"""
from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any, Callable, Optional


@dataclass
class CriterionContext:
    """Données disponibles pour l'évaluation d'un élève."""
    eleve_id: int
    classe_id: int
    eleve: dict = field(default_factory=dict)
    classe: dict = field(default_factory=dict)
    bulletin: dict = field(default_factory=dict)
    notes: list[dict] = field(default_factory=list)
    extra: dict = field(default_factory=dict)


@dataclass
class CriterionMeta:
    code: str
    label: str
    value_type: str = "number"  # number | boolean | string
    description: str = ""
    evaluate: Callable[[CriterionContext, dict], Any] = lambda ctx, cfg: None


CRITERION_REGISTRY: dict[str, CriterionMeta] = {}


def register_criterion(meta: CriterionMeta) -> CriterionMeta:
    CRITERION_REGISTRY[meta.code] = meta
    return meta


def get_criterion(code: str) -> CriterionMeta | None:
    return CRITERION_REGISTRY.get(code)


def list_criteria() -> list[dict]:
    return [
        {
            "code": m.code,
            "label": m.label,
            "value_type": m.value_type,
            "description": m.description,
        }
        for m in CRITERION_REGISTRY.values()
    ]


# ── Helpers ──────────────────────────────────────────────────────────────
def _moyenne_generale(ctx: CriterionContext, _cfg: dict) -> Optional[float]:
    b = ctx.bulletin or {}
    v = b.get("moyenne_generale")
    if v is not None:
        return float(v)
    return ctx.extra.get("moyenne_generale")


def _moyenne_annuelle(ctx: CriterionContext, _cfg: dict) -> Optional[float]:
    return _moyenne_generale(ctx, _cfg)


def _moyenne_trimestrielle(ctx: CriterionContext, cfg: dict) -> Optional[float]:
    trim = int(cfg.get("trimestre", 3))
    b = ctx.bulletin or {}
    trimestres = b.get("trimestres") or b.get("term_averages") or {}
    if isinstance(trimestres, dict):
        return trimestres.get(trim) or trimestres.get(str(trim))
    if isinstance(trimestres, list) and len(trimestres) >= trim:
        return trimestres[trim - 1]
    return None


def _moyenne_matiere(ctx: CriterionContext, cfg: dict) -> Optional[float]:
    matiere_id = cfg.get("matiere_id")
    subject_code = cfg.get("subject_code")
    rows = ctx.bulletin.get("lignes") or ctx.bulletin.get("subjects") or []
    for row in rows:
        if matiere_id and row.get("matiere_id") == matiere_id:
            return row.get("moyenne") or row.get("average")
        if subject_code and row.get("subject_code") == subject_code:
            return row.get("moyenne") or row.get("average")
    return None


def _matieres_echouees(ctx: CriterionContext, cfg: dict) -> int:
    seuil = float(cfg.get("seuil", 10))
    rows = ctx.bulletin.get("lignes") or ctx.bulletin.get("subjects") or []
    count = 0
    for row in rows:
        m = row.get("moyenne") or row.get("average")
        if m is not None and float(m) < seuil:
            count += 1
    return count


def _moyenne_groupe(ctx: CriterionContext, cfg: dict) -> Optional[float]:
    groupe = cfg.get("groupe")
    if not groupe:
        return None
    rows = ctx.bulletin.get("lignes") or ctx.bulletin.get("subjects") or []
    vals = [
        float(r.get("moyenne") or r.get("average"))
        for r in rows
        if r.get("groupe") == groupe and (r.get("moyenne") or r.get("average")) is not None
    ]
    return sum(vals) / len(vals) if vals else None


def _discipline(ctx: CriterionContext, _cfg: dict) -> int:
    return int(ctx.extra.get("sanctions_count") or ctx.bulletin.get("sanctions_count") or 0)


def _assiduite(ctx: CriterionContext, _cfg: dict) -> float:
    absences = ctx.extra.get("absences_heures") or ctx.bulletin.get("absences_heures")
    return float(absences or 0)


def _retards(ctx: CriterionContext, _cfg: dict) -> int:
    return int(ctx.extra.get("retards_count") or 0)


def _age(ctx: CriterionContext, _cfg: dict) -> Optional[int]:
    from datetime import date
    dn = ctx.eleve.get("date_naissance")
    if not dn:
        return None
    if isinstance(dn, str):
        parts = dn.split("-")
        if len(parts) >= 3:
            born = date(int(parts[0]), int(parts[1]), int(parts[2]))
        else:
            return None
    else:
        born = dn
    today = date.today()
    return today.year - born.year - ((today.month, today.day) < (born.month, born.day))


def _statut_admin(ctx: CriterionContext, _cfg: dict) -> str:
    return str(ctx.eleve.get("statut") or "")


def _appreciation(ctx: CriterionContext, _cfg: dict) -> str:
    return str(ctx.bulletin.get("appreciation") or "")


# ── Enregistrement des critères intégrés ─────────────────────────────────
_BUILTIN = [
    ("moyenne_generale", "Moyenne générale", "number", "Moyenne annuelle du bulletin", _moyenne_generale),
    ("moyenne_annuelle", "Moyenne annuelle", "number", "Alias de la moyenne générale annuelle", _moyenne_annuelle),
    ("moyenne_trimestrielle", "Moyenne trimestrielle", "number", "Moyenne d'un trimestre (config: trimestre)", _moyenne_trimestrielle),
    ("moyenne_matiere", "Moyenne par matière", "number", "Moyenne d'une matière (config: matiere_id ou subject_code)", _moyenne_matiere),
    ("matieres_echouees", "Nombre de matières échouées", "number", "Matières sous le seuil (config: seuil, défaut 10)", _matieres_echouees),
    ("moyenne_groupe_matieres", "Moyenne d'un groupe de matières", "number", "Moyenne d'un groupe (config: groupe)", _moyenne_groupe),
    ("discipline", "Sanctions disciplinaires", "number", "Nombre de sanctions", _discipline),
    ("assiduite", "Assiduité (absences heures)", "number", "Heures d'absence", _assiduite),
    ("retards", "Retards", "number", "Nombre de retards", _retards),
    ("competences", "Compétences", "string", "Appréciation / compétences (placeholder)", _appreciation),
    ("appreciations", "Appréciations", "string", "Libellé d'appréciation du bulletin", _appreciation),
    ("decision_disciplinaire", "Décision disciplinaire", "string", "Décision disciplinaire (extra)", lambda c, _: str(c.extra.get("decision_disciplinaire") or "")),
    ("examen_officiel", "Examen officiel", "number", "Note examen officiel (extra)", lambda c, _: c.extra.get("examen_officiel")),
    ("age", "Âge de l'élève", "number", "Âge calculé à partir de la date de naissance", _age),
    ("presence", "Présence", "number", "Taux de présence % (extra)", lambda c, _: c.extra.get("presence_pct")),
    ("statut_administratif", "Statut administratif", "string", "Statut INSCRIT, EXCLU, etc.", _statut_admin),
]

for code, label, vtype, desc, fn in _BUILTIN:
    register_criterion(CriterionMeta(code=code, label=label, value_type=vtype, description=desc, evaluate=fn))
