"""Construction IR du composant grades_table (colonnes + groupes configurables).

Ne touche PAS à compute.py / regex legacy. ``legacy_infer`` regroupe tout
en un seul bloc « Matières » (placeholder de compatibilité) — l'inférence
regex restera branchée plus tard si besoin, sans être dupliquée ici.
"""
from __future__ import annotations

from typing import Any, Optional

from app.engine.resolver import resolve_path
from app.engine.template_schema import BulletinTemplateV1, DataBindingSpec, SubjectGroupOverride


def _subject_row_scope(subject: dict[str, Any]) -> dict[str, Any]:
    """Scope ligne : subject.* et grades.* (dict sérialisable uniquement)."""
    grades = subject.get("grades")
    if not isinstance(grades, dict):
        grades = {}
    # Copie contrôlée — pas l'objet subject brut s'il a des clés interdites
    safe_subject = {
        k: v
        for k, v in subject.items()
        if isinstance(k, str) and not k.startswith("__") and k != "grades"
        and isinstance(v, (str, int, float, bool, type(None)))
    }
    # Champs structurés utiles
    for key in ("id", "name", "nom", "coefficient", "groupe", "average", "moyenne",
                "points", "rank", "rang", "appreciation", "teacher", "enseignant"):
        if key in subject and key not in safe_subject:
            val = subject[key]
            if isinstance(val, (str, int, float, bool, type(None))):
                safe_subject[key] = val
    # Alias FR/EN normalisés pour binds du template démo
    if "name" not in safe_subject and "nom" in safe_subject:
        safe_subject["name"] = safe_subject["nom"]
    if "average" not in safe_subject and "moyenne" in safe_subject:
        safe_subject["average"] = safe_subject["moyenne"]
    if "rank" not in safe_subject and "rang" in safe_subject:
        safe_subject["rank"] = safe_subject["rang"]
    if "teacher" not in safe_subject and "enseignant" in safe_subject:
        safe_subject["teacher"] = safe_subject["enseignant"]
    if "appreciation" not in safe_subject and "appreciation" in subject:
        safe_subject["appreciation"] = subject.get("appreciation")
    return {"subject": safe_subject, "grades": dict(grades)}


def _match_group(subject: dict[str, Any], group: SubjectGroupOverride) -> bool:
    sid = subject.get("id")
    if group.subject_ids and sid in group.subject_ids:
        return True
    gnum = subject.get("groupe")
    if group.groupe_numbers and gnum in group.groupe_numbers:
        return True
    nom = str(subject.get("name") or subject.get("nom") or "")
    for fragment in group.subject_name_contains:
        if fragment and fragment.lower() in nom.lower():
            return True
    return False


def _partition_subjects(
    subjects: list[dict[str, Any]],
    binding: DataBindingSpec,
) -> list[dict[str, Any]]:
    """Retourne une liste de sections {id, label, show_subtotal, subjects}."""
    mode = binding.groups_mode
    subjects = [s for s in subjects if isinstance(s, dict)]

    if mode == "from_template":
        used: set[int] = set()
        sections: list[dict[str, Any]] = []
        for group in sorted(binding.groups, key=lambda g: g.order):
            matched = []
            for idx, subj in enumerate(subjects):
                if idx in used:
                    continue
                if _match_group(subj, group):
                    matched.append(subj)
                    used.add(idx)
            sections.append({
                "id": group.id,
                "label": group.label,
                "show_subtotal": group.show_subtotal,
                "subjects": matched,
            })
        if binding.include_ungrouped:
            rest = [subjects[i] for i in range(len(subjects)) if i not in used]
            if rest:
                sections.append({
                    "id": "_ungrouped",
                    "label": "Autres matières",
                    "show_subtotal": False,
                    "subjects": rest,
                })
        return sections

    if mode == "legacy_infer":
        # Compatibilité : un seul groupe — pas d'inférence regex ici (compute.py inchangé).
        return [{
            "id": "_all",
            "label": "Matières",
            "show_subtotal": False,
            "subjects": subjects,
        }]

    # from_classe_matiere (recommandé)
    by_group: dict[Optional[int], list[dict[str, Any]]] = {}
    for subj in subjects:
        g = subj.get("groupe")
        if isinstance(g, int):
            key: Optional[int] = g
        elif isinstance(g, str) and g.isdigit():
            key = int(g)
        else:
            key = None
        by_group.setdefault(key, []).append(subj)

    # Labels : overrides template si fournis pour ces numéros, sinon génériques
    label_by_num: dict[int, tuple[str, bool]] = {}
    for group in binding.groups:
        for n in group.groupe_numbers:
            label_by_num[n] = (group.label, group.show_subtotal)

    sections = []
    ordered_keys = sorted([k for k in by_group if k is not None])
    for gnum in ordered_keys:
        label, show_sub = label_by_num.get(gnum, (f"Groupe {gnum}", True))
        sections.append({
            "id": f"groupe_{gnum}",
            "label": label,
            "show_subtotal": show_sub,
            "subjects": by_group[gnum],
        })
    if binding.include_ungrouped and by_group.get(None):
        sections.append({
            "id": "_ungrouped",
            "label": "Autres matières",
            "show_subtotal": False,
            "subjects": by_group[None],
        })
    if not sections and subjects:
        sections.append({
            "id": "_all",
            "label": "Matières",
            "show_subtotal": False,
            "subjects": subjects,
        })
    return sections


