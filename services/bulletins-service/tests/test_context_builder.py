"""Tests étape 5 — bridge compute/legacy → BulletinDataContext (parité, pas de recalcul)."""
from __future__ import annotations

from app.compute import compute_class_bulletins
from app.engine.context import BulletinDataContext
from app.engine.context_builder import BulletinDataContextBuilder
from app.engine.demo_templates import CAMEROON_SECONDARY_DEMO_V1
from app.engine.runtime import build_rendered_document


STUDENTS = [
    {"eleve_id": 1, "matricule": "A1", "nom": "Ngo", "prenom": "Ana", "sexe": "F"},
    {"eleve_id": 2, "matricule": "A2", "nom": "Eto", "prenom": "Boris", "sexe": "M"},
]

SUBJECTS_GROUPED = [
    {"matiere_id": 100, "nom": "Mathématiques", "coefficient": 5, "source": "OFFICIELLE", "groupe": 1, "enseignant_nom": "M. Ngono"},
    {"matiere_id": 101, "nom": "Français", "coefficient": 3, "source": "OFFICIELLE", "groupe": 2, "enseignant_nom": "Mme Okala"},
    {"matiere_id": 102, "nom": "EPS", "coefficient": 1, "source": "OFFICIELLE", "groupe": 3, "enseignant_nom": "M. Bella"},
    {"matiere_id": 200, "nom": "Mandarin", "coefficient": 2, "source": "SPECIALE"},
]

NOTES_T3 = [
    {"eleve_id": 1, "matiere_id": 100, "valeur": 16, "type_evaluation": "sequence_5"},
    {"eleve_id": 1, "matiere_id": 100, "valeur": 12, "type_evaluation": "sequence_6"},
    {"eleve_id": 1, "matiere_id": 101, "valeur": 10, "type_evaluation": "sequence_5"},
    {"eleve_id": 1, "matiere_id": 101, "valeur": 14, "type_evaluation": "sequence_6"},
    {"eleve_id": 1, "matiere_id": 102, "valeur": 15, "type_evaluation": "sequence_5"},
    {"eleve_id": 1, "matiere_id": 200, "valeur": 18, "type_evaluation": "sequence_5"},
    {"eleve_id": 2, "matiere_id": 100, "valeur": 10, "type_evaluation": "sequence_5"},
    {"eleve_id": 2, "matiere_id": 100, "valeur": 8, "type_evaluation": "sequence_6"},
    {"eleve_id": 2, "matiere_id": 101, "valeur": 14, "type_evaluation": "sequence_5"},
    {"eleve_id": 2, "matiere_id": 101, "valeur": 12, "type_evaluation": "sequence_6"},
    {"eleve_id": 2, "matiere_id": 102, "valeur": 11, "type_evaluation": "sequence_5"},
]


def _legacy_bulletin(eleve_id: int = 1, trimestre: int = 3, scope: str = "trimestre"):
    res = compute_class_bulletins(
        STUDENTS, SUBJECTS_GROUPED, NOTES_T3, "fr",
        trimestre=trimestre, scope=scope,
    )
    b = next(x for x in res["bulletins"] if x["eleve_id"] == eleve_id)
    return res, b


def test_parity_general_average_rank_totals():
    res, b = _legacy_bulletin(1)
    ctx = BulletinDataContextBuilder.from_compute_inputs(
        STUDENTS, SUBJECTS_GROUPED, NOTES_T3,
        eleve_id=1, trimestre=3, lang="fr",
        classe={"nom_personnalise": "3ème A", "level_code": "3E"},
        school={"name": "Collège Demo"},
    )
    assert ctx.summary["general_average"] == b["moyenne_generale"]
    assert ctx.summary["rank"] == b["rang_general"]
    assert ctx.summary["total_points"] == b["total_points"]
    assert ctx.summary["total_coefficients"] == b["total_coefficient"]
    assert ctx.summary["class_average"] == res["moyenne_classe"]
    assert ctx.summary["class_size"] == res["effectif"]


def test_parity_subject_average_coef_rank_appreciation_teacher():
    _, b = _legacy_bulletin(1)
    ctx = BulletinDataContextBuilder.from_compute_inputs(
        STUDENTS, SUBJECTS_GROUPED, NOTES_T3, eleve_id=1, trimestre=3,
    )
    by_id = {s["id"]: s for s in ctx.subjects if not s.get("is_complementary")}
    for row in b["subjects"]:
        mapped = by_id[row["matiere_id"]]
        assert mapped["average"] == row["moyenne"]
        assert mapped["coefficient"] == row["coefficient"]
        assert mapped["rank"] == row["rang_matiere"]
        assert mapped["appreciation"] == row["appreciation"]
        assert mapped["points"] == row["points"]
        assert mapped["teacher"] == row.get("enseignant_nom")
        assert mapped["groupe"] == row.get("groupe")


