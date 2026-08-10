"""Starter templates neutres — points de départ pour nouveaux BulletinModele.

Ces définitions sont système (pas de tenant). Aucune donnée d'école réelle.
Copie profonde à la création d'un modèle établissement.
"""
from __future__ import annotations

import copy
from typing import Any, Literal, Optional

from app.engine.template_schema import validate_template_definition

LanguageMode = Literal["fr", "en", "bilingual"]
KIND_SECONDARY = "secondary"
KIND_PRIMARY = "primary"
KIND_BLANK = "blank"
KIND_VOCATIONAL = "vocational"  # catalogue : non disponible pour l'instant

_LABELS: dict[str, dict[str, str]] = {
    "fr": {
        "bulletin_title": "BULLETIN",
        "report_card": "BULLETIN SCOLAIRE",
        "primary_subtitle": "Bulletin scolaire — Enseignement de base",
        "subjects": "Matières",
        "seq1": "Séq. 1",
        "seq2": "Séq. 2",
        "average": "Moy.",
        "coef": "Coef.",
        "points": "Notes",
        "rank": "Rang",
        "appreciation": "Appréciation",
        "teacher": "Professeur",
        "group1": "PREMIER GROUPE",
        "group2": "DEUXIÈME GROUPE",
        "group3": "TROISIÈME GROUPE",
        "parent": "Parents / Tuteurs",
        "class_teacher": "Professeur principal",
        "principal": "Le Chef d'établissement",
        "date": "Date",
        "competences_title": "Observations et appréciations",
        "competences_body": (
            "Observations : {{summary.observation}}\n"
            "Période : {{term.label}} — Année : {{academic_year.name}}\n"
            "(Grille compétences / niveaux d'acquisition : à brancher ultérieurement — "
            "composant natif non disponible dans le registry actuel.)"
        ),
    },
    "en": {
        "bulletin_title": "REPORT CARD",
        "report_card": "SCHOOL REPORT",
        "primary_subtitle": "School report — Basic education",
        "subjects": "Subjects",
        "seq1": "Seq. 1",
        "seq2": "Seq. 2",
        "average": "Avg.",
        "coef": "Coef.",
        "points": "Marks",
        "rank": "Rank",
        "appreciation": "Remark",
        "teacher": "Teacher",
        "group1": "FIRST GROUP",
        "group2": "SECOND GROUP",
        "group3": "THIRD GROUP",
        "parent": "Parents / Guardians",
        "class_teacher": "Class teacher",
        "principal": "Head teacher",
        "date": "Date",
        "competences_title": "Observations and remarks",
        "competences_body": (
            "Observations: {{summary.observation}}\n"
            "Period: {{term.label}} — Year: {{academic_year.name}}\n"
            "(Competency grid / acquisition levels: not yet available in the component registry.)"
        ),
    },
    "bilingual": {
        "bulletin_title": "BULLETIN / REPORT CARD",
        "report_card": "BULLETIN SCOLAIRE / SCHOOL REPORT",
        "primary_subtitle": "Bulletin scolaire — Enseignement de base / Basic education",
        "subjects": "Matières / Subjects",
        "seq1": "Séq. 1 / Seq. 1",
        "seq2": "Séq. 2 / Seq. 2",
        "average": "Moy. / Avg.",
        "coef": "Coef.",
        "points": "Notes / Marks",
        "rank": "Rang / Rank",
        "appreciation": "Appréciation / Remark",
        "teacher": "Prof. / Teacher",
        "group1": "PREMIER GROUPE / FIRST GROUP",
        "group2": "DEUXIÈME GROUPE / SECOND GROUP",
        "group3": "TROISIÈME GROUPE / THIRD GROUP",
        "parent": "Parents / Guardians",
        "class_teacher": "Prof. principal / Class teacher",
        "principal": "Chef d'établissement / Head teacher",
        "date": "Date",
        "competences_title": "Observations / Remarks",
        "competences_body": (
            "Observations : {{summary.observation}}\n"
            "Période / Period : {{term.label}} — Année / Year : {{academic_year.name}}\n"
            "(Compétences / acquisition levels: registry component not yet available.)"
        ),
    },
}


