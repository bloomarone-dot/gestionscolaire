"""Tests du calcul des bulletins (§11.1) : moyennes, rangs, pondération, spéciales (§11.3)."""
from app.compute import compute_class_bulletins
from app.labels import appreciation, decision, lang_for_subsystem

STUDENTS = [
    {"eleve_id": 1, "matricule": "A1", "nom": "Ngo", "prenom": "Ana"},
    {"eleve_id": 2, "matricule": "A2", "nom": "Eto", "prenom": "Boris"},
]
SUBJECTS = [
    {"matiere_id": 100, "nom": "Mathématiques", "coefficient": 5, "source": "OFFICIELLE"},
    {"matiere_id": 101, "nom": "Français", "coefficient": 3, "source": "OFFICIELLE"},
    {"matiere_id": 200, "nom": "Mandarin", "coefficient": 2, "source": "SPECIALE"},
]
NOTES = [
    {"eleve_id": 1, "matiere_id": 100, "valeur": 16, "type_evaluation": "sequence_1"},
    {"eleve_id": 1, "matiere_id": 101, "valeur": 12, "type_evaluation": "sequence_1"},
    {"eleve_id": 2, "matiere_id": 100, "valeur": 10, "type_evaluation": "sequence_1"},
    {"eleve_id": 2, "matiere_id": 101, "valeur": 14, "type_evaluation": "sequence_1"},
    {"eleve_id": 1, "matiere_id": 200, "valeur": 18, "type_evaluation": "sequence_1"},  # spéciale
]


def _by_id(result):
    return {b["eleve_id"]: b for b in result["bulletins"]}


def test_weighted_average_excludes_special():
    res = compute_class_bulletins(STUDENTS, SUBJECTS, NOTES, "fr")
    b = _by_id(res)
    # (16*5 + 12*3) / 8 = 14.5  — la spéciale (Mandarin) n'entre PAS dans le total
    assert b[1]["total_coefficient"] == 8
    assert b[1]["moyenne_generale"] == 14.5
    assert b[2]["moyenne_generale"] == 11.5


def test_class_average():
    res = compute_class_bulletins(STUDENTS, SUBJECTS, NOTES, "fr")
    assert res["moyenne_classe"] == 13.0
    assert res["effectif"] == 2


def test_general_rank():
    b = _by_id(compute_class_bulletins(STUDENTS, SUBJECTS, NOTES, "fr"))
    assert b[1]["rang_general"] == 1
    assert b[2]["rang_general"] == 2


def test_subject_rank():
    b = _by_id(compute_class_bulletins(STUDENTS, SUBJECTS, NOTES, "fr"))
    maths1 = next(s for s in b[1]["subjects"] if s["matiere_id"] == 100)
    maths2 = next(s for s in b[2]["subjects"] if s["matiere_id"] == 100)
    assert maths1["rang_matiere"] == 1 and maths2["rang_matiere"] == 2
    fr1 = next(s for s in b[1]["subjects"] if s["matiere_id"] == 101)
    fr2 = next(s for s in b[2]["subjects"] if s["matiere_id"] == 101)
    assert fr2["rang_matiere"] == 1 and fr1["rang_matiere"] == 2


def test_special_section_separate():
    b = _by_id(compute_class_bulletins(STUDENTS, SUBJECTS, NOTES, "fr"))
    assert [s["matiere_id"] for s in b[1]["subjects"]] == [100, 101]  # officielles seules
    assert b[1]["special_subjects"][0]["nom"] == "Mandarin"
    assert b[1]["special_subjects"][0]["moyenne"] == 18


def test_missing_note_excluded_from_total():
    notes = [{"eleve_id": 1, "matiere_id": 100, "valeur": 15}]  # pas de note en Français
    b = _by_id(compute_class_bulletins(STUDENTS, SUBJECTS, notes, "fr"))
    assert b[1]["total_coefficient"] == 5      # seul Maths compte
    assert b[1]["moyenne_generale"] == 15
    fr = next(s for s in b[1]["subjects"] if s["matiere_id"] == 101)
    assert fr["moyenne"] is None


def test_two_sequences_average():
    """Moyenne matière = moyenne des deux évaluations (1e + 2e séquence)."""
    subjects = [{"matiere_id": 100, "nom": "Maths", "coefficient": 5, "source": "OFFICIELLE"}]
    notes = [
        {"eleve_id": 1, "matiere_id": 100, "valeur": 16, "type_evaluation": "sequence_1"},
        {"eleve_id": 1, "matiere_id": 100, "valeur": 12, "type_evaluation": "sequence_2"},
    ]
    b = _by_id(compute_class_bulletins([STUDENTS[0]], subjects, notes, "fr"))
    s = b[1]["subjects"][0]
    assert s["seqs"] == [16, 12]          # T1 → séquences 1 & 2
    assert s["moyenne"] == 14            # (16 + 12) / 2
    assert b[1]["moyenne_generale"] == 14


