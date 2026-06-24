"""Calculs du bulletin (cahier §11.1) — pur et testable, sans I/O.

Règles :
- moyenne par matière = moyenne des notes de la période (séquences) ;
- moyenne pondérée par coefficient (matières OFFICIELLES activées uniquement) ;
- rang par matière et rang général dans la classe ;
- moyenne de la classe ;
- les matières SPÉCIALES sans groupe sont listées à part (complémentaires) ;
- les matières SPÉCIALES avec groupe 1/2/3 entrent dans le tableau principal.
"""
from __future__ import annotations

import re
from statistics import mean
from typing import Optional

from common.appreciation_scales import label_for_average, parse_scales

from common.establishment import is_language_center

from app.labels import seq_types_for

_GROUP3_RE = re.compile(
    r"sport|manual\s*labou?r|eps|éducation\s*physique|physical\s*education",
    re.I,
)
_GROUP2_RE = re.compile(
    r"english|french|français|langue|practical|allemand|espagnol|german|spanish",
    re.I,
)
# Matières facultatives hors tableau principal (non comptées dans TOTAL).
_COMPLEMENTARY_RE = re.compile(
    r"mandarin|chinese|chinois|japanese|japonais|cor(?:e|é)an|arabe|arabic|latin|grec",
    re.I,
)


def _effective_groupe(subject: dict) -> int:
    """Groupe bulletin 1/2/3 — infère depuis le nom si absent en base."""
    g = subject.get("groupe")
    if g in (1, 2, 3):
        return int(g)
    nom = subject.get("nom") or ""
    if _GROUP3_RE.search(nom):
        return 3
    if _GROUP2_RE.search(nom):
        return 2
    return 1


def _is_complementary_special(subject: dict) -> bool:
    """Matière spéciale hors 3 groupes — bloc complémentaire (exclue des totaux)."""
    if subject.get("source") != "SPECIALE" or subject.get("groupe"):
        return False
    nom = subject.get("nom") or ""
    if _GROUP3_RE.search(nom) or _GROUP2_RE.search(nom):
        return False
    return bool(_COMPLEMENTARY_RE.search(nom))


def _partition_subjects(subjects: list[dict], *, flat_groups: bool = False) -> tuple[list[dict], list[dict]]:
    """Sépare matières du tableau principal et complémentaires sans groupe."""
    official: list[dict] = []
    special: list[dict] = []
    for s in subjects:
        if _is_complementary_special(s):
            special.append(s)
        else:
            groupe = 1 if flat_groups else _effective_groupe(s)
            official.append({**s, "groupe": groupe})
    if not official and special:
        official = [{**s, "groupe": _effective_groupe(s)} for s in special]
        special = []
    return official, special


def _bulletin_row_points(avg: Optional[float], coefficient: float) -> Optional[float]:
    return None if avg is None else _round(avg * coefficient)


def _sum_bulletin_totals(rows: list[dict]) -> tuple[float, float]:
    """Somme coef + points à partir des lignes affichées (points arrondis par matière)."""
    total_coeff = 0.0
    total_points = 0.0
    for row in rows:
        avg = row.get("moyenne")
        if avg is None:
            continue
        coef = float(row.get("coefficient") or 0)
        points = row.get("points")
        if points is None:
            points = _bulletin_row_points(avg, coef)
        total_coeff += coef
        total_points += float(points or 0)
    return total_coeff, total_points


def _round(x: Optional[float]) -> Optional[float]:
    return None if x is None else round(x, 2)


def _ranks(values: dict[int, Optional[float]]) -> dict[int, Optional[int]]:
    """Rang en compétition (ex æquo partagés), valeurs décroissantes ; None = pas de rang."""
    rated = [(k, v) for k, v in values.items() if v is not None]
    rated.sort(key=lambda kv: kv[1], reverse=True)
    ranks: dict[int, Optional[int]] = {k: None for k in values}
    prev_value = None
    prev_rank = 0
    for i, (k, v) in enumerate(rated, start=1):
        if prev_value is not None and v == prev_value:
            ranks[k] = prev_rank
        else:
            ranks[k] = i
            prev_rank = i
            prev_value = v
    return ranks


TRIMESTER_SEQS: dict[int, tuple[str, str]] = {
    1: ("sequence_1", "sequence_2"),
    2: ("sequence_3", "sequence_4"),
    3: ("sequence_5", "sequence_6"),
}


def _lc_session_prefix(trimestre: int) -> str:
    return f"lc_s{trimestre}_w"


def _lc_session_period_values(
    note_map: dict[str, float], trimestre: int,
) -> tuple[list[Optional[float]], Optional[float]]:
    """Moyenne de toutes les séances du samedi d'une session ; affiche les 2 dernières."""
    prefix = _lc_session_prefix(trimestre)
    pairs = sorted((k, v) for k, v in note_map.items() if k.startswith(prefix))
    all_vals = [v for _, v in pairs]
    moyenne = _round(mean(all_vals)) if all_vals else None
    recent = [v for _, v in pairs[-2:]]
    while len(recent) < 2:
        recent.insert(0, None)
    return recent[-2:], moyenne


def _trimester_subject_avg(
    note_map: dict[str, float],
    trimestre_num: int,
    *,
    establishment_kind: str = "SCHOOL",
) -> Optional[float]:
    """Moyenne matière sur un trimestre / session."""
    if is_language_center(establishment_kind):
        return _lc_session_period_values(note_map, trimestre_num)[1]
    seq_types = TRIMESTER_SEQS[trimestre_num]
    vals = [note_map.get(t) for t in seq_types]
    present = [v for v in vals if v is not None]
    return _round(mean(present)) if present else None


