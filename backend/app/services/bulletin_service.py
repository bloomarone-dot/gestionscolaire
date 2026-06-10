"""
Construction des bulletins scolaires par trimestre (séquences + moyennes).
"""
from collections import defaultdict
from typing import Optional

from sqlalchemy.orm import Session

from app.models.school import Eleve, Note, Matiere, Classe, AnneeScolaire


def _calc_moyenne_trimestre(seq1: Optional[Note], seq2: Optional[Note]) -> Optional[float]:
    if not seq1 or not seq2:
        return None
    c1 = seq1.coefficient or 1.0
    c2 = seq2.coefficient or 1.0
    total = c1 + c2
    if total <= 0:
        return None
    return round((seq1.valeur * c1 + seq2.valeur * c2) / total, 2)


def _mention_label(moyenne: float) -> str:
    if moyenne >= 16:
        return "Excellent"
    if moyenne >= 14:
        return "Bien"
    if moyenne >= 10:
        return "Passable"
    return "Insuffisant"


def _moyenne_matiere_trimestre(seq1: Optional[Note], seq2: Optional[Note], trim: Optional[Note]) -> Optional[float]:
    if trim:
        return round(trim.valeur, 2)
    return _calc_moyenne_trimestre(seq1, seq2)


def build_eleve_bulletin(db: Session, eleve_id: int, trimestre: int = 1) -> dict:
    eleve = db.query(Eleve).filter(Eleve.id == eleve_id).first()
    if not eleve:
        return {"error": "Élève non trouvé"}

    classe = db.query(Classe).filter(Classe.id == eleve.classe_id).first() if eleve.classe_id else None
    annee = None
    if classe and classe.annee_scolaire_id:
        annee = db.query(AnneeScolaire).filter(AnneeScolaire.id == classe.annee_scolaire_id).first()
    if not annee:
        annee = db.query(AnneeScolaire).filter(AnneeScolaire.is_active == True).first()

    notes = db.query(Note).filter(
        Note.eleve_id == eleve_id,
        Note.trimestre == trimestre,
    ).all()

    by_matiere: dict[int, dict] = defaultdict(lambda: {
        "sequence_1": None,
        "sequence_2": None,
        "trimestre": None,
    })
    for note in notes:
        by_matiere[note.matiere_id][note.type_evaluation] = note

    matiere_ids = list(by_matiere.keys())
    matieres = {}
    if matiere_ids:
        for m in db.query(Matiere).filter(Matiere.id.in_(matiere_ids)).all():
            matieres[m.id] = m

    details = []
    total_points = 0.0
    total_coef = 0.0

    for matiere_id, group in sorted(
        by_matiere.items(),
        key=lambda x: (matieres.get(x[0]).nom if matieres.get(x[0]) else ""),
    ):
        matiere = matieres.get(matiere_id)
        seq1 = group.get("sequence_1")
        seq2 = group.get("sequence_2")
        trim = group.get("trimestre")
        moyenne_matiere = _moyenne_matiere_trimestre(seq1, seq2, trim)

        coef_trim = (trim.coefficient if trim else 1.0) or 1.0
        if moyenne_matiere is not None:
            total_points += moyenne_matiere * coef_trim
            total_coef += coef_trim

        details.append({
            "matiere_id": matiere_id,
            "matiere": matiere.nom if matiere else "—",
            "matiere_code": matiere.code if matiere else "",
            "sequence_1": seq1.valeur if seq1 else None,
            "coef_sequence_1": seq1.coefficient if seq1 else None,
            "sequence_2": seq2.valeur if seq2 else None,
            "coef_sequence_2": seq2.coefficient if seq2 else None,
            "note_trimestre": trim.valeur if trim else None,
            "coef_trimestre": trim.coefficient if trim else None,
            "moyenne_matiere": moyenne_matiere,
            "moyenne_calculee": _calc_moyenne_trimestre(seq1, seq2),
        })

    moyenne_generale = round(total_points / total_coef, 2) if total_coef > 0 else 0.0

    return {
        "eleve_id": eleve.id,
        "eleve": f"{eleve.prenom} {eleve.nom}",
        "eleve_nom": eleve.nom,
        "eleve_prenom": eleve.prenom,
        "matricule": eleve.matricule,
        "classe_id": eleve.classe_id,
        "classe": classe.nom if classe else None,
        "classe_niveau": classe.niveau if classe else None,
        "annee_scolaire": annee.annee if annee else None,
        "trimestre": trimestre,
        "moyenne_generale": moyenne_generale,
        "mention": _mention_label(moyenne_generale),
        "details_matieres": details,
        "details_notes": [
            {"matiere": d["matiere"], "note": d["moyenne_matiere"]}
            for d in details if d["moyenne_matiere"] is not None
        ],
    }


def build_classe_bulletins(db: Session, classe_id: int, trimestre: int = 1) -> dict:
    classe = db.query(Classe).filter(Classe.id == classe_id).first()
    if not classe:
        return {"error": "Classe non trouvée"}

    eleves = db.query(Eleve).filter(Eleve.classe_id == classe_id).order_by(Eleve.nom, Eleve.prenom).all()
    bulletins = []
    for eleve in eleves:
        data = build_eleve_bulletin(db, eleve.id, trimestre)
        if "error" not in data:
            bulletins.append(data)

    bulletins.sort(key=lambda b: b["moyenne_generale"], reverse=True)
    for rank, bulletin in enumerate(bulletins, start=1):
        bulletin["rang"] = rank

    return {
        "classe_id": classe_id,
        "classe": classe.nom,
        "classe_niveau": classe.niveau,
        "trimestre": trimestre,
        "effectif": len(bulletins),
        "bulletins": bulletins,
    }