def test_annual_trimester_averages():
    """Bulletin annuel MVP §13 : Moy T1, Moy T2, Moy T3 → moyenne annuelle."""
    subjects = [{"matiere_id": 100, "nom": "Maths", "coefficient": 5, "source": "OFFICIELLE"}]
    notes = [
        {"eleve_id": 1, "matiere_id": 100, "valeur": 16, "type_evaluation": "sequence_1"},
        {"eleve_id": 1, "matiere_id": 100, "valeur": 12, "type_evaluation": "sequence_2"},
        {"eleve_id": 1, "matiere_id": 100, "valeur": 10, "type_evaluation": "sequence_3"},
        {"eleve_id": 1, "matiere_id": 100, "valeur": 14, "type_evaluation": "sequence_4"},
        {"eleve_id": 1, "matiere_id": 100, "valeur": 8, "type_evaluation": "sequence_5"},
        {"eleve_id": 1, "matiere_id": 100, "valeur": 12, "type_evaluation": "sequence_6"},
    ]
    b = _by_id(compute_class_bulletins([STUDENTS[0]], subjects, notes, "en", scope="annual"))
    s = b[1]["subjects"][0]
    assert s["seqs"] == [14, 12, 10]          # moy T1, T2, T3
    assert s["moyenne"] == 12                 # (14 + 12 + 10) / 3
    assert b[1]["moyenne_generale"] == 12


def test_groupe_passthrough():
    """Le groupe de bulletin (second cycle francophone) est porté jusqu'au calcul."""
    subjects = [
        {"matiere_id": 100, "nom": "Mathématiques", "coefficient": 5, "source": "OFFICIELLE", "groupe": 1},
        {"matiere_id": 101, "nom": "Français", "coefficient": 3, "source": "OFFICIELLE", "groupe": 2},
    ]
    b = _by_id(compute_class_bulletins(STUDENTS, subjects, NOTES, "fr"))
    groups = {s["matiere_id"]: s["groupe"] for s in b[1]["subjects"]}
    assert groups == {100: 1, 101: 2}


def test_custom_appreciation_scale():
    """Barème paramétrable MVP §14 : seuils définis par l'école."""
    subjects = [{"matiere_id": 100, "nom": "Maths", "coefficient": 5, "source": "OFFICIELLE"}]
    notes = [{"eleve_id": 1, "matiere_id": 100, "valeur": 19, "type_evaluation": "sequence_1"}]
    custom = {"fr": [{"min": 18, "label": "PARFAIT"}, {"min": 0, "label": "FAIBLE"}]}
    b = _by_id(compute_class_bulletins([STUDENTS[0]], subjects, notes, "fr", appreciation_scales=custom))
    assert b[1]["subjects"][0]["appreciation"] == "PARFAIT"


def test_third_group_inferred_from_name():
    """Sports / Manual Labour → troisième groupe si groupe absent en base."""
    subjects = [
        {"matiere_id": 100, "nom": "MATHEMATICS", "coefficient": 5, "source": "SPECIALE", "groupe": 1},
        {"matiere_id": 101, "nom": "SPORTS", "coefficient": 1, "source": "SPECIALE"},
        {"matiere_id": 102, "nom": "MANUAL LABOUR", "coefficient": 1, "source": "SPECIALE"},
    ]
    notes = [
        {"eleve_id": 1, "matiere_id": 100, "valeur": 12, "type_evaluation": "sequence_1"},
        {"eleve_id": 1, "matiere_id": 101, "valeur": 16, "type_evaluation": "sequence_1"},
        {"eleve_id": 1, "matiere_id": 102, "valeur": 14, "type_evaluation": "sequence_1"},
    ]
    b = _by_id(compute_class_bulletins([STUDENTS[0]], subjects, notes, "en"))[1]
    by_group = {}
    for s in b["subjects"]:
        by_group.setdefault(s["groupe"], []).append(s["nom"])
    assert "SPORTS" in by_group[3]
    assert "MANUAL LABOUR" in by_group[3]
    assert b["total_coefficient"] == 7  # 5 + 1 + 1


def test_lang_and_labels():
    assert lang_for_subsystem("ANGLOPHONE") == "en"
    assert lang_for_subsystem("FRANCOPHONE") == "fr"
    assert decision(14.5, "fr") == "ADMIS(E)"
    assert decision(8, "en") == "FAILED"
    assert appreciation(16, "en") == "A"          # codes officiels EN
    assert appreciation(19, "en") == "EXCELLENT"
    assert appreciation(7, "en") == "CNA"
    assert appreciation(12, "en") == "IPA"
    assert appreciation(None, "fr") == ""
