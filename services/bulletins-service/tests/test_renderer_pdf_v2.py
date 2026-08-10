"""Tests étape 6 — renderer V2, pagination, ReportLab PDF, preview."""
from __future__ import annotations

from copy import deepcopy
from pathlib import Path

import pytest

from app.engine.context import BulletinDataContext
from app.engine.context_builder import BulletinDataContextBuilder
from app.engine.demo_templates import CAMEROON_SECONDARY_DEMO_V1
from app.engine.pdf_v2 import (
    generate_bulletin_document_v2,
    generate_bulletin_pdf_v2,
    generate_bulletin_preview_v2,
)
from app.engine.renderer import BulletinRenderer, render_bulletin_document
from app.engine.template_schema import empty_template_v1, validate_template_definition
from app.engine.units import mm_to_pt, page_size_mm, page_size_pt


def _ctx_many_subjects(n: int = 40) -> BulletinDataContext:
    subjects = []
    for i in range(n):
        g = (i % 3) + 1
        subjects.append({
            "id": i + 1,
            "name": f"Matière {i + 1}",
            "groupe": g,
            "coefficient": 1 + (i % 4),
            "average": 10 + (i % 8),
            "points": (10 + (i % 8)) * (1 + (i % 4)),
            "rank": (i % 10) + 1,
            "appreciation": "Bien",
            "teacher": f"Prof {i + 1}",
            "grades": {"sequence_5": 10.0, "sequence_6": 12.0},
        })
    return BulletinDataContext.from_mapping({
        "school": {"name": "Lycée Test", "logo": None, "motto": "Labor"},
        "student": {
            "id": 1, "first_name": "Ada", "last_name": "Lovelace",
            "full_name": "Ada Lovelace", "matricule": "MAT-9", "gender": "F",
        },
        "class": {"name": "Tle D", "size": 35, "level_code": "TLE"},
        "academic_year": {"name": "2025/2026"},
        "term": {"name": "Trimestre 3", "number": 3, "scope": "trimestre", "label": "Trimestre 3"},
        "period": {"label": "Trimestre 3", "number": 3, "scope": "trimestre"},
        "subjects": subjects,
        "summary": {
            "general_average": 12.4, "class_average": 11.1, "rank": 4,
            "class_size": 35, "total_points": 200, "total_coefficients": 16,
            "decision": None, "observation": None,
        },
        "attendance": {},
        "meta": {"source": "test"},
    })


def _small_table_template(n_cols: bool = True):
    tpl = empty_template_v1(name="Table paginée")
    tpl["page"] = {
        "size": "A4", "orientation": "portrait",
        "margins": {"top": 10, "right": 10, "bottom": 10, "left": 10},
    }
    tpl["data_binding"] = {
        "period_mode": "trimestre",
        "sequence_columns": [
            {"key": "sequence_5", "label": "5e", "source_type_evaluation": "sequence_5"},
            {"key": "sequence_6", "label": "6e", "source_type_evaluation": "sequence_6"},
        ],
        "groups_mode": "from_classe_matiere",
        "groups": [
            {"id": "g1", "label": "G1", "order": 1, "groupe_numbers": [1], "show_subtotal": False},
            {"id": "g2", "label": "G2", "order": 2, "groupe_numbers": [2], "show_subtotal": False},
            {"id": "g3", "label": "G3", "order": 3, "groupe_numbers": [3], "show_subtotal": False},
        ],
    }
    cols = [
        {"id": "subject", "label": "Matière", "bind": "subject.name", "width": 0.4, "align": "left", "visible": True},
        {"id": "avg", "label": "Moy.", "bind": "subject.average", "width": 0.2, "align": "center", "visible": True},
        {"id": "coef", "label": "Coef", "bind": "subject.coefficient", "width": 0.2, "align": "center", "visible": True},
        {"id": "rank", "label": "Rang", "bind": "subject.rank", "width": 0.2, "align": "center", "visible": True},
    ]
    if n_cols:
        cols.insert(1, {
            "id": "s5", "label": "5e", "bind": "grades.sequence_5",
            "width": 0.15, "align": "center", "visible": True,
        })
        # renormalize roughly
        for c in cols:
            c["width"] = 0.2
    tpl["components"] = [
        {
            "id": "grades",
            "type": "grades_table",
            "frame": {"x_mm": 0, "y_mm": 20, "width_mm": 190, "height_mm": 40},
            "z_index": 1,
            "visible": True,
            "props": {
                "columns": cols,
                "show_group_headers": True,
                "show_group_subtotals": False,
                "show_header": True,
                "repeat_header_on_page_break": True,
                "row_height_mm": 6.0,
                "font_size_pt": 7.0,
                "border_color": "#000000",
                "header_background": "#EEEEEE",
            },
        }
    ]
    return tpl


