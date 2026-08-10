"""Tests — schéma Template bulletin v1 + validation sécurisée."""
from __future__ import annotations

import pytest

from app.engine.demo_templates import CAMEROON_SECONDARY_DEMO_V1
from app.engine.template_schema import (
    TEMPLATE_SCHEMA_VERSION,
    TemplateValidationError,
    empty_template_v1,
    validate_template_definition,
)
from app.engine.variables import is_safe_path, validate_interpolated_text, VariableValidationError


def test_schema_version_constant():
    assert TEMPLATE_SCHEMA_VERSION == 1


def test_empty_template_is_valid():
    tpl = validate_template_definition(empty_template_v1(name="Brouillon"))
    assert tpl.schema_version == 1
    assert tpl.components == []
    assert tpl.page.size == "A4"


def test_cameroon_demo_template_validates():
    tpl = validate_template_definition(CAMEROON_SECONDARY_DEMO_V1)
    assert tpl.name.startswith("Bulletin")
    assert any(c.type == "grades_table" for c in tpl.components)
    assert len(tpl.data_binding.sequence_columns) == 2
    assert tpl.data_binding.groups_mode == "from_classe_matiere"


def test_rejects_unknown_component_type():
    data = empty_template_v1()
    data["components"] = [{
        "id": "bad",
        "type": "malware_widget",
        "frame": {"x_mm": 0, "y_mm": 0, "width_mm": 10, "height_mm": 10},
        "props": {},
    }]
    with pytest.raises(TemplateValidationError):
        validate_template_definition(data)


def test_rejects_code_like_variable_paths():
    with pytest.raises(VariableValidationError):
        validate_interpolated_text("{{student.__class__}}")
    with pytest.raises(VariableValidationError):
        validate_interpolated_text("Hello {% for x in y %}")
    with pytest.raises(VariableValidationError):
        validate_interpolated_text("{{os.system}}")
    assert is_safe_path("student.full_name")
    assert not is_safe_path("student.__dict__")
    assert is_safe_path("grades.sequence_5")
    assert is_safe_path("subject.average")


def test_rejects_unknown_interpolation_in_text_component():
    data = empty_template_v1()
    data["components"] = [{
        "id": "t1",
        "type": "text",
        "frame": {"x_mm": 0, "y_mm": 0, "width_mm": 50, "height_mm": 10},
        "props": {"content": "Secret {{school.password}}"},
    }]
    with pytest.raises(TemplateValidationError):
        validate_template_definition(data)


def test_rejects_wrong_schema_version():
    data = empty_template_v1()
    data["schema_version"] = 99
    with pytest.raises(TemplateValidationError):
        validate_template_definition(data)


def test_grades_bind_must_match_sequence_columns_when_defined():
    data = {
        "schema_version": 1,
        "page": {"size": "A4", "orientation": "portrait", "margins": {"top": 10, "right": 10, "bottom": 10, "left": 10}},
        "data_binding": {
            "period_mode": "trimestre",
            "sequence_columns": [
                {"key": "sequence_1", "label": "1", "source_type_evaluation": "sequence_1"},
            ],
            "groups_mode": "from_classe_matiere",
            "groups": [],
        },
        "components": [{
            "id": "g",
            "type": "grades_table",
            "frame": {"x_mm": 0, "y_mm": 0, "width_mm": 180, "height_mm": 100},
            "props": {
                "columns": [
                    {"id": "s", "label": "M", "bind": "subject.name", "width": 0.5, "align": "left", "visible": True},
                    {"id": "x", "label": "X", "bind": "grades.sequence_99", "width": 0.5, "align": "center", "visible": True},
                ],
            },
        }],
    }
    with pytest.raises(TemplateValidationError):
        validate_template_definition(data)


def test_from_template_groups_require_groups_list():
    data = empty_template_v1()
    data["data_binding"] = {
        "period_mode": "trimestre",
        "sequence_columns": [],
        "groups_mode": "from_template",
        "groups": [],
    }
    with pytest.raises(TemplateValidationError):
        validate_template_definition(data)


def test_duplicate_component_ids_rejected():
    data = empty_template_v1()
    frame = {"x_mm": 0, "y_mm": 0, "width_mm": 10, "height_mm": 10}
    data["components"] = [
        {"id": "same", "type": "spacer", "frame": frame, "props": {}},
        {"id": "same", "type": "spacer", "frame": frame, "props": {}},
    ]
    with pytest.raises(TemplateValidationError):
        validate_template_definition(data)


def test_frame_x_mm_minus_5_accepted():
    data = empty_template_v1()
    data["components"] = [{
        "id": "edge",
        "type": "spacer",
        "frame": {"x_mm": -5, "y_mm": -5, "width_mm": 10, "height_mm": 10},
        "props": {},
    }]
    validate_template_definition(data)


def test_frame_x_mm_below_minus_5_rejected():
    data = empty_template_v1()
    data["components"] = [{
        "id": "bad",
        "type": "spacer",
        "frame": {"x_mm": -26.4, "y_mm": 0, "width_mm": 10, "height_mm": 10},
        "props": {},
    }]
    with pytest.raises(TemplateValidationError) as exc:
        validate_template_definition(data)
    assert "x_mm" in str(exc.value).lower() or "-26.4" in str(exc.value) or "greater" in str(exc.value).lower()


def test_cameroon_secondary_starter_frames_valid():
    from app.engine.starter_templates import CAMEROON_SECONDARY_STANDARD_V1

    tpl = validate_template_definition(CAMEROON_SECONDARY_STANDARD_V1)
    for c in tpl.components:
        assert c.frame.x_mm >= -5
        assert c.frame.y_mm >= -5
        assert c.frame.width_mm > 0
        assert c.frame.height_mm > 0
