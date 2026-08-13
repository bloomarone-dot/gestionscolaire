"""Tests eleves-service : inscription, parent obligatoire, matricule, transfert, promotion (§6/§10)."""
import pytest
from pydantic import ValidationError
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from common.db import Base
from app import crud
from app.models import STATUT_DIPLOME, STATUT_INSCRIT
from app.schemas import (
    EleveCreate,
    EleveUpdate,
    ParentIn,
    PromotionApply,
    PromotionItem,
)

TENANT = 1


@pytest.fixture()
def db():
    engine = create_engine("sqlite:///:memory:")
    Base.metadata.create_all(bind=engine)
    session = sessionmaker(bind=engine)()
    yield session
    session.close()


def _make(db, classe_id=10, tenant=TENANT, **kw):
    payload = EleveCreate(
        nom="Eboa", prenom="Marie", level_code="TLE", series_code="C",
        classe_id=classe_id,
        parents=[ParentIn(nom="Eboa Père", phone="690000000")],
        **kw,
    )
    return crud.create_eleve(db, tenant, payload)


def test_matricule_auto_generated(db):
    e = _make(db)
    assert e.matricule  # généré
    assert e.statut == STATUT_INSCRIT
    assert crud.primary_parent_phone(e) == "690000000"


def test_matricule_modifiable(db):
    e = _make(db, matricule="CUSTOM-001")
    assert e.matricule == "CUSTOM-001"


def test_parent_phone_required():
    with pytest.raises(ValidationError):
        ParentIn(nom="X", phone="")


def test_parent_email_optional(db):
    e = _make(db)
    assert e.parents[0].email is None


def test_list_filter_by_classe(db):
    _make(db, classe_id=10)
    _make(db, classe_id=20)
    assert len(crud.list_eleves(db, TENANT, classe_id=10)) == 1
    assert len(crud.list_eleves(db, TENANT)) == 2


def test_transfer_keeps_enrolled(db):
    e = _make(db, classe_id=10)
    moved, old = crud.transfer(db, TENANT, e.id, new_classe_id=20)
    assert old == 10
    assert moved.classe_id == 20
    assert moved.statut == STATUT_INSCRIT


def test_promotion_admis_and_sortant(db):
    a = _make(db, classe_id=10)
    b = _make(db, classe_id=10)
    results = crud.apply_promotion(db, TENANT, PromotionApply(
        source_classe_id=10,
        items=[
            PromotionItem(eleve_id=a.id, status="ADMIS", dest_classe_id=30),
            PromotionItem(eleve_id=b.id, status="SORTANT"),
        ],
    ))
    assert len(results) == 2
    assert crud.get_eleve(db, TENANT, a.id).classe_id == 30
    sortant = crud.get_eleve(db, TENANT, b.id)
    assert sortant.statut == STATUT_DIPLOME
    assert sortant.classe_id is None


def test_promotion_reoriente_changes_series(db):
    e = _make(db, classe_id=10)
    crud.apply_promotion(db, TENANT, PromotionApply(
        source_classe_id=10,
        items=[PromotionItem(eleve_id=e.id, status="REORIENTE", dest_classe_id=40, new_series_code="D")],
    ))
    moved = crud.get_eleve(db, TENANT, e.id)
    assert moved.classe_id == 40
    assert moved.series_code == "D"


def test_promotion_admis_requires_dest(db):
    e = _make(db, classe_id=10)
    with pytest.raises(ValueError):
        crud.apply_promotion(db, TENANT, PromotionApply(
            source_classe_id=10,
            items=[PromotionItem(eleve_id=e.id, status="ADMIS")],
        ))


def test_promotion_admis_updates_level_code(db):
    e = _make(db, classe_id=10)
    e.level_code = "A1"
    db.commit()
    crud.apply_promotion(db, TENANT, PromotionApply(
        source_classe_id=10,
        items=[PromotionItem(
            eleve_id=e.id, status="ADMIS", dest_classe_id=30, new_level_code="A2",
        )],
    ))
    moved = crud.get_eleve(db, TENANT, e.id)
    assert moved.classe_id == 30
    assert moved.level_code == "A2"


def test_tenant_isolation(db):
    e = _make(db, tenant=TENANT)
    assert crud.list_eleves(db, 999) == []
    with pytest.raises(crud.NotFound):
        crud.get_eleve(db, 999, e.id)


def test_reenroll_detects_promotion_4e_to_3e(db):
    e = _make(db, classe_id=10, matricule="EL-4E-001")
    e.level_code = "4E"
    db.commit()
    again, action, prev_level, prev_classe = crud.enroll_eleve(db, TENANT, EleveCreate(
        nom="Eboa", prenom="Marie", matricule="EL-4E-001",
        level_code="3E", classe_id=20,
        parents=[ParentIn(nom="Eboa Père", phone="690000000")],
    ))
    assert action == "PROMOTION"
    assert prev_level == "4E"
    assert prev_classe == 10
    assert again.id == e.id
    assert again.classe_id == 20
    assert again.level_code == "3E"
    assert len(crud.list_eleves(db, TENANT)) == 1


def test_lookup_by_matricule(db):
    e = _make(db, matricule="LOOK-1")
    found = crud.get_eleve_by_matricule(db, TENANT, "LOOK-1")
    assert found.id == e.id
    assert crud.find_existing_eleve(db, TENANT, EleveCreate(
        nom="Autre", matricule="LOOK-1",
        parents=[ParentIn(nom="X", phone="690000001")],
    )).id == e.id


