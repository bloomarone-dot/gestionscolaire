"""Tests détection présentation bulletin."""
from common.bulletin_layout import detect_from_text, defaults_for_kind, parse_layout


def test_primary_defaults_fr_header():
    profile = defaults_for_kind("PRIMARY_SCHOOL")
    assert profile["header_style"] == "fr_only"
    assert "EDUCATION DE BASE" in profile["ministry_fr"]


def test_detect_bilingual_secondary():
    text = """
    REPUBLIQUE DU CAMEROUN
    REPUBLIC OF CAMEROON
    MINISTERE DE L'ENSEIGNEMENT SECONDAIRE
    PREMIER GROUPE
    1ere Seq  2e Seq
    """
    profile = detect_from_text(text, "SCHOOL")
    assert profile["header_style"] == "bilingual"
    assert profile["show_subject_groups"] is True


def test_detect_primary_fr():
    text = """
    REPUBLIQUE DU CAMEROUN
    MINISTERE DE L'EDUCATION DE BASE
    BULLETIN SCOLAIRE
    Maternelle Grande Section
    """
    profile = detect_from_text(text, "PRIMARY_SCHOOL")
    assert profile["header_style"] == "fr_only"
    assert profile["show_subject_groups"] is False


def test_parse_layout_merges_kind():
    profile = parse_layout({"show_series": True}, "PRIMARY_SCHOOL")
    assert profile["show_series"] is True
    assert profile["header_style"] == "fr_only"
