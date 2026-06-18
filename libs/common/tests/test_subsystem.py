from common.subsystem import infer_subsystem_from_text, resolve_subsystem_code


def test_infer_anglophone_from_form():
    assert infer_subsystem_from_text("Form 1") == "ANGLOPHONE"
    assert infer_subsystem_from_text("form 5 sciences") == "ANGLOPHONE"


def test_infer_francophone_from_name():
    assert infer_subsystem_from_text("1ère A4") == "FRANCOPHONE"
    assert infer_subsystem_from_text("6ème") == "FRANCOPHONE"
    assert infer_subsystem_from_text("Francophone") == "FRANCOPHONE"


def test_resolve_from_class_name_without_code():
    assert resolve_subsystem_code({"nom_personnalise": "Form 2"}) == "ANGLOPHONE"
    assert resolve_subsystem_code({"name": "1ere A4"}) == "FRANCOPHONE"
    assert resolve_subsystem_code({"subsystem_code": "ANGLOPHONE"}) == "ANGLOPHONE"