def _L(mode: str) -> dict[str, str]:
    return _LABELS.get(mode) or _LABELS["fr"]


def _neutral_meta(*, starter_id: str, kind: str, language_mode: str) -> dict[str, Any]:
    return {
        "starter_id": starter_id,
        "kind": kind,
        "language_mode": language_mode,
        "theme_primary": "#000000",
        "theme_secondary": "#333333",
        "theme_table_header": "#F5F5F5",
        "theme_border": "#000000",
        "theme_group": "#FAFAFA",
        "theme_title": "#000000",
        "theme_summary": "#F5F5F5",
        "limitations": (
            "no_competences_grid;no_acquisition_levels;uses_existing_registry_only"
            if kind == KIND_PRIMARY
            else "neutral_starter"
        ),
    }


def build_blank_starter(language_mode: LanguageMode = "fr", name: str = "Modèle vierge") -> dict[str, Any]:
    L = _L(language_mode)
    return validate_template_definition({
        "schema_version": 1,
        "name": name,
        "page": {
            "size": "A4",
            "orientation": "portrait",
            "margins": {"top": 10, "right": 10, "bottom": 12, "left": 10},
        },
        "data_binding": {
            "period_mode": "trimestre",
            "sequence_columns": [
                {"key": "sequence_5", "label": L["seq1"], "source_type_evaluation": "sequence_5"},
                {"key": "sequence_6", "label": L["seq2"], "source_type_evaluation": "sequence_6"},
            ],
            "groups_mode": "from_classe_matiere",
            "groups": [],
            "include_ungrouped": True,
            "complementary_section": False,
        },
        "components": [],
        "meta": _neutral_meta(starter_id="blank_v1", kind=KIND_BLANK, language_mode=language_mode),
    }).model_dump(mode="json")


# Champs demandés produit mais absents / incomplets du DataContext actuel
# (ne pas inventer de valeurs métier — documenter seulement).
MISSING_CONTEXT_FIELDS: tuple[str, ...] = (
    "school.email",  # pas dans ALLOWED_VARIABLE_PATHS / context_builder
    "school.ministry",  # ministère via layout legacy, pas variable V2
    "series as student_block field",  # utiliser {{class.series_code}} en texte
    "competences_grid",  # pas de composant registry
    "acquisition_levels",  # pas de composant registry
)


def _text_style(*, size: float = 8, bold: bool = False, align: str = "left", italic: bool = False) -> dict:
    return {
        "font_family": "Helvetica",
        "font_size_pt": size,
        "bold": bold,
        "italic": italic,
        "color": "#000000",
        "align": align,
    }


