"""Orchestration : rassemble les données et calcule les bulletins (§11)."""
from typing import Optional

from common.tenant import TenantContext

from app import clients
from app.compute import compute_class_bulletins
from app.labels import LABELS, decision, lang_for_subsystem


def _header(classe: dict, school: dict, lang: str, trimestre: int) -> dict:
    return {
        "school_name": school.get("name"),
        "logo_url": school.get("logo_url"),
        "po_box": school.get("bulletin_po_box"),
        "motto": school.get("bulletin_motto"),
        "classe": classe.get("nom_personnalise"),
        "subsystem_code": classe.get("subsystem_code"),
        "type_code": classe.get("type_code"),
        "level_code": classe.get("level_code"),
        "series_code": classe.get("series_code"),
        "term": f"{LABELS[lang]['term']} {trimestre}",
        "labels": LABELS[lang],
    }


def build_class_bulletins(
    ctx: TenantContext, classe_id: int, trimestre: int, type_evaluation: Optional[str]
) -> dict:
    classe = clients.get_classe(ctx, classe_id)
    school = clients.get_school(ctx)
    lang = lang_for_subsystem(classe.get("subsystem_code"))

    subjects = [
        {
            "matiere_id": m["id"], "nom": m["nom"], "coefficient": m["coefficient"],
            "source": m.get("source", "OFFICIELLE"), "enseignant_id": m.get("enseignant_id"),
        }
        for m in classe.get("matieres", []) if m.get("activated")
    ]
    students = [
        {"eleve_id": s["id"], "matricule": s.get("matricule"),
         "nom": s.get("nom"), "prenom": s.get("prenom")}
        for s in clients.get_students(ctx, classe_id)
    ]
    notes = [
        {"eleve_id": n["eleve_id"], "matiere_id": n["matiere_id"], "valeur": n["valeur"]}
        for n in clients.get_notes(ctx, classe_id, trimestre, type_evaluation)
    ]

    result = compute_class_bulletins(students, subjects, notes, lang)
    result["header"] = _header(classe, school, lang, trimestre)
    for b in result["bulletins"]:
        b["decision"] = decision(b["moyenne_generale"], lang)
    return result


def build_eleve_bulletin(
    ctx: TenantContext, eleve_id: int, trimestre: int, type_evaluation: Optional[str]
) -> dict:
    eleve = clients.get_eleve(ctx, eleve_id)
    classe_id = eleve.get("classe_id")
    if not classe_id:
        return {"error": "Élève non rattaché à une classe"}
    cls = build_class_bulletins(ctx, classe_id, trimestre, type_evaluation)
    bulletin = next((b for b in cls["bulletins"] if b["eleve_id"] == eleve_id), None)
    return {
        "header": cls["header"], "moyenne_classe": cls["moyenne_classe"],
        "effectif": cls["effectif"], "lang": cls["lang"], "bulletin": bulletin,
    }
