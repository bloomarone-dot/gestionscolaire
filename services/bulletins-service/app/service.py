"""Orchestration : rassemble les données et calcule les bulletins (§11)."""
from typing import Optional

from common.tenant import TenantContext

from datetime import date

from common.establishment import is_language_center

from app import clients
from app.compute import compute_class_bulletins
from app.labels import (
    decision,
    labels_pack,
    lang_for_class,
    period_label,
    report_title,
    seq_columns,
)

try:
    from common.bulletin_theme import parse_theme
    from common.subsystem import resolve_subsystem_code
except ImportError:
    def parse_theme(raw, lang=None):  # type: ignore
        return raw or {}

    def resolve_subsystem_code(classe):  # type: ignore
        return classe.get("subsystem_code") if classe else None


def _default_school_year() -> str:
    today = date.today()
    start = today.year if today.month >= 9 else today.year - 1
    return f"{start}/{start + 1}"


def _header(classe: dict, school: dict, lang: str, trimestre: int, scope: str) -> dict:
    name = school.get("name") or ""
    kind = school.get("establishment_kind") or "SCHOOL"
    simplified = is_language_center(kind)
    return {
        "school_name": name,
        "school_name_fr": school.get("name_fr") or name,
        "logo_url": school.get("logo_url"),
        "po_box": school.get("bulletin_po_box"),
        "motto": school.get("bulletin_motto") or (
            "" if simplified else "A Chosen Generation : Believe-Achieve-Succeed"
        ),
        "delegation_regional": "" if simplified else (
            school.get("bulletin_delegation_regional") or "REGIONAL DELEGATION FOR CENTER"
        ),
        "delegation_departementale": "" if simplified else (
            school.get("bulletin_delegation_departementale")
            or "DIVISIONAL DELEGATION FOR MEFOU AND AFAMBA"
        ),
        "delegation_regional_fr": "" if simplified else (
            school.get("bulletin_delegation_regional_fr") or "DELEGATION REGIONALE DU CENTRE"
        ),
        "delegation_departementale_fr": "" if simplified else (
            school.get("bulletin_delegation_departementale_fr")
            or "DELEGATION DEPARTEMENTALE DE LA MEFOU ET AFAMBA"
        ),
        "next_term": school.get("bulletin_next_term_note"),
        "bulletin_theme": parse_theme(school.get("bulletin_theme"), lang=lang),
        "school_year": school.get("school_year") or _default_school_year(),
        "classe": classe.get("nom_personnalise"),
        "subsystem_code": classe.get("subsystem_code") or resolve_subsystem_code(classe),
        "type_code": classe.get("type_code"),
        "level_code": classe.get("level_code"),
        "series_code": classe.get("series_code"),
        "trimestre": trimestre,
        "scope": scope,
        "establishment_kind": kind,
        "simplified_bulletin": simplified,
        "term": period_label(scope, trimestre, lang, kind),
        "report_title": report_title(scope, lang, kind),
        "seq_labels": seq_columns(scope, trimestre, lang, kind),
        "labels": labels_pack(lang, kind),
    }


def build_class_bulletins(
    ctx: TenantContext, classe_id: int, trimestre: int,
    type_evaluation: Optional[str], scope: str = "trimestre",
) -> dict:
    classe = clients.get_classe(ctx, classe_id)
    school = clients.get_school(ctx)
    teacher_names = clients.get_teacher_names(ctx)
    lang = lang_for_class(classe)

    subjects = [
        {
            "matiere_id": m["id"], "nom": m["nom"], "coefficient": m["coefficient"],
            "source": m.get("source", "OFFICIELLE"), "enseignant_id": m.get("enseignant_id"),
            "enseignant_nom": teacher_names.get(m.get("enseignant_id")),
            "groupe": m.get("groupe"),
        }
        for m in classe.get("matieres", []) if m.get("activated")
    ]
    students = [
        {"eleve_id": s["id"], "matricule": s.get("matricule"),
         "nom": s.get("nom"), "prenom": s.get("prenom"),
         "sexe": s.get("sexe"), "redoublant": s.get("redoublant")}
        for s in clients.get_students(ctx, classe_id)
    ]
    # En annuel : toutes les séquences (toutes périodes) ; sinon les notes du trimestre.
    notes_trimestre = None if scope == "annual" else trimestre
    notes = [
        {"eleve_id": n["eleve_id"], "matiere_id": n["matiere_id"],
         "valeur": n["valeur"], "type_evaluation": n.get("type_evaluation")}
        for n in clients.get_notes(ctx, classe_id, notes_trimestre, type_evaluation)
    ]

    result = compute_class_bulletins(
        students, subjects, notes, lang, trimestre, scope,
        appreciation_scales=school.get("bulletin_appreciation_scales"),
        establishment_kind=school.get("establishment_kind") or "SCHOOL",
    )
    result["header"] = _header(classe, school, lang, trimestre, scope)
    result["header"]["effectif"] = result["effectif"]
    result["header"]["prof_principal"] = teacher_names.get(classe.get("prof_principal_id"))
    for b in result["bulletins"]:
        b["decision"] = decision(b["moyenne_generale"], lang) if scope == "annual" else ""
    return result


def build_eleve_bulletin(
    ctx: TenantContext, eleve_id: int, trimestre: int,
    type_evaluation: Optional[str], scope: str = "trimestre",
) -> dict:
    eleve = clients.get_eleve(ctx, eleve_id)
    classe_id = eleve.get("classe_id")
    if not classe_id:
        return {"error": "Élève non rattaché à une classe"}
    cls = build_class_bulletins(ctx, classe_id, trimestre, type_evaluation, scope)
    bulletin = next((b for b in cls["bulletins"] if b["eleve_id"] == eleve_id), None)
    return {
        "header": cls["header"], "moyenne_classe": cls["moyenne_classe"],
        "effectif": cls["effectif"], "lang": cls["lang"], "bulletin": bulletin,
    }