def _bilingual_header_components(language_mode: LanguageMode, *, width_mm: float = 190) -> list[dict[str, Any]]:
    """En-tête neutre : infos GAUCHE | logo CENTRE | infos DROITE (composants existants).

    Les libellés institutionnels sont des placeholders éditables (pas d'école réelle).
    Logo centré via ``school_logo`` ({{school.logo}} au rendu).
    """
    show_fr = language_mode in ("fr", "bilingual")
    show_en = language_mode in ("en", "bilingual")
    mid = width_mm / 2
    logo_w = 28.0
    side_w = (width_mm - logo_w - 4) / 2
    comps: list[dict[str, Any]] = []

    if show_fr:
        fr_lines = [
            ("header_fr_republic", "RÉPUBLIQUE DU CAMEROUN", 0, True),
            ("header_fr_motto", "Paix — Travail — Patrie", 5, False),
            ("header_fr_ministry", "MINISTÈRE DE L'ÉDUCATION (à configurer)", 10, False),
            ("header_fr_deleg_r", "{{school.delegation_regional}}", 15, False),
            ("header_fr_deleg_d", "{{school.delegation_departementale}}", 20, False),
            ("header_fr_contact", "{{school.address}}  {{school.phone}}", 25, False),
        ]
        for cid, content, y, bold in fr_lines:
            comps.append({
                "id": cid,
                "type": "text",
                "frame": {"x_mm": 0, "y_mm": y, "width_mm": side_w, "height_mm": 5},
                "z_index": 1,
                "visible": True,
                "props": {"content": content, "style": _text_style(size=7, bold=bold, align="center")},
            })

    comps.append({
        "id": "header_logo",
        "type": "school_logo",
        "frame": {"x_mm": mid - logo_w / 2, "y_mm": 2, "width_mm": logo_w, "height_mm": 28},
        "z_index": 2,
        "visible": True,
        "props": {"fit": "contain"},
    })

    if show_en:
        en_x = width_mm - side_w
        en_lines = [
            ("header_en_republic", "REPUBLIC OF CAMEROON", 0, True),
            ("header_en_motto", "Peace — Work — Fatherland", 5, False),
            ("header_en_ministry", "MINISTRY OF EDUCATION (configure)", 10, False),
            ("header_en_deleg_r", "{{school.delegation_regional}}", 15, False),
            ("header_en_deleg_d", "{{school.delegation_departementale}}", 20, False),
            ("header_en_contact", "{{school.city}}  {{school.motto}}", 25, False),
        ]
        for cid, content, y, bold in en_lines:
            comps.append({
                "id": cid,
                "type": "text",
                "frame": {"x_mm": en_x, "y_mm": y, "width_mm": side_w, "height_mm": 5},
                "z_index": 1,
                "visible": True,
                "props": {"content": content, "style": _text_style(size=7, bold=bold, align="center")},
            })

    comps.append({
        "id": "header_school",
        "type": "institution_header",
        "frame": {"x_mm": 0, "y_mm": 30, "width_mm": width_mm, "height_mm": 12},
        "z_index": 3,
        "visible": True,
        "props": {
            "show_ministry": False,
            "show_logo": False,
            "show_motto": True,
            "show_delegations": False,
            "title": "{{school.name}}",
            "subtitle": "{{school.motto}}",
        },
    })
    return comps


