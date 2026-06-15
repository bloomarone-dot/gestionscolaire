"""
Bulletin scolaire — format officiel Cameroun (sections francophone / anglophone).
"""
from collections import defaultdict
from typing import Optional

from sqlalchemy.orm import Session

from app.models.school import (
    Eleve, Note, Matiere, Classe, AnneeScolaire,
    AttributionProfesseur, Professeur, School,
)
from app.services.bulletin_service import (
    build_eleve_bulletin,
    build_classe_bulletins,
    _moyenne_matiere_trimestre,
    _trim_note_for_group,
    _populate_note_group,
)
from app.services.evaluation_types import (
    empty_note_group,
    resolve_sequence_entry,
    sequence_labels_for_trimestre,
    all_sequence_labels,
)


GROUP_LABELS_FR = {
    1: "Premier groupe",
    2: "Deuxième groupe",
    3: "Troisième groupe",
}
GROUP_LABELS_EN = {
    1: "FIRST GROUP",
    2: "SECOND GROUP",
    3: "THIRD GROUP",
}


def appreciation_code(moyenne: Optional[float], lang: str) -> str:
    if moyenne is None:
        return "—"
    if moyenne < 10:
        return "CNA" if lang == "en" else "NA"
    if moyenne < 12:
        return "IPA" if lang == "en" else "ECA"
    return "A"


def decision_label(moyenne: float, lang: str) -> str:
    if moyenne >= 10:
        return "PASSED" if lang == "en" else "ADMIS"
    return "FAILED" if lang == "en" else "AJOURNÉ"


def term_label(trimestre: int, lang: str) -> str:
    if lang == "en":
        return {1: "1ST TERM", 2: "2ND TERM", 3: "3RD TERM"}.get(trimestre, f"{trimestre}TH TERM")
    return {1: "1er TRIMESTRE", 2: "2e TRIMESTRE", 3: "3e TRIMESTRE"}.get(trimestre, f"{trimestre}e TRIMESTRE")


def _get_school_config(master_db: Session, school_id: Optional[int]) -> dict:
    defaults = {
        "name": "ÉTABLISSEMENT SCOLAIRE",
        "address": "",
        "city": "",
        "phone": "",
        "logo_url": None,
        "bulletin_po_box": "",
        "bulletin_motto": "",
        "bulletin_delegation_en": (
            "REPUBLIC OF CAMEROON\nPeace – Work – Fatherland\n"
            "MINISTRY OF SECONDARY EDUCATION\n"
            "REGIONAL DELEGATION FOR CENTER\n"
            "DIVISIONAL DELEGATION FOR MEFOU AND AFAMBA"
        ),
        "bulletin_delegation_fr": (
            "RÉPUBLIQUE DU CAMEROUN\nPaix – Travail – Patrie\n"
            "MINISTÈRE DES ENSEIGNEMENTS SECONDAIRES\n"
            "DÉLÉGATION RÉGIONALE DU CENTRE\n"
            "DÉLÉGATION DÉPARTEMENTALE DU MEFOU ET AFAMBA"
        ),
        "bulletin_next_term_note": "",
        "bulletin_template": "cameroon_bilingual",
        "bulletin_scope": "trimestre",
    }
    if not school_id or not master_db:
        return defaults
    school = master_db.query(School).filter(School.id == school_id).first()
    if not school:
        return defaults
    return {
        "name": school.name.upper(),
        "address": school.address or "",
        "city": school.city or "",
        "phone": school.phone or "",
        "logo_url": school.logo_url,
        "bulletin_po_box": school.bulletin_po_box or "",
        "bulletin_motto": school.bulletin_motto or "",
        "bulletin_delegation_en": school.bulletin_delegation_en or defaults["bulletin_delegation_en"],
        "bulletin_delegation_fr": school.bulletin_delegation_fr or defaults["bulletin_delegation_fr"],
        "bulletin_next_term_note": school.bulletin_next_term_note or "",
        "bulletin_template": getattr(school, "bulletin_template", None) or "cameroon_bilingual",
        "bulletin_scope": getattr(school, "bulletin_scope", None) or "trimestre",
    }


