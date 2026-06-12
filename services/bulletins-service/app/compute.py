"""Calculs du bulletin (cahier §11.1) — pur et testable, sans I/O.

Règles :
- moyenne par matière = moyenne des notes de la période (séquences) ;
- moyenne pondérée par coefficient (matières OFFICIELLES activées uniquement) ;
- rang par matière et rang général dans la classe ;
- moyenne de la classe ;
- les matières SPÉCIALES sont calculées mais listées à part et n'entrent PAS
  dans la moyenne générale ni les statistiques d'examen (§11.3).
"""
from statistics import mean
from typing import Optional

from app.labels import appreciation


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


def compute_class_bulletins(
    students: list[dict],
    subjects: list[dict],
    notes: list[dict],
    lang: str = "fr",
) -> dict:
    """Calcule les bulletins de tous les élèves d'une classe pour une période.

    students : [{eleve_id, matricule, nom, prenom}]
    subjects : [{matiere_id, nom, coefficient, source, enseignant_id}] (activées)
    notes    : [{eleve_id, matiere_id, valeur}]
    """
    official = [s for s in subjects if s.get("source", "OFFICIELLE") != "SPECIALE"]
    special = [s for s in subjects if s.get("source") == "SPECIALE"]

    # moyenne par (élève, matière)
    bucket: dict[tuple[int, int], list[float]] = {}
    for n in notes:
        bucket.setdefault((n["eleve_id"], n["matiere_id"]), []).append(n["valeur"])

    def subject_avg(eleve_id: int, matiere_id: int) -> Optional[float]:
        vals = bucket.get((eleve_id, matiere_id))
        return _round(mean(vals)) if vals else None

    # Moyennes générales (officielles) + collecte pour les rangs par matière
    gen_avgs: dict[int, Optional[float]] = {}
    per_subject_avgs: dict[int, dict[int, Optional[float]]] = {s["matiere_id"]: {} for s in official}
    student_rows: dict[int, dict] = {}

    for st in students:
        eid = st["eleve_id"]
        total_points = 0.0
        total_coeff = 0.0
        off_rows = []
        for s in official:
            avg = subject_avg(eid, s["matiere_id"])
            per_subject_avgs[s["matiere_id"]][eid] = avg
            points = None if avg is None else _round(avg * s["coefficient"])
            if avg is not None:
                total_points += avg * s["coefficient"]
                total_coeff += s["coefficient"]
            off_rows.append({
                "matiere_id": s["matiere_id"], "nom": s["nom"],
                "coefficient": s["coefficient"], "moyenne": avg, "points": points,
                "enseignant_id": s.get("enseignant_id"),
                "appreciation": appreciation(avg, lang),
            })
        moyenne_generale = _round(total_points / total_coeff) if total_coeff else None
        gen_avgs[eid] = moyenne_generale

        sp_rows = []
        for s in special:
            avg = subject_avg(eid, s["matiere_id"])
            sp_rows.append({
                "matiere_id": s["matiere_id"], "nom": s["nom"],
                "coefficient": s["coefficient"], "moyenne": avg,
                "points": None if avg is None else _round(avg * s["coefficient"]),
                "appreciation": appreciation(avg, lang),
            })

        student_rows[eid] = {
            "eleve_id": eid, "matricule": st.get("matricule"),
            "nom": st.get("nom"), "prenom": st.get("prenom"),
            "subjects": off_rows, "special_subjects": sp_rows,
            "total_coefficient": _round(total_coeff), "total_points": _round(total_points),
            "moyenne_generale": moyenne_generale,
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