def build_secondary_starter(language_mode: LanguageMode = "bilingual") -> dict[str, Any]:
    """Bulletin secondaire camerounais — neutre, A4 portrait, groupes from_classe_matiere."""
    L = _L(language_mode)
    theme_header = "#F5F5F5"
    border = "#000000"
    header = _bilingual_header_components(language_mode, width_mm=190)
    definition = {
        "schema_version": 1,
        "name": "Bulletin secondaire camerounais (standard)",
        "page": {
            "size": "A4",
            "orientation": "portrait",
            "margins": {"top": 10, "right": 10, "bottom": 12, "left": 10},
        },
        "data_binding": {
            "period_mode": "trimestre",
            "sequence_columns": [
                {"key": "sequence_5", "label": L["seq1"], "source_type_evaluation": "sequence_5"},
                {"key": "sequence_6", "label": L["seq2"], "source_type_evaluation": "sequence_6"},
            ],
            "groups_mode": "from_classe_matiere",
            "groups": [
                {"id": "g1", "label": L["group1"], "order": 1, "groupe_numbers": [1],
                 "subject_ids": [], "subject_name_contains": [], "show_subtotal": True},
                {"id": "g2", "label": L["group2"], "order": 2, "groupe_numbers": [2],
                 "subject_ids": [], "subject_name_contains": [], "show_subtotal": True},
                {"id": "g3", "label": L["group3"], "order": 3, "groupe_numbers": [3],
                 "subject_ids": [], "subject_name_contains": [], "show_subtotal": True},
            ],
            "include_ungrouped": True,
            "complementary_section": True,
        },
        "components": [
            *header,
            {
                "id": "title_bar",
                "type": "text",
                "frame": {"x_mm": 0, "y_mm": 44, "width_mm": 190, "height_mm": 8},
                "z_index": 2,
                "visible": True,
                "props": {
                    "content": L["bulletin_title"] + " — {{term.label}} — {{academic_year.name}}",
                    "style": _text_style(size=11, bold=True, align="center"),
                },
            },
            {
                "id": "student",
                "type": "student_block",
                "frame": {"x_mm": 0, "y_mm": 53, "width_mm": 190, "height_mm": 22},
                "z_index": 3,
                "visible": True,
                "props": {
                    "fields": [
                        "last_name", "first_name", "matricule", "class", "gender",
                        "repeat_status",
                    ],
                    "show_labels": True,
                    "columns": 3,
                },
            },
            {
                "id": "student_meta",
                "type": "text",
                "frame": {"x_mm": 0, "y_mm": 75, "width_mm": 190, "height_mm": 8},
                "z_index": 3,
                "visible": True,
                "props": {
                    "content": (
                        "{{class.name}} · {{class.series_code}} · "
                        "{{class.size}} · {{term.label}} · {{academic_year.name}}"
                    ),
                    "style": _text_style(size=8),
                },
            },
            {
                "id": "grades",
                "type": "grades_table",
                "frame": {"x_mm": 0, "y_mm": 85, "width_mm": 190, "height_mm": 110},
                "z_index": 4,
                "visible": True,
                "props": {
                    "columns": [
                        {"id": "subject", "label": L["subjects"], "bind": "subject.name",
                         "width": 0.20, "align": "left", "visible": True},
                        {"id": "s5", "label": L["seq1"], "bind": "grades.sequence_5",
                         "width": 0.08, "align": "center", "visible": True, "numeric_format": "0.00"},
                        {"id": "s6", "label": L["seq2"], "bind": "grades.sequence_6",
                         "width": 0.08, "align": "center", "visible": True, "numeric_format": "0.00"},
                        {"id": "avg", "label": L["average"], "bind": "subject.average",
                         "width": 0.08, "align": "center", "visible": True, "numeric_format": "0.00"},
                        {"id": "coef", "label": L["coef"], "bind": "subject.coefficient",
                         "width": 0.07, "align": "center", "visible": True},
                        {"id": "pts", "label": L["points"], "bind": "subject.points",
                         "width": 0.08, "align": "center", "visible": True, "numeric_format": "0.00"},
                        {"id": "rank", "label": L["rank"], "bind": "subject.rank",
                         "width": 0.07, "align": "center", "visible": True},
                        {"id": "appr", "label": L["appreciation"], "bind": "subject.appreciation",
                         "width": 0.18, "align": "left", "visible": True},
                        {"id": "teacher", "label": L["teacher"], "bind": "subject.teacher",
                         "width": 0.16, "align": "left", "visible": True},
                    ],
                    "show_group_headers": True,
                    "show_group_subtotals": True,
                    "show_header": True,
                    "repeat_header_on_page_break": True,
                    "border_color": border,
                    "header_background": theme_header,
                    "font_size_pt": 8.0,
                    "row_height_mm": 6.0,
                },
            },
            {
                "id": "summary",
                "type": "summary_block",
                "frame": {"x_mm": 0, "y_mm": 198, "width_mm": 190, "height_mm": 26},
                "z_index": 5,
                "visible": True,
                "props": {
                    "fields": [
                        "total_points", "total_coefficients", "general_average",
                        "class_average", "rank", "class_size", "decision", "observation",
                    ],
                    "show_labels": True,
                },
            },
            {
                "id": "attendance",
                "type": "attendance_block",
                "frame": {"x_mm": 0, "y_mm": 226, "width_mm": 190, "height_mm": 12},
                "z_index": 5,
                "visible": True,
                "props": {
                    "show_absences": True,
                    "show_sanctions": True,
                    "stub_label_absences": "—",
                    "stub_label_sanctions": "—",
                    "note": "Assiduité / sanctions : données branchées si disponibles.",
                },
            },
            {
                "id": "signatures",
                "type": "signatures_row",
                "frame": {"x_mm": 0, "y_mm": 242, "width_mm": 190, "height_mm": 28},
                "z_index": 6,
                "visible": True,
                "props": {
                    "slots": [
                        {"slot": "parent", "label": L["parent"]},
                        {"slot": "teacher", "label": L["class_teacher"]},
                        {"slot": "principal", "label": L["principal"]},
                        {"slot": "custom", "label": L["date"]},
                    ],
                },
            },
        ],
        "meta": _neutral_meta(
            starter_id="cameroon_secondary_standard",
            kind=KIND_SECONDARY,
            language_mode=language_mode,
        ),
    }
    return validate_template_definition(definition).model_dump(mode="json")