def test_parity_groups():
    _, b = _legacy_bulletin(1)
    ctx = BulletinDataContextBuilder.from_compute_inputs(
        STUDENTS, SUBJECTS_GROUPED, NOTES_T3, eleve_id=1, trimestre=3,
    )
    legacy_groups = {s["matiere_id"]: s["groupe"] for s in b["subjects"]}
    ctx_groups = {s["id"]: s["groupe"] for s in ctx.subjects if not s.get("is_complementary")}
    assert ctx_groups == legacy_groups
    assert set(ctx_groups.values()) == {1, 2, 3}


def test_parity_sequences_t3():
    """T3 → sequence_5 / sequence_6 issus de seqs legacy, sans recalcul."""
    _, b = _legacy_bulletin(1, trimestre=3)
    ctx = BulletinDataContextBuilder.from_compute_inputs(
        STUDENTS, SUBJECTS_GROUPED, NOTES_T3, eleve_id=1, trimestre=3,
    )
    maths_legacy = next(s for s in b["subjects"] if s["matiere_id"] == 100)
    maths = next(s for s in ctx.subjects if s["id"] == 100)
    assert maths["grades"]["sequence_5"] == maths_legacy["seqs"][0]
    assert maths["grades"]["sequence_6"] == maths_legacy["seqs"][1]
    # Moyenne matière = déjà calculée (16+12)/2 = 14
    assert maths["average"] == 14
    assert maths["average"] == maths_legacy["moyenne"]


def test_missing_note_parity():
    notes = [
        {"eleve_id": 1, "matiere_id": 100, "valeur": 15, "type_evaluation": "sequence_5"},
        # pas de note Français / EPS
    ]
    subjects = [
        {"matiere_id": 100, "nom": "Maths", "coefficient": 5, "source": "OFFICIELLE", "groupe": 1},
        {"matiere_id": 101, "nom": "Français", "coefficient": 3, "source": "OFFICIELLE", "groupe": 2},
    ]
    res = compute_class_bulletins([STUDENTS[0]], subjects, notes, "fr", trimestre=3)
    b = res["bulletins"][0]
    ctx = BulletinDataContextBuilder.from_compute_inputs(
        [STUDENTS[0]], subjects, notes, eleve_id=1, trimestre=3,
    )
    assert ctx.summary["general_average"] == b["moyenne_generale"] == 15
    fr = next(s for s in ctx.subjects if s["id"] == 101)
    assert fr["average"] is None
    assert fr["grades"]["sequence_5"] is None


def test_subject_without_any_note_in_list():
    """Matière présente, aucune note → average None, toujours dans le contexte."""
    subjects = [
        {"matiere_id": 100, "nom": "Maths", "coefficient": 5, "source": "OFFICIELLE", "groupe": 1},
        {"matiere_id": 101, "nom": "Histoire", "coefficient": 2, "source": "OFFICIELLE", "groupe": 1},
    ]
    notes = [{"eleve_id": 1, "matiere_id": 100, "valeur": 12, "type_evaluation": "sequence_5"}]
    ctx = BulletinDataContextBuilder.from_compute_inputs(
        [STUDENTS[0]], subjects, notes, eleve_id=1, trimestre=3,
    )
    hist = next(s for s in ctx.subjects if s["id"] == 101)
    assert hist["average"] is None
    assert hist["name"] == "Histoire"


def test_teacher_available():
    ctx = BulletinDataContextBuilder.from_compute_inputs(
        STUDENTS, SUBJECTS_GROUPED, NOTES_T3, eleve_id=1, trimestre=3,
    )
    maths = next(s for s in ctx.subjects if s["id"] == 100)
    assert maths["teacher"] == "M. Ngono"


def test_ranks_across_students():
    res = compute_class_bulletins(STUDENTS, SUBJECTS_GROUPED, NOTES_T3, "fr", trimestre=3)
    by = {b["eleve_id"]: b for b in res["bulletins"]}
    ctx1 = BulletinDataContextBuilder.from_compute_inputs(
        STUDENTS, SUBJECTS_GROUPED, NOTES_T3, eleve_id=1, trimestre=3,
    )
    ctx2 = BulletinDataContextBuilder.from_compute_inputs(
        STUDENTS, SUBJECTS_GROUPED, NOTES_T3, eleve_id=2, trimestre=3,
    )
    assert ctx1.summary["rank"] == by[1]["rang_general"]
    assert ctx2.summary["rank"] == by[2]["rang_general"]
    assert ctx1.summary["rank"] != ctx2.summary["rank"]