def test_pieces_and_radiation(db):
    from app.models import STATUT_RADIE, MOUVEMENT_RADIATION
    from app.pieces import pieces_complete
    from app.schemas import RadiationIn

    e = _make(db)
    assert pieces_complete(e.pieces) is False
    updated = crud.update_eleve(db, TENANT, e.id, EleveUpdate(pieces={
        "acte_naissance": "recu", "photo": "recu",
        "bulletin_precedent": "recu", "quitus_ancienne_ecole": "recu",
    }))
    assert pieces_complete(updated.pieces) is True
    radié = crud.radier(db, TENANT, e.id, RadiationIn(motif="Transfert Lycée Bilingue"))
    assert radié.statut == STATUT_RADIE
    assert radié.classe_id is None
    moves = crud.list_mouvements(db, TENANT, e.id)
    assert any(m.kind == MOUVEMENT_RADIATION for m in moves)


def test_parent_code_and_login(db):
    e = _make(db)
    phone, pin = crud.generate_parent_code(db, TENANT, e.id)
    assert phone == "690000000"
    assert len(pin) == 6
    access, token = crud.login_parent(db, phone, pin)
    assert access.tenant_id == TENANT
    assert token
    kids = crud.list_eleves_for_parent_phone(db, TENANT, phone)
    assert kids[0].id == e.id


def test_appel_marks_absence(db):
    from datetime import date
    from app.models import PRESENCE_ABSENT
    from app.schemas import AppelIn, PresenceItemIn

    e = _make(db, classe_id=10)
    saved, newly = crud.save_appel(db, TENANT, AppelIn(
        classe_id=10, jour=date(2026, 8, 12),
        items=[PresenceItemIn(eleve_id=e.id, statut="ABSENT")],
    ))
    assert len(saved) == 1
    assert saved[0].statut == PRESENCE_ABSENT
    assert len(newly) == 1
    # Re-sauvegarde : pas de nouvelle notification
    _, newly2 = crud.save_appel(db, TENANT, AppelIn(
        classe_id=10, jour=date(2026, 8, 12),
        items=[PresenceItemIn(eleve_id=e.id, statut="ABSENT")],
    ))
    assert newly2 == []


def test_attestation_pdf_bytes(db):
    from app.pdf_documents import render_attestation_scolarite, render_carte_eleve

    e = _make(db)
    assert render_attestation_scolarite(e, establishment_name="Test School").startswith(b"%PDF")
    assert render_carte_eleve(e, establishment_name="Test School").startswith(b"%PDF")


def test_sanction_and_conseil(db):
    from datetime import date
    from app.pdf_documents import render_conseil_pv_pdf, render_convocation_pdf
    from app.schemas import ConseilCreate, ConseilDecisionsBulk, ConseilDecisionIn, SanctionIn

    e = _make(db, classe_id=10)
    s = crud.create_sanction(db, TENANT, SanctionIn(
        eleve_id=e.id, kind="AVERTISSEMENT", jour=date(2026, 8, 12), motif="Retard répété",
    ), recorded_by=1)
    assert s.kind == "AVERTISSEMENT"
    assert crud.count_sanctions_eleve(db, TENANT, e.id) == 1
    assert render_convocation_pdf(e, motif=s.motif).startswith(b"%PDF")

    session = crud.create_conseil(db, TENANT, ConseilCreate(classe_id=10, trimestre=1), bulletin_by_eleve={
        e.id: {"moyenne": 11.5, "rang": 1, "mention": "Assez Bien"},
    })
    assert len(session.decisions) == 1
    assert session.decisions[0].decision in ("ADMIS", "ADMIS_CONDITIONNEL", "A_DELIBERER")
    updated = crud.update_conseil_decisions(db, TENANT, session.id, ConseilDecisionsBulk(decisions=[
        ConseilDecisionIn(eleve_id=e.id, decision="REDOUBLE", observation="Travail insuffisant"),
    ]))
    assert updated.decisions[0].decision == "REDOUBLE"
    validated = crud.validate_conseil(db, TENANT, session.id)
    assert validated.statut == "VALIDE"
    assert render_conseil_pv_pdf(
        establishment_name="Test", classe_nom="3ème A", trimestre=1, held_on="2026-08-12",
        notes=None, rows=[{"nom": "Marie", "matricule": "X", "rang": 1, "moyenne": "11", "mention": "AB", "decision": "Redouble", "observation": ""}],
    ).startswith(b"%PDF")


def test_exam_candidat(db):
    from app.schemas import ExamCandidatIn, EleveUpdate
    from app.pdf_documents import render_exam_list_pdf

    e = _make(db, classe_id=10)
    e = crud.update_eleve(db, TENANT, e.id, EleveUpdate(level_code="3E"))
    row = crud.upsert_exam_candidat(db, TENANT, ExamCandidatIn(
        eleve_id=e.id, exam_code="BEPC", session_label="2026",
        centre="Lycée Test", numero_table="001",
    ))
    assert row.exam_code == "BEPC"
    listed = crud.list_exam_candidats(db, TENANT, exam_code="BEPC")
    assert len(listed) == 1
    assert render_exam_list_pdf(
        establishment_name="Test", exam_code="BEPC", session_label="2026",
        rows=[{"nom": "Marie", "matricule": "X", "numero_table": "001", "centre": "C", "resultat": "INSCRIT"}],
    ).startswith(b"%PDF")