def compute_class_bulletins(
    students: list[dict],
    subjects: list[dict],
    notes: list[dict],
    lang: str = "fr",
    trimestre: int = 1,
    scope: str = "trimestre",
    appreciation_scales: dict | None = None,
    establishment_kind: str = "SCHOOL",
) -> dict:
    """Calcule les bulletins de tous les élèves d'une classe pour une période.

    Les deux évaluations affichées dépendent du trimestre :
    T1 → séquences 1 & 2, T2 → 3 & 4, T3 → 5 & 6.

    students : [{eleve_id, matricule, nom, prenom}]
    subjects : [{matiere_id, nom, coefficient, source, enseignant_id, groupe}] (activées)
    notes    : [{eleve_id, matiere_id, valeur, type_evaluation}]
    """
    official, special = _partition_subjects(subjects, flat_groups=is_language_center(establishment_kind))
    official.sort(key=lambda s: (s.get("groupe") or 1, (s.get("nom") or "").lower()))

    scales = parse_scales(appreciation_scales)

    def appr(moyenne: Optional[float]) -> str:
        return label_for_average(moyenne, lang, scales)

    seq_types = seq_types_for(scope, trimestre)

    # Notes par (élève, matière) → {type_evaluation: valeur}
    bucket: dict[tuple[int, int], dict[str, float]] = {}
    for n in notes:
        key = (n["eleve_id"], n["matiere_id"])
        bucket.setdefault(key, {})[n.get("type_evaluation") or seq_types[0]] = n["valeur"]

    def subject_period_values(eleve_id: int, matiere_id: int):
        """Retourne (colonnes affichées, moyenne période) selon scope."""
        d = bucket.get((eleve_id, matiere_id), {})
        if scope == "annual":
            # Note de cadrage MVP §13 : Moy T1, Moy T2, Moy T3 → Moy annuelle.
            trim_avgs = [
                _trimester_subject_avg(d, t, establishment_kind=establishment_kind)
                for t in (1, 2, 3)
            ]
            present = [v for v in trim_avgs if v is not None]
            moyenne = _round(mean(present)) if present else None
            return trim_avgs, moyenne
        if is_language_center(establishment_kind):
            return _lc_session_period_values(d, trimestre)
        vals = [d.get(t) for t in seq_types]
        present = [v for v in vals if v is not None]
        if not present and d:
            present = list(d.values())
        moyenne = _round(mean(present)) if present else None
        return vals, moyenne

    # Moyennes générales (officielles) + collecte pour les rangs par matière
    gen_avgs: dict[int, Optional[float]] = {}
    per_subject_avgs: dict[int, dict[int, Optional[float]]] = {s["matiere_id"]: {} for s in official}
    student_rows: dict[int, dict] = {}

    for st in students:
        eid = st["eleve_id"]
        off_rows = []
        for s in official:
            seqs, avg = subject_period_values(eid, s["matiere_id"])
            per_subject_avgs[s["matiere_id"]][eid] = avg
            points = _bulletin_row_points(avg, s["coefficient"])
            off_rows.append({
                "matiere_id": s["matiere_id"], "nom": s["nom"],
                "seqs": seqs,
                "coefficient": s["coefficient"], "moyenne": avg, "points": points,
                "enseignant_id": s.get("enseignant_id"),
                "enseignant_nom": s.get("enseignant_nom"), "groupe": s.get("groupe"),
                "appreciation": appr(avg),
            })
        total_coeff, total_points = _sum_bulletin_totals(off_rows)
        moyenne_generale = _round(total_points / total_coeff) if total_coeff else None
        gen_avgs[eid] = moyenne_generale

        sp_rows = []
        for s in special:
            seqs, avg = subject_period_values(eid, s["matiere_id"])
            sp_rows.append({
                "matiere_id": s["matiere_id"], "nom": s["nom"],
                "seqs": seqs,
                "coefficient": s["coefficient"], "moyenne": avg,
                "points": _bulletin_row_points(avg, s["coefficient"]),
                "appreciation": appr(avg),
            })

        student_rows[eid] = {
            "eleve_id": eid, "matricule": st.get("matricule"),
            "nom": st.get("nom"), "prenom": st.get("prenom"),
            "sexe": st.get("sexe"), "redoublant": st.get("redoublant"),
            "subjects": off_rows, "special_subjects": sp_rows,
            "total_coefficient": _round(total_coeff), "total_points": _round(total_points),
            "moyenne_generale": moyenne_generale,
            "appreciation_generale": appr(moyenne_generale),
        }

    # Rangs par matière
    subject_ranks = {mid: _ranks(avgs) for mid, avgs in per_subject_avgs.items()}
    for eid, row in student_rows.items():
        for sub in row["subjects"]:
            sub["rang_matiere"] = subject_ranks[sub["matiere_id"]].get(eid)

    # Rang général + moyenne de la classe
    general_ranks = _ranks(gen_avgs)
    for eid, row in student_rows.items():
        row["rang_general"] = general_ranks.get(eid)

    rated = [v for v in gen_avgs.values() if v is not None]
    moyenne_classe = _round(mean(rated)) if rated else None

    return {
        "lang": lang,
        "effectif": len(students),
        "moyenne_classe": moyenne_classe,
        "bulletins": list(student_rows.values()),
    }