def test_special_complementary_mapped():
    _, b = _legacy_bulletin(1)
    ctx = BulletinDataContextBuilder.from_compute_inputs(
        STUDENTS, SUBJECTS_GROUPED, NOTES_T3, eleve_id=1, trimestre=3,
    )
    comps = [s for s in ctx.subjects if s.get("is_complementary")]
    assert len(comps) == 1
    assert comps[0]["name"] == "Mandarin"
    assert comps[0]["average"] == b["special_subjects"][0]["moyenne"]


def test_attendance_not_fabricated():
    ctx = BulletinDataContextBuilder.from_compute_inputs(
        STUDENTS, SUBJECTS_GROUPED, NOTES_T3, eleve_id=1, trimestre=3,
    )
    assert ctx.attendance == {}
    assert "absences" not in ctx.attendance


def test_repeat_status_only_if_present():
    students = [{**STUDENTS[0], "redoublant": True}]
    ctx = BulletinDataContextBuilder.from_compute_inputs(
        students, SUBJECTS_GROUPED, NOTES_T3, eleve_id=1, trimestre=3,
    )
    assert ctx.student.get("repeat_status") is True
    # Sans clé redoublant dans le bulletin compute — compute copie st.get("redoublant")
    students2 = [{"eleve_id": 1, "matricule": "A1", "nom": "Ngo", "prenom": "Ana"}]
    ctx2 = BulletinDataContextBuilder.from_compute_inputs(
        students2, SUBJECTS_GROUPED[:1], NOTES_T3[:2], eleve_id=1, trimestre=3,
    )
    # compute puts redoublant: None from .get — key present with None
    assert "repeat_status" in ctx2.student
    assert ctx2.student["repeat_status"] is None


def test_snapshot_roundtrip_json():
    ctx = BulletinDataContextBuilder.from_compute_inputs(
        STUDENTS, SUBJECTS_GROUPED, NOTES_T3, eleve_id=1, trimestre=3,
        school={"name": "Collège Demo"},
        classe={"nom_personnalise": "3ème A"},
    )
    data = ctx.to_serializable()
    restored = BulletinDataContext.from_mapping(data)
    assert restored.summary["general_average"] == ctx.summary["general_average"]
    assert restored.subjects[0]["grades"] == ctx.subjects[0]["grades"]
    assert restored.student["full_name"] == ctx.student["full_name"]
    assert restored.attendance == {}


def test_context_feeds_runtime_cameroon_template():
    ctx = BulletinDataContextBuilder.from_compute_inputs(
        STUDENTS, SUBJECTS_GROUPED, NOTES_T3, eleve_id=1, trimestre=3,
        school={"name": "Collège Demo", "logo_url": None},
        classe={"nom_personnalise": "3ème A", "level_code": "3E"},
    )
    doc = build_rendered_document(CAMEROON_SECONDARY_DEMO_V1, ctx)
    grades = next(e for e in doc.pages[0].elements if e.component_type == "grades_table")
    assert grades.content["empty"] is False
    assert sum(len(s["rows"]) for s in grades.content["sections"]) >= 3


def test_from_legacy_eleve_payload_shape():
    """Simule le dict de build_eleve_bulletin sans HTTP."""
    res, b = _legacy_bulletin(1)
    payload = {
        "header": {
            "school_name": "Collège X",
            "school_name_fr": "Collège X",
            "logo_url": None,
            "classe": "3ème A",
            "level_code": "3E",
            "trimestre": 3,
            "scope": "trimestre",
            "establishment_kind": "SCHOOL",
            "term": "3e TRIMESTRE",
            "school_year": "2025/2026",
            "effectif": res["effectif"],
        },
        "moyenne_classe": res["moyenne_classe"],
        "effectif": res["effectif"],
        "lang": "fr",
        "bulletin": b,
    }
    ctx = BulletinDataContextBuilder.from_legacy_eleve_result(payload)
    assert ctx.school["name"] == "Collège X"
    assert ctx.class_["name"] == "3ème A"
    assert ctx.summary["general_average"] == b["moyenne_generale"]
    assert ctx.meta["source"] == "legacy_compute"
