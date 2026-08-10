"""Tests starter templates + catalogue (sans réécrire le moteur V2)."""
from __future__ import annotations

import copy

import pytest

from app.engine.starter_templates import (
    BLANK_V1,
    CAMEROON_PRIMARY_STANDARD_V1,
    CAMEROON_SECONDARY_STANDARD_V1,
    MISSING_CONTEXT_FIELDS,
    STARTER_CATALOG,
    assert_starter_has_no_real_school_data,
    build_blank_starter,
    build_primary_starter,
    build_secondary_starter,
    get_starter_definition,
    list_starters_for_catalog,
)
from app.engine.template_schema import validate_template_definition


def test_missing_fields_documented():
    assert "competences_grid" in MISSING_CONTEXT_FIELDS
    assert "school.email" in MISSING_CONTEXT_FIELDS


@pytest.mark.parametrize("lang", ["fr", "en", "bilingual"])
def test_secondary_starter_valid(lang):
    definition = build_secondary_starter(lang)
    validated = validate_template_definition(definition)
    assert validated.schema_version == 1
    assert definition["meta"]["language_mode"] == lang
    assert definition["meta"]["kind"] == "secondary"
    assert definition["data_binding"]["groups_mode"] == "from_classe_matiere"
    types = {c["type"] for c in definition["components"]}
    assert "grades_table" in types
    assert "school_logo" in types
    assert "student_block" in types
    assert "summary_block" in types
    assert "signatures_row" in types
    assert_starter_has_no_real_school_data(definition)


@pytest.mark.parametrize("lang", ["fr", "en", "bilingual"])
def test_primary_starter_valid(lang):
    definition = build_primary_starter(lang)
    validate_template_definition(definition)
    assert definition["meta"]["kind"] == "primary"
    assert "no_competences_grid" in definition["meta"]["limitations"]
    types = {c["type"] for c in definition["components"]}
    assert "grades_table" not in types  # primaire ≠ copie secondaire
    assert "student_block" in types
    assert_starter_has_no_real_school_data(definition)


def test_blank_starter_valid():
    definition = build_blank_starter("fr")
    validate_template_definition(definition)
    assert definition["components"] == []
    assert definition["meta"]["kind"] == "blank"
    assert_starter_has_no_real_school_data(BLANK_V1)


def test_aliases_are_valid():
    validate_template_definition(CAMEROON_SECONDARY_STANDARD_V1)
    validate_template_definition(CAMEROON_PRIMARY_STANDARD_V1)
    validate_template_definition(BLANK_V1)


def test_deep_copy_isolation():
    a = get_starter_definition("cameroon_secondary_standard", "bilingual")
    b = get_starter_definition("cameroon_secondary_standard", "bilingual")
    assert a is not b
    a["name"] = "MUTATED_A"
    title = next(c for c in a["components"] if c["id"] == "title_bar")
    title["props"]["content"] = "MUTATED"
    b2 = get_starter_definition("cameroon_secondary_standard", "bilingual")
    assert b2["name"] != "MUTATED_A"
    assert "MUTATED" not in str(b2)


def test_starter_immutable_catalog_entries():
    """Le catalogue ne doit pas exposer de définition mutable partagée."""
    catalog = list_starters_for_catalog(include_definitions=True)
    secondary = next(s for s in catalog if s["id"] == "cameroon_secondary_standard")
    assert secondary["available"] is True
    def_fr = secondary["definitions"]["fr"]
    mutated = copy.deepcopy(def_fr)
    mutated["name"] = "HACK"
    again = get_starter_definition("cameroon_secondary_standard", "fr")
    assert again["name"] != "HACK"


def test_catalog_metadata_shape():
    ids = {e["id"] for e in STARTER_CATALOG}
    assert "cameroon_secondary_standard" in ids
    assert "cameroon_primary_standard" in ids
    assert "blank_v1" in ids
    vocational = next(e for e in STARTER_CATALOG if e["kind"] == "vocational")
    assert vocational["available"] is False


def test_neutral_theme_defaults():
    meta = CAMEROON_SECONDARY_STANDARD_V1["meta"]
    assert meta["theme_primary"] == "#000000"
    assert meta["theme_border"] == "#000000"
    assert meta["theme_table_header"] == "#F5F5F5"


def test_no_real_school_data_guard():
    with pytest.raises(AssertionError):
        assert_starter_has_no_real_school_data({"name": "Royal Priesthood Academy"})
