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
    trimestre: int = 1,
) -> dict:
    """Calcule les bulletins de tous les élèves d'une classe pour une période.

    Les deux évaluations affichées dépendent du trimestre :
    T1 → séquences 1 & 2, T2 → 3 & 4, T3 → 5 & 6.

    students : [{eleve_id, matricule, nom, prenom}]
    subjects : [{matiere_id, nom, coefficient, source, enseignant_id, groupe}] (activées)
    notes    : [{eleve_id, matiere_id, valeur, type_evaluation}]
    """
    official = [s for s in subjects if s.get("source", "OFFICIELLE") != "SPECIALE"]
    special = [s for s in subjects if s.get("source") == "SPECIALE"]

    seq_a = f"sequence_{2 * trimestre - 1}"
    seq_b = f"sequence_{2 * trimestre}"

    # Notes par (élève, matière) → {type_evaluation: valeur}
    bucket: dict[tuple[int, int], dict[str, float]] = {}
    for n in notes:
        key = (n["eleve_id"], n["matiere_id"])
        bucket.setdefault(key, {})[n.get("type_evaluation") or seq_a] = n["valeur"]

    def subject_seqs(eleve_id: int, matiere_id: int):
        """Retourne (seqA, seqB, moyenne) pour les deux séquences du trimestre."""
        d = bucket.get((eleve_id, matiere_id), {})
        s_a = d.get(seq_a)
        s_b = d.get(seq_b)
        present = [v for v in (s_a, s_b) if v is not None]
        if not present and d:          # tolérance : autres types saisis
            present = list(d.values())
        moyenne = _round(mean(present)) if present else None
        return s_a, s_b, moyenne

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
            seq1, seq2, avg = subject_seqs(eid, s["matiere_id"])
            per_subject_avgs[s["matiere_id"]][eid] = avg
            points = None if avg is None else _round(avg * s["coefficient"])
            if avg is not None:
                total_points += avg * s["coefficient"]
                total_coeff += s["coefficient"]
            off_rows.append({
                "matiere_id": s["matiere_id"], "nom": s["nom"],
                "seq1": seq1, "seq2": seq2,
                "coefficient": s["coefficient"], "moyenne": avg, "points": points,
                "enseignant_id": s.get("enseignant_id"),
                "enseignant_nom": s.get("enseignant_nom"), "groupe": s.get("groupe"),
                "appreciation": appreciation(avg, lang),
            })
        moyenne_generale = _round(total_points / total_coeff) if total_coeff else None
        gen_avgs[eid] = moyenne_generale

        sp_rows = []
        for s in special:
            seq1, seq2, avg = subject_seqs(eid, s["matiere_id"])
            sp_rows.append({
                "matiere_id": s["matiere_id"], "nom": s["nom"],
                "seq1": seq1, "seq2": seq2,
                "coefficient": s["coefficient"], "moyenne": avg,
                "points": None if avg is None else _round(avg * s["coefficient"]),
                "appreciation": appreciation(avg, lang),
            })

        student_rows[eid] = {
            "eleve_id": eid, "matricule": st.get("matricule"),
            "nom": st.get("nom"), "prenom": st.get("prenom"),
            "sexe": st.get("sexe"), "redoublant": st.get("redoublant"),
            "subjects": off_rows, "special_subjects": sp_rows,
            "total_coefficient": _round(total_coeff), "total_points": _round(total_points),
            "moyenne_generale": moyenne_generale,
            "appreciation_generale": appreciation(moyenne_generale, lang),
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