def build_primary_starter(language_mode: LanguageMode = "fr") -> dict[str, Any]:
    """Bulletin primaire camerounais — neutre ; pas de competences_grid native."""
    L = _L(language_mode)
    header = _bilingual_header_components(language_mode, width_mm=186)
    definition = {
        "schema_version": 1,
        "name": "Bulletin primaire camerounais (standard)",
        "page": {
            "size": "A4",
            "orientation": "portrait",
            "margins": {"top": 12, "right": 12, "bottom": 12, "left": 12},
        },
        "data_binding": {
            "period_mode": "trimestre",
            "sequence_columns": [],
            "groups_mode": "from_classe_matiere",
            "groups": [],
            "include_ungrouped": True,
            "complementary_section": False,
        },
        "components": [
            *header,
            {
                "id": "title_bar",
                "type": "text",
                "frame": {"x_mm": 0, "y_mm": 44, "width_mm": 186, "height_mm": 8},
                "z_index": 2,
                "visible": True,
                "props": {
                    "content": L["report_card"] + " — {{term.label}} — {{academic_year.name}}",
                    "style": _text_style(size=11, bold=True, align="center"),
                },
            },
            {
                "id": "student",
                "type": "student_block",
                "frame": {"x_mm": 0, "y_mm": 54, "width_mm": 186, "height_mm": 24},
                "z_index": 3,
                "visible": True,
                "props": {
                    "fields": ["last_name", "first_name", "matricule", "class", "gender", "date_of_birth", "repeat_status"],
                    "show_labels": True,
                    "columns": 2,
                },
            },
            {
                "id": "competences_title",
                "type": "text",
                "frame": {"x_mm": 0, "y_mm": 82, "width_mm": 186, "height_mm": 8},
                "z_index": 4,
                "visible": True,
                "props": {
                    "content": L["competences_title"],
                    "style": _text_style(size=11, bold=True),
                },
            },
            {
                "id": "competences_note",
                "type": "text",
                "frame": {"x_mm": 0, "y_mm": 92, "width_mm": 186, "height_mm": 42},
                "z_index": 4,
                "visible": True,
                "props": {
                    "content": L["competences_body"],
                    "style": _text_style(size=9),
                },
            },
            {
                "id": "behavior_title",
                "type": "text",
                "frame": {"x_mm": 0, "y_mm": 138, "width_mm": 186, "height_mm": 8},
                "z_index": 4,
                "visible": True,
                "props": {
                    "content": "Comportement / Behaviour — (zone configurable)",
                    "style": _text_style(size=10, bold=True),
                },
            },
            {
                "id": "summary",
                "type": "summary_block",
                "frame": {"x_mm": 0, "y_mm": 150, "width_mm": 186, "height_mm": 28},
                "z_index": 5,
                "visible": True,
                "props": {
                    "fields": ["general_average", "class_average", "rank", "class_size", "decision", "observation"],
                    "show_labels": True,
                },
            },
            {
                "id": "signatures",
                "type": "signatures_row",
                "frame": {"x_mm": 0, "y_mm": 186, "width_mm": 186, "height_mm": 28},
                "z_index": 6,
                "visible": True,
                "props": {
                    "slots": [
                        {"slot": "parent", "label": L["parent"]},
                        {"slot": "teacher", "label": L["class_teacher"]},
                        {"slot": "principal", "label": L["principal"]},
                        {"slot": "custom", "label": L["date"]},
                    ],
                },
            },
        ],
        "meta": _neutral_meta(
            starter_id="cameroon_primary_standard",
            kind=KIND_PRIMARY,
            language_mode=language_mode,
        ),
    }
    return validate_template_definition(definition).model_dump(mode="json")


