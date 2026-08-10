"""Exemple de définition proche d'un bulletin secondaire camerounais (démo).

Ce n'est PAS un format codé en dur dans le moteur — uniquement une fixture de test /
template système futur.
"""

CAMEROON_SECONDARY_DEMO_V1 = {
    "schema_version": 1,
    "name": "Bulletin secondaire camerounais (démo)",
    "page": {
        "size": "A4",
        "orientation": "portrait",
        "margins": {"top": 10, "right": 10, "bottom": 12, "left": 10},
    },
    "data_binding": {
        "period_mode": "trimestre",
        "sequence_columns": [
            {"key": "sequence_5", "label": "5e séq.", "source_type_evaluation": "sequence_5"},
            {"key": "sequence_6", "label": "6e séq.", "source_type_evaluation": "sequence_6"},
        ],
        "groups_mode": "from_classe_matiere",
        "groups": [
            {
                "id": "g1",
                "label": "PREMIER GROUPE",
                "order": 1,
                "groupe_numbers": [1],
                "show_subtotal": True,
            },
            {
                "id": "g2",
                "label": "DEUXIÈME GROUPE",
                "order": 2,
                "groupe_numbers": [2],
                "show_subtotal": True,
            },
            {
                "id": "g3",
                "label": "TROISIÈME GROUPE",
                "order": 3,
                "groupe_numbers": [3],
                "show_subtotal": True,
            },
        ],
        "include_ungrouped": True,
        "complementary_section": True,
    },
    "components": [
        {
            "id": "header",
            "type": "institution_header",
            "frame": {"x_mm": 0, "y_mm": 0, "width_mm": 190, "height_mm": 32},
            "z_index": 1,
            "visible": True,
            "props": {
                "show_ministry": True,
                "show_logo": True,
                "show_motto": True,
                "show_delegations": True,
                "title": "{{school.name}}",
                "subtitle": "BULLETIN",
            },
        },
        {
            "id": "student",
            "type": "student_block",
            "frame": {"x_mm": 0, "y_mm": 34, "width_mm": 190, "height_mm": 22},
            "z_index": 2,
            "visible": True,
            "props": {
                "fields": [
                    "full_name",
                    "matricule",
                    "class",
                    "gender",
                    "repeat_status",
                ],
                "show_labels": True,
                "columns": 3,
            },
        },
        {
            "id": "grades",
            "type": "grades_table",
            "frame": {"x_mm": 0, "y_mm": 58, "width_mm": 190, "height_mm": 140},
            "z_index": 3,
            "visible": True,
            "props": {
                "columns": [
                    {"id": "subject", "label": "Matière", "bind": "subject.name", "width": 0.22, "align": "left", "visible": True},
                    {"id": "s5", "label": "5e", "bind": "grades.sequence_5", "width": 0.08, "align": "center", "visible": True, "numeric_format": "0.00"},
                    {"id": "s6", "label": "6e", "bind": "grades.sequence_6", "width": 0.08, "align": "center", "visible": True, "numeric_format": "0.00"},
                    {"id": "avg", "label": "Moy.", "bind": "subject.average", "width": 0.08, "align": "center", "visible": True, "numeric_format": "0.00"},
                    {"id": "coef", "label": "Coef.", "bind": "subject.coefficient", "width": 0.07, "align": "center", "visible": True},
                    {"id": "pts", "label": "Notes", "bind": "subject.points", "width": 0.08, "align": "center", "visible": True, "numeric_format": "0.00"},
                    {"id": "rank", "label": "Rang", "bind": "subject.rank", "width": 0.07, "align": "center", "visible": True},
                    {"id": "appr", "label": "Appréciation", "bind": "subject.appreciation", "width": 0.18, "align": "left", "visible": True},
                    {"id": "teacher", "label": "Professeur", "bind": "subject.teacher", "width": 0.14, "align": "left", "visible": True},
                ],
                "show_group_headers": True,
                "show_group_subtotals": True,
                "show_header": True,
                "repeat_header_on_page_break": True,
                "border_color": "#000000",
                "header_background": "#EEEEEE",
                "font_size_pt": 8.0,
                "row_height_mm": 6.0,
            },
        },
        {
            "id": "summary",
            "type": "summary_block",
            "frame": {"x_mm": 0, "y_mm": 200, "width_mm": 190, "height_mm": 28},
            "z_index": 4,
            "visible": True,
            "props": {
                "fields": [
                    "general_average",
                    "class_average",
                    "rank",
                    "class_size",
                    "decision",
                    "observation",
                ],
                "show_labels": True,
            },
        },
        {
            "id": "attendance",
            "type": "attendance_block",
            "frame": {"x_mm": 0, "y_mm": 230, "width_mm": 190, "height_mm": 14},
            "z_index": 5,
            "visible": True,
            "props": {
                "show_absences": True,
                "show_sanctions": True,
                "stub_label_absences": "—",
                "stub_label_sanctions": "—",
                "note": "Données d'assiduité non branchées (stub).",
            },
        },
        {
            "id": "signatures",
            "type": "signatures_row",
            "frame": {"x_mm": 0, "y_mm": 248, "width_mm": 190, "height_mm": 28},
            "z_index": 6,
            "visible": True,
            "props": {
                "slots": [
                    {"slot": "parent", "label": "Parent / Tuteur"},
                    {"slot": "teacher", "label": "Professeur principal"},
                    {"slot": "principal", "label": "Le Chef d'établissement"},
                ],
            },
        },
    ],
    "meta": {
        "demo": True,
        "locale": "fr-CM",
        "reference": "bulletin_camerounais_secondaire",
    },
}