def _teacher_name(db: Session, classe_id: int, matiere_id: int) -> str:
    attr = db.query(AttributionProfesseur).filter(
        AttributionProfesseur.classe_id == classe_id,
        AttributionProfesseur.matiere_id == matiere_id,
        AttributionProfesseur.is_active == True,
    ).first()
    if not attr:
        return "—"
    prof = db.query(Professeur).filter(Professeur.id == attr.professeur_id).first()
    if not prof:
        return "—"
    return f"{prof.nom} {prof.prenom}"


def _compute_matiere_ranks(db: Session, classe_id: int, trimestre: int) -> dict[int, dict[int, int]]:
    """Rang par matière : {matiere_id: {eleve_id: rang}}."""
    eleves = db.query(Eleve).filter(Eleve.classe_id == classe_id).all()
    notes = db.query(Note).filter(Note.trimestre == trimestre).all()
    eleve_ids = {e.id for e in eleves}
    by_matiere_eleve: dict[int, dict[int, list]] = defaultdict(lambda: defaultdict(list))

    for note in notes:
        if note.eleve_id not in eleve_ids:
            continue
        by_matiere_eleve[note.matiere_id][note.eleve_id].append(note)

    ranks: dict[int, dict[int, int]] = defaultdict(dict)
    for matiere_id, eleve_notes in by_matiere_eleve.items():
        scores = []
        for eid, nlist in eleve_notes.items():
            grouped = empty_note_group()
            for n in nlist:
                _populate_note_group(grouped, n, "trimestre")
            moy = _moyenne_matiere_trimestre(
                resolve_sequence_entry(grouped, trimestre, 1),
                resolve_sequence_entry(grouped, trimestre, 2),
                _trim_note_for_group(grouped, trimestre),
            )
            if moy is not None:
                scores.append((eid, moy))
        scores.sort(key=lambda x: x[1], reverse=True)
        for rank, (eid, _) in enumerate(scores, start=1):
            ranks[matiere_id][eid] = rank
    return ranks