# 1–4 text / variables / header / student

def test_render_text_and_interpolation():
    tpl = empty_template_v1()
    tpl["components"] = [{
        "id": "t1", "type": "text",
        "frame": {"x_mm": 0, "y_mm": 0, "width_mm": 100, "height_mm": 10},
        "props": {"content": "Élève : {{student.full_name}}", "style": {"font_size_pt": 12, "bold": True}},
    }]
    doc = render_bulletin_document(tpl, _ctx_many_subjects(3))
    el = doc.pages[0].elements[0]
    assert el.content["text"] == "Élève : Ada Lovelace"


def test_school_header_and_student_block():
    doc = render_bulletin_document(CAMEROON_SECONDARY_DEMO_V1, _ctx_many_subjects(5))
    types = {e.component_type for e in doc.pages[0].elements}
    assert "institution_header" in types
    assert "student_block" in types
    header = next(e for e in doc.pages[0].elements if e.component_type == "institution_header")
    assert "Lycée Test" in header.content["title"]
    student = next(e for e in doc.pages[0].elements if e.component_type == "student_block")
    values = [i["value"] for i in student.content["items"]]
    assert "Ada Lovelace" in values or any(v and "Ada" in str(v) for v in values)


def test_grades_table_simple_and_multi_columns():
    doc = render_bulletin_document(_small_table_template(True), _ctx_many_subjects(6))
    # peut être paginé
    tables = [e for p in doc.pages for e in p.elements if e.component_type == "grades_table"]
    assert tables
    header_cols = tables[0].content["header"]["columns"]
    assert len(header_cols) >= 4
    assert any(c["id"] == "subject" for c in header_cols)


def test_groups_in_grades_table():
    doc = render_bulletin_document(_small_table_template(), _ctx_many_subjects(9))
    tables = [e for p in doc.pages for e in p.elements if e.component_type == "grades_table"]
    labels = []
    for t in tables:
        for s in t.content.get("sections") or []:
            labels.append(s.get("label"))
    assert any("G1" in (L or "") or "Groupe 1" in (L or "") for L in labels)


def test_summary_and_signatures_cameroon():
    doc = render_bulletin_document(CAMEROON_SECONDARY_DEMO_V1, _ctx_many_subjects(5))
    types = {e.component_type for e in doc.pages[0].elements}
    assert "summary_block" in types
    assert "signatures_row" in types
    summary = next(e for e in doc.pages[0].elements if e.component_type == "summary_block")
    fields = {i["field"]: i["value"] for i in summary.content["items"]}
    assert fields.get("general_average") == 12.4
    assert fields.get("rank") == 4


def test_a4_portrait_and_landscape():
    assert page_size_mm("portrait") == (210.0, 297.0)
    assert page_size_mm("landscape") == (297.0, 210.0)
    tpl = empty_template_v1()
    tpl["page"]["orientation"] = "landscape"
    tpl["components"] = [{
        "id": "t", "type": "text",
        "frame": {"x_mm": 0, "y_mm": 0, "width_mm": 50, "height_mm": 10},
        "props": {"content": "OK"},
    }]
    doc = render_bulletin_document(tpl, _ctx_many_subjects(1))
    assert doc.pages[0].orientation == "landscape"
    w, h = page_size_pt("landscape")
    assert w > h


def test_mm_to_points_conversion():
    assert abs(mm_to_pt(25.4) - 72.0) < 0.01
    assert mm_to_pt(0) == 0


def test_overflow_warning():
    tpl = empty_template_v1()
    tpl["components"] = [{
        "id": "big", "type": "text",
        "frame": {"x_mm": 0, "y_mm": 250, "width_mm": 100, "height_mm": 80},
        "props": {"content": "overflow"},
    }]
    doc = render_bulletin_document(tpl, _ctx_many_subjects(1))
    assert any("déborde" in w.lower() or "overflow" in w.lower() or "verticalement" in w.lower() for w in doc.warnings)


