"""Tests — moteur runtime v2 (registry, context, resolver, IR, grades_table)."""
from __future__ import annotations

from pathlib import Path

import pytest

from app.engine.context import BulletinDataContext, DataContextError
from app.engine.demo_templates import CAMEROON_SECONDARY_DEMO_V1
from app.engine.ir import RenderedDocument
from app.engine.registry import ComponentRegistryError, get_registry
from app.engine.resolver import ResolveError, interpolate, resolve_path
from app.engine.runtime import (
    RuntimeValidationError,
    build_rendered_document,
    validate_runtime,
)
from app.engine.template_schema import empty_template_v1, validate_template_definition


def _sample_context(**overrides):
    base = {
        "school": {"name": "Collège Test", "logo": "https://example.com/logo.png", "motto": "Travail"},
        "student": {
            "first_name": "Ada",
            "last_name": "Lovelace",
            "full_name": "Ada Lovelace",
            "matricule": "MAT-001",
            "gender": "F",
            "repeat_status": None,
        },
        "class": {"name": "3ème A", "size": 40, "level_code": "3E", "cycle_code": "PREMIER"},
        "academic_year": {"name": "2025/2026"},
        "term": {"name": "Trimestre 3", "number": 3, "scope": "trimestre"},
        "period": {"label": "Trimestre 3", "number": 3},
        "subjects": [
            {
                "id": 1,
                "name": "Mathématiques",
                "groupe": 1,
                "coefficient": 4,
                "average": 12.5,
                "points": 50.0,
                "rank": 3,
                "appreciation": "Assez bien",
                "teacher": "M. Ngono",
                "grades": {"sequence_5": 11.0, "sequence_6": 14.0},
            },
            {
                "id": 2,
                "name": "Anglais",
                "groupe": 2,
                "coefficient": 3,
                "average": 13.0,
                "points": 39.0,
                "rank": 2,
                "appreciation": "Bien",
                "teacher": "Mme Okala",
                "grades": {"sequence_5": 12.0, "sequence_6": 14.0},
            },
            {
                "id": 3,
                "name": "EPS",
                "groupe": 3,
                "coefficient": 1,
                "average": 15.0,
                "points": 15.0,
                "rank": 1,
                "appreciation": "Très bien",
                "teacher": "M. Bella",
                "grades": {"sequence_5": 15.0, "sequence_6": 15.0},
            },
        ],
        "summary": {
            "general_average": 13.2,
            "class_average": 11.8,
            "rank": 5,
            "class_size": 40,
            "decision": None,
            "observation": "",
        },
        "attendance": {"absences": "—", "sanctions": "—"},
    }
    base.update(overrides)
    return BulletinDataContext.from_mapping(base)


# ── Registry ────────────────────────────────────────────────────────────────

def test_registry_known_component_accepted():
    reg = get_registry()
    assert reg.has("grades_table")
    definition = reg.get("text")
    assert definition.category == "design"
    props = reg.validate_props("text", {"content": "Hello {{school.name}}"})
    assert "content" in props


def test_registry_unknown_component_rejected():
    reg = get_registry()
    assert not reg.has("malware_widget")
    with pytest.raises(ComponentRegistryError):
        reg.get("malware_widget")


# ── Resolver ────────────────────────────────────────────────────────────────

def test_resolver_valid_variable():
    root = _sample_context().root_dict()
    assert resolve_path(root, "school.name") == "Collège Test"
    assert resolve_path(root, "student.full_name") == "Ada Lovelace"
    assert resolve_path(root, "period.label") == "Trimestre 3"
    text = interpolate("Élève : {{student.full_name}} — {{school.name}}", root)
    assert "Ada Lovelace" in text
    assert "Collège Test" in text


def test_resolver_unknown_variable():
    root = _sample_context().root_dict()
    with pytest.raises(ResolveError):
        resolve_path(root, "school.password")
    assert resolve_path(root, "student.age", missing="N/A") == "N/A"


def test_resolver_dunder_rejected():
    root = _sample_context().root_dict()
    with pytest.raises(ResolveError):
        resolve_path(root, "student.__class__")
    with pytest.raises(ResolveError):
        resolve_path(root, "school.__dict__")


def test_resolver_no_code_execution_surface():
    src = Path(__file__).resolve().parents[1] / "app" / "engine" / "resolver.py"
    text = src.read_text(encoding="utf-8")
    assert "eval(" not in text
    assert "exec(" not in text
    assert "getattr(" not in text
    # Tentative d'injection via texte
    root = _sample_context().root_dict()
    with pytest.raises(Exception):
        interpolate("{{os.system}}", root)


# ── DataContext ─────────────────────────────────────────────────────────────

def test_datacontext_serializable():
    ctx = _sample_context()
    data = ctx.to_serializable()
    assert data["school"]["name"] == "Collège Test"
    assert isinstance(data["subjects"], list)
    # Round-trip JSON déjà garanti par to_serializable
    assert "class" in data