def build_cameroon_bulletin(
    db: Session,
    eleve_id: int,
    trimestre: int = 1,
    lang: Optional[str] = None,
    master_db: Optional[Session] = None,
    school_id: Optional[int] = None,
    scope: Optional[str] = None,
) -> dict:
    school = _get_school_config(master_db, school_id)
    bulletin_scope = scope or school.get("bulletin_scope", "trimestre")
    base = build_eleve_bulletin(db, eleve_id, trimestre, scope=bulletin_scope)
    if "error" in base:
        return base

    eleve = db.query(Eleve).filter(Eleve.id == eleve_id).first()
    classe = db.query(Classe).filter(Classe.id == eleve.classe_id).first() if eleve else None
    section = getattr(classe, "section", None) or "francophone"
    school_template = school.get("bulletin_template", "cameroon_bilingual")
    if lang is None:
        lang = "en" if section == "anglophone" else "fr"

    classe_data = build_classe_bulletins(db, eleve.classe_id, trimestre)
    effectif = classe_data.get("effectif", 0)
    moyenne_classe = 0.0
    if classe_data.get("bulletins"):
        moyenne_classe = round(
            sum(b["moyenne_generale"] for b in classe_data["bulletins"]) / len(classe_data["bulletins"]),
            2,
        )

    matiere_ranks = _compute_matiere_ranks(db, eleve.classe_id, trimestre)

    is_annual = bulletin_scope == "annual"
    seq1_label, seq2_label = sequence_labels_for_trimestre(trimestre, lang)
    sequence_labels_list = all_sequence_labels(lang) if is_annual else [seq1_label, seq2_label]
    group_labels = GROUP_LABELS_EN if lang == "en" else GROUP_LABELS_FR

    attrs = db.query(AttributionProfesseur).filter(
        AttributionProfesseur.classe_id == eleve.classe_id,
        AttributionProfesseur.is_active == True,
    ).all()
    all_matiere_ids = list({a.matiere_id for a in attrs})
    matieres_db = {}
    if all_matiere_ids:
        for m in db.query(Matiere).filter(Matiere.id.in_(all_matiere_ids)).all():
            matieres_db[m.id] = m

    details_by_id = {d["matiere_id"]: d for d in base["details_matieres"] if d.get("matiere_id")}
    grouped_rows: dict[int, list] = {1: [], 2: [], 3: []}
    total_coef = 0.0
    total_points = 0.0

    iterable_ids = all_matiere_ids if all_matiere_ids else list(details_by_id.keys())
    for mid in sorted(iterable_ids, key=lambda i: (matieres_db.get(i).nom if matieres_db.get(i) else "")):
        detail = details_by_id.get(mid, {
            "matiere_id": mid,
            "matiere": matieres_db[mid].nom if matieres_db.get(mid) else "—",
            "sequence_1": None, "sequence_2": None,
            "coef_sequence_1": None, "coef_sequence_2": None,
            "note_trimestre": None, "coef_trimestre": None,
            "moyenne_matiere": None, "moyenne_calculee": None,
        })
        mat = matieres_db.get(mid)
        groupe = getattr(mat, "groupe", None) or 1
        if groupe not in grouped_rows:
            groupe = 1
        coef = detail.get("coef_trimestre") or (getattr(mat, "coefficient_defaut", None) if mat else None) or 1.0
        moy = detail.get("moyenne_matiere")
        points = round(moy * coef, 2) if moy is not None else None
        if moy is not None:
            total_coef += coef
            total_points += points

        row = {
            **detail,
            "groupe": groupe,
            "coef": coef,
            "points": points,
            "seq1_label": seq1_label,
            "seq2_label": seq2_label,
            "seq1": detail.get("sequence_1"),
            "seq2": detail.get("sequence_2"),
            "moyenne": moy,
            "rang_matiere": matiere_ranks.get(mid, {}).get(eleve_id),
            "appreciation": appreciation_code(moy, lang),
            "professeur": _teacher_name(db, eleve.classe_id, mid) if mid else "—",
        }
        if is_annual:
            for i in range(1, 7):
                row[f"seq{i}"] = detail.get(f"sequence_{i}")
        grouped_rows[groupe].append(row)

    for g in grouped_rows:
        grouped_rows[g].sort(key=lambda r: r.get("matiere", ""))

    groups_output = []
    for g in sorted(grouped_rows.keys()):
        if grouped_rows[g]:
            groups_output.append({
                "groupe": g,
                "label": group_labels.get(g, f"Groupe {g}"),
                "matieres": grouped_rows[g],
            })

    rang_eleve = base.get("rang")
    if not rang_eleve and classe_data.get("bulletins"):
        for b in classe_data["bulletins"]:
            if b["eleve_id"] == eleve_id:
                rang_eleve = b.get("rang")
                break

    moyenne = base["moyenne_generale"]
    return {
        **base,
        "format": "cameroon",
        "lang": lang,
        "section": section,
        "bulletin_template": school_template,
        "school": school,
        "bulletin_scope": bulletin_scope,
        "seq1_label": seq1_label,
        "seq2_label": seq2_label,
        "sequence_labels": sequence_labels_list,
        "term_label": "ANNUAL REPORT" if is_annual and lang == "en" else ("BULLETIN ANNUEL" if is_annual else term_label(trimestre, lang)),
        "effectif": effectif,
        "moyenne_classe": moyenne_classe,
        "total_coef": round(total_coef, 2),
        "total_points": round(total_points, 2),
        "decision": decision_label(moyenne, lang),
        "appreciation_generale": appreciation_code(moyenne, lang),
        "rang": rang_eleve,
        "rang_label": (
            f"{rang_eleve}st OUT OF {effectif}" if lang == "en" and rang_eleve == 1 else
            f"{rang_eleve}nd OUT OF {effectif}" if lang == "en" and rang_eleve == 2 else
            f"{rang_eleve}rd OUT OF {effectif}" if lang == "en" and rang_eleve == 3 else
            f"{rang_eleve}th OUT OF {effectif}" if lang == "en" and rang_eleve else
            "1er" if lang == "fr" and rang_eleve == 1 else
            f"{rang_eleve}e" if lang == "fr" and rang_eleve else "—"
        ),
        "eleve_sexe": getattr(eleve, "sexe", None) or "—",
        "redoublant": "OUI" if getattr(eleve, "redoublant", False) else ("NON" if lang == "fr" else "NO"),
        "classe_serie": getattr(classe, "serie", None) or "—",
        "groupes_matieres": groups_output,
        "absences": 0,
        "observation": "",
        "sanctions": "",
    }