def test_multipart_table_and_header_repeat():
    tpl = _small_table_template()
    # frame très basse → force multi-pages
    tpl["components"][0]["frame"]["height_mm"] = 30
    tpl["components"][0]["props"]["row_height_mm"] = 6
    doc = render_bulletin_document(tpl, _ctx_many_subjects(40))
    assert len(doc.pages) >= 2
    assert doc.metadata.get("paginated") is True
    # continuation fragments
    frags = [
        e for p in doc.pages for e in p.elements
        if e.component_type == "grades_table"
    ]
    assert len(frags) >= 2
    assert frags[0].content.get("header")
    # page 2+ : pagination metadata
    assert frags[1].metadata.get("continuation") is True
    assert frags[1].content.get("pagination", {}).get("repeat_header") is True


def test_pdf_v2_generated_valid():
    pdf = generate_bulletin_pdf_v2(CAMEROON_SECONDARY_DEMO_V1, _ctx_many_subjects(8))
    assert isinstance(pdf, (bytes, bytearray))
    assert len(pdf) > 500
    assert pdf.startswith(b"%PDF")


def test_cameroon_demo_structure_present():
    doc = generate_bulletin_document_v2(CAMEROON_SECONDARY_DEMO_V1, _ctx_many_subjects(8))
    els = doc.pages[0].elements
    types = {e.component_type for e in els}
    for needed in (
        "institution_header", "student_block", "grades_table",
        "summary_block", "signatures_row",
    ):
        assert needed in types
    # matières / groupes
    table = next(e for e in els if e.component_type == "grades_table")
    assert table.content["empty"] is False
    assert any(s.get("rows") for s in table.content["sections"])
    # moyennes dans summary
    summary = next(e for e in els if e.component_type == "summary_block")
    assert any(i["field"] == "general_average" and i["value"] is not None for i in summary.content["items"])


def test_incomplete_context_still_renders_with_warnings():
    ctx = BulletinDataContext.from_mapping({
        "school": {"name": "X"},
        "student": {"full_name": "Y", "matricule": "1"},
        "subjects": [],
        "summary": {},
    })
    doc = render_bulletin_document(CAMEROON_SECONDARY_DEMO_V1, ctx)
    assert doc.pages
    table = next(e for p in doc.pages for e in p.elements if e.component_type == "grades_table")
    assert table.content["empty"] is True


def test_preview_uses_same_document():
    preview = generate_bulletin_preview_v2(CAMEROON_SECONDARY_DEMO_V1, _ctx_many_subjects(5))
    assert preview["kind"] == "bulletin_preview_v2"
    assert preview["page_count"] >= 1
    assert "pages" in preview
    assert preview["pages"][0]["geometry"]["width_mm"] == 210.0


def test_no_code_execution_in_renderer_stack():
    for name in ("renderer.py", "reportlab_adapter.py", "pdf_v2.py", "pagination.py"):
        src = (Path(__file__).resolve().parents[1] / "app" / "engine" / name).read_text(encoding="utf-8")
        assert "eval(" not in src
        assert "exec(" not in src


def test_builder_parity_feeds_pdf():
    students = [
        {"eleve_id": 1, "matricule": "A1", "nom": "Ngo", "prenom": "Ana", "sexe": "F"},
    ]
    subjects = [
        {"matiere_id": 100, "nom": "Mathématiques", "coefficient": 5, "source": "OFFICIELLE", "groupe": 1, "enseignant_nom": "P"},
        {"matiere_id": 101, "nom": "Français", "coefficient": 3, "source": "OFFICIELLE", "groupe": 2, "enseignant_nom": "Q"},
    ]
    notes = [
        {"eleve_id": 1, "matiere_id": 100, "valeur": 14, "type_evaluation": "sequence_5"},
        {"eleve_id": 1, "matiere_id": 100, "valeur": 16, "type_evaluation": "sequence_6"},
        {"eleve_id": 1, "matiere_id": 101, "valeur": 12, "type_evaluation": "sequence_5"},
        {"eleve_id": 1, "matiere_id": 101, "valeur": 10, "type_evaluation": "sequence_6"},
    ]
    ctx = BulletinDataContextBuilder.from_compute_inputs(
        students, subjects, notes, eleve_id=1, trimestre=3,
        school={"name": "Collège Demo"},
        classe={"nom_personnalise": "3ème A"},
    )
    pdf = generate_bulletin_pdf_v2(CAMEROON_SECONDARY_DEMO_V1, ctx)
    assert pdf.startswith(b"%PDF")
    doc = generate_bulletin_document_v2(CAMEROON_SECONDARY_DEMO_V1, ctx)
    assert doc.pages[0].elements