def test_datacontext_rejects_orm_like_objects():
    class FakeORM:
        __tablename__ = "eleves"
        nom = "X"

    with pytest.raises(DataContextError):
        BulletinDataContext.from_mapping({"student": {"obj": FakeORM()}})


# ── Runtime ─────────────────────────────────────────────────────────────────

def test_runtime_validation_valid_template():
    issues = validate_runtime(
        CAMEROON_SECONDARY_DEMO_V1,
        _sample_context(),
        raise_on_error=True,
    )
    assert all(i.severity in ("warning", "error") for i in issues)


def test_runtime_validation_incoherent_template():
    data = empty_template_v1()
    data["components"] = [{
        "id": "bad",
        "type": "grades_table",
        "frame": {"x_mm": 0, "y_mm": 0, "width_mm": 100, "height_mm": 80},
        "props": {
            "columns": [
                {"id": "s", "label": "M", "bind": "subject.name", "width": 0.5, "align": "left", "visible": True},
                {"id": "x", "label": "X", "bind": "grades.missing_key", "width": 0.5, "align": "center", "visible": True},
            ],
        },
    }]
    data["data_binding"] = {
        "period_mode": "trimestre",
        "sequence_columns": [
            {"key": "sequence_1", "label": "1", "source_type_evaluation": "sequence_1"},
        ],
        "groups_mode": "from_classe_matiere",
        "groups": [],
    }
    # Déjà rejeté par validation Pydantic (étape 2) OU runtime
    with pytest.raises((RuntimeValidationError, Exception)):
        validate_runtime(data, _sample_context(), raise_on_error=True)


# ── grades_table ────────────────────────────────────────────────────────────

def test_grades_table_with_data_from_classe_matiere():
    doc = build_rendered_document(CAMEROON_SECONDARY_DEMO_V1, _sample_context())
    grades = next(e for e in doc.pages[0].elements if e.component_type == "grades_table")
    assert grades.content["empty"] is False
    assert grades.content["groups_mode"] == "from_classe_matiere"
    # 3 groupes (1,2,3)
    labels = [s["label"] for s in grades.content["sections"]]
    assert any("PREMIER" in L or "Groupe 1" in L for L in labels)
    assert sum(len(s["rows"]) for s in grades.content["sections"]) == 3


def test_grades_table_without_data():
    ctx = _sample_context(subjects=[])
    issues = validate_runtime(CAMEROON_SECONDARY_DEMO_V1, ctx, raise_on_error=False)
    assert any(i.code == "missing_subjects" for i in issues)
    doc = build_rendered_document(CAMEROON_SECONDARY_DEMO_V1, ctx)
    grades = next(e for e in doc.pages[0].elements if e.component_type == "grades_table")
    assert grades.content["empty"] is True
    assert grades.content["message"]


def test_groups_mode_from_template():
    tpl = validate_template_definition(CAMEROON_SECONDARY_DEMO_V1).model_dump(mode="json")
    tpl["data_binding"]["groups_mode"] = "from_template"
    # Ne garder que g1 (maths groupe 1)
    tpl["data_binding"]["groups"] = [{
        "id": "only_g1",
        "label": "Sciences",
        "order": 1,
        "groupe_numbers": [1],
        "show_subtotal": True,
    }]
    doc = build_rendered_document(tpl, _sample_context())
    grades = next(e for e in doc.pages[0].elements if e.component_type == "grades_table")
    assert grades.content["groups_mode"] == "from_template"
    # Maths dans Sciences ; Anglais/EPS en ungrouped
    assert any(s["id"] == "only_g1" for s in grades.content["sections"])
    assert any(s["id"] == "_ungrouped" for s in grades.content["sections"])


def test_cameroon_demo_builds_full_document():
    doc = build_rendered_document(CAMEROON_SECONDARY_DEMO_V1, _sample_context())
    assert isinstance(doc, RenderedDocument)
    types = {e.component_type for e in doc.pages[0].elements}
    assert "institution_header" in types
    assert "student_block" in types
    assert "grades_table" in types
    assert "summary_block" in types
    assert "signatures_row" in types
    assert "attendance_block" in types
    header = next(e for e in doc.pages[0].elements if e.component_type == "institution_header")
    assert "Collège Test" in header.content["title"]


def test_rendered_document_minimal_serializable():
    tpl = empty_template_v1(name="Minimal")
    tpl["components"] = [{
        "id": "t1",
        "type": "text",
        "frame": {"x_mm": 5, "y_mm": 5, "width_mm": 50, "height_mm": 10},
        "props": {"content": "{{student.matricule}}"},
    }]
    doc = build_rendered_document(tpl, _sample_context())
    payload = doc.to_serializable()
    assert payload["pages"][0]["elements"][0]["content"]["text"] == "MAT-001"
    assert payload["metadata"]["engine"] == "bulletin_v2"