# Alias stables (langue par défaut) pour imports / tests
CAMEROON_SECONDARY_STANDARD_V1 = build_secondary_starter("bilingual")
CAMEROON_PRIMARY_STANDARD_V1 = build_primary_starter("fr")
BLANK_V1 = build_blank_starter("fr")


STARTER_CATALOG: list[dict[str, Any]] = [
    {
        "id": "cameroon_secondary_standard",
        "name": "Bulletin secondaire camerounais",
        "description": "Structure officielle neutre : en-tête, élève, notes par groupes, résumé, signatures.",
        "kind": KIND_SECONDARY,
        "language_modes": ["fr", "en", "bilingual"],
        "available": True,
        "default_language": "bilingual",
    },
    {
        "id": "cameroon_primary_standard",
        "name": "Bulletin primaire camerounais",
        "description": (
            "Modèle primaire neutre. Compétences / niveaux d'acquisition : "
            "pas encore de composant registry (limitation documentée)."
        ),
        "kind": KIND_PRIMARY,
        "language_modes": ["fr", "en", "bilingual"],
        "available": True,
        "default_language": "fr",
    },
    {
        "id": "blank_v1",
        "name": "Modèle vierge",
        "description": "Page A4 vide pour composer librement.",
        "kind": KIND_BLANK,
        "language_modes": ["fr", "en", "bilingual"],
        "available": True,
        "default_language": "fr",
    },
    {
        "id": "vocational_placeholder",
        "name": "Formation professionnelle",
        "description": "Bientôt disponible.",
        "kind": KIND_VOCATIONAL,
        "language_modes": ["fr", "en", "bilingual"],
        "available": False,
        "default_language": "fr",
    },
]


def get_starter_definition(starter_id: str, language_mode: str = "fr") -> dict[str, Any]:
    """Retourne une deep copy validée du starter (jamais la référence partagée)."""
    mode: LanguageMode
    if language_mode not in ("fr", "en", "bilingual"):
        mode = "fr"
    else:
        mode = language_mode  # type: ignore[assignment]

    if starter_id in ("cameroon_secondary_standard", "cameroon_secondary"):
        return copy.deepcopy(build_secondary_starter(mode))
    if starter_id in ("cameroon_primary_standard", "cameroon_primary"):
        return copy.deepcopy(build_primary_starter(mode))
    if starter_id in ("blank_v1", "blank"):
        return copy.deepcopy(build_blank_starter(mode))
    raise KeyError(f"Starter inconnu : {starter_id}")


def list_starters_for_catalog(*, include_definitions: bool = False) -> list[dict[str, Any]]:
    """Métadonnées catalogue (+ définitions optionnelles pour chaque langue)."""
    out: list[dict[str, Any]] = []
    for entry in STARTER_CATALOG:
        item = dict(entry)
        if include_definitions and entry.get("available"):
            defs = {}
            for lang in entry.get("language_modes") or ["fr"]:
                try:
                    defs[lang] = get_starter_definition(entry["id"], lang)
                except KeyError:
                    continue
            item["definitions"] = defs
        out.append(item)
    return out


def assert_starter_has_no_real_school_data(definition: dict[str, Any]) -> None:
    """Garde-fou tests : pas de numéros / noms d'école réels connus."""
    blob = str(definition).lower()
    forbidden = (
        "royal priesthood", "672314497", "yaoundé - mefou", "admin-p",
        "change me", "bloomarone school real",
    )
    for token in forbidden:
        if token in blob:
            raise AssertionError(f"Donnée réelle suspecte dans starter : {token}")