def _format_cell(value: Any, numeric_format: Optional[str]) -> str:
    if value is None:
        return ""
    if numeric_format and isinstance(value, (int, float)):
        # Formats simples 0.00 / 0.## — pas d'expression
        if "0.00" in numeric_format or "0.##" in numeric_format:
            return f"{float(value):.2f}"
        if numeric_format.strip() in ("0", "#"):
            return str(int(round(float(value))))
    if isinstance(value, float):
        return f"{value:.2f}"
    return str(value)


def _cell_value(bind: str, row_scope: dict[str, Any], root: dict[str, Any]) -> Any:
    # Fusion root + scope ligne (subject/grades écrasent)
    merged = {**root, **row_scope}
    return resolve_path(merged, bind, missing=None)


def _subtotal_average(subjects: list[dict[str, Any]]) -> Optional[float]:
    vals = []
    for s in subjects:
        v = s.get("average", s.get("moyenne"))
        if isinstance(v, (int, float)):
            vals.append(float(v))
    if not vals:
        return None
    return sum(vals) / len(vals)


def build_grades_table_content(
    props: dict[str, Any],
    template: BulletinTemplateV1,
    root: dict[str, Any],
) -> dict[str, Any]:
    """Produit le contenu IR d'un grades_table."""
    subjects = root.get("subjects") or []
    if not isinstance(subjects, list):
        subjects = []

    columns_cfg = [c for c in (props.get("columns") or []) if c.get("visible", True)]
    sections_src = _partition_subjects(subjects, template.data_binding)

    header = {
        "columns": [
            {
                "id": c["id"],
                "label": c.get("label") or c["id"],
                "width": c.get("width", 0.1),
                "align": c.get("align", "left"),
            }
            for c in columns_cfg
        ],
        "repeat_on_page_break": bool(props.get("repeat_header_on_page_break", True)),
    }

    sections_out: list[dict[str, Any]] = []
    for section in sections_src:
        rows = []
        for subj in section["subjects"]:
            row_scope = _subject_row_scope(subj)
            cells = []
            for col in columns_cfg:
                raw = _cell_value(col["bind"], row_scope, root)
                cells.append({
                    "column_id": col["id"],
                    "value": raw,
                    "display": _format_cell(raw, col.get("numeric_format")),
                    "align": col.get("align", "left"),
                })
            rows.append({"subject_id": subj.get("id"), "cells": cells})

        subtotal = None
        if section.get("show_subtotal") and props.get("show_group_subtotals", True) and rows:
            avg = _subtotal_average(section["subjects"])
            subtotal = {
                "label": f"Sous-total {section['label']}",
                "average": avg,
                "display_average": _format_cell(avg, "0.00") if avg is not None else "",
            }

        sections_out.append({
            "id": section["id"],
            "label": section["label"],
            "show_header": bool(props.get("show_group_headers", True)),
            "rows": rows,
            "subtotal": subtotal,
        })

    return {
        "kind": "grades_table",
        "empty": len(subjects) == 0,
        "groups_mode": template.data_binding.groups_mode,
        "show_header": bool(props.get("show_header", True)),
        "header": header,
        "sections": sections_out,
        "style": {
            "border_color": props.get("border_color"),
            "header_background": props.get("header_background"),
            "font_size_pt": props.get("font_size_pt"),
            "row_height_mm": props.get("row_height_mm"),
        },
        "message": "Aucune matière / note disponible pour ce bulletin." if not subjects else None,
    }
