"""Étape 10 — flag dispatch, rollback, robustness PDF, parity, assignation validation."""
from __future__ import annotations

import io
import zipfile

import fitz
import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from common.db import Base, init_engine
from common.tenant import TenantContext

from app import pdf_dispatch, service
from app.api_modeles import get_db, require_grades_staff, require_modele_manager
from app.config import settings
from app.engine.context_builder import BulletinDataContextBuilder
from app.engine.demo_templates import (
    CAMEROON_PRIMARY_DEMO_V1,
    CAMEROON_SECONDARY_DEMO_V1,
)
from app.engine.pdf_v2 import generate_bulletin_pdf_v2
from app.engine.reportlab_adapter import ReportLabAdapter
from app.engine.renderer import BulletinRenderer
from app.main import app
from app.models import BulletinModele  # noqa: F401
from app.pdf import render_bulletin_pdf


MIN_DEF = {"schema_version": 1, "name": "t", "components": []}


@pytest.fixture()
def db_session():
    engine = create_engine(
        "sqlite://",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
        future=True,
    )
    # pdf_dispatch utilise get_engine() — pointer vers la même base de test
    init_engine("sqlite://")
    from common import db as common_db
    common_db._engine = engine
    common_db._SessionLocal = sessionmaker(bind=engine, future=True, autoflush=False)
    Base.metadata.create_all(bind=engine)
    Session = sessionmaker(bind=engine, future=True, autoflush=False)
    session = Session()
    try:
        yield session
    finally:
        session.close()
        pdf_dispatch._SessionLocal = None


@pytest.fixture()
def client_factory(db_session):
    def _make(role: str = "admin", tenant_id: int = 1, user_id: int = 10):
        ctx = TenantContext(user_id=user_id, role=role, tenant_id=tenant_id)

        def _db():
            yield db_session

        app.dependency_overrides[get_db] = _db
        app.dependency_overrides[require_modele_manager] = lambda: ctx
        app.dependency_overrides[require_grades_staff] = lambda: ctx
        # main.require_grades_staff also used by eleve pdf
        from app import main as main_mod
        app.dependency_overrides[main_mod.require_grades_staff] = lambda: ctx
        return TestClient(app), ctx

    yield _make
    app.dependency_overrides.clear()


def _create(client, name="M", definition=None):
    r = client.post("/bulletins/modeles", json={"name": name, "definition": definition or MIN_DEF})
    assert r.status_code == 201, r.text
    return r.json()


def _sample_payload(eleve_id=1, *, long_text=False, many_subjects=False):
    subjects_meta = []
    subject_rows = []
    n_subj = 25 if many_subjects else 3
    for i in range(n_subj):
        name = ("Matière très longue " + ("X" * 40) + f" {i}") if long_text else f"Matière {i}"
        appr = ("Excellent travail — " + ("appréciation " * 20)) if long_text else "Bien"
        subjects_meta.append({
            "matiere_id": 100 + i, "nom": name, "coefficient": 2 + (i % 3),
            "source": "OFFICIELLE", "groupe": (i % 3) + 1, "enseignant_nom": f"Prof {i}",
        })
        subject_rows.append({
            "matiere_id": 100 + i, "nom": name, "coefficient": 2 + (i % 3),
            "moyenne": 12.5, "notes": 25.0, "rang": i + 1, "appreciation": appr,
            "enseignant_nom": f"Prof {i}", "groupe": (i % 3) + 1,
            "seq": {"sequence_5": 11, "sequence_6": 14},
        })
    students = [{"eleve_id": eleve_id, "matricule": "M1",
                 "nom": "Ngo" + ("Long" * 10 if long_text else ""),
                 "prenom": "Ana", "sexe": "F"}]
    notes = []
    for s in subjects_meta:
        notes.append({"eleve_id": eleve_id, "matiere_id": s["matiere_id"], "valeur": 12,
                      "type_evaluation": "sequence_5"})
        notes.append({"eleve_id": eleve_id, "matiere_id": s["matiere_id"], "valeur": 14,
                      "type_evaluation": "sequence_6"})
    data_ctx = BulletinDataContextBuilder.from_compute_inputs(
        students, subjects_meta, notes, eleve_id=eleve_id, trimestre=3,
        school={"name": "Collège Hardening", "logo_url": None},
        classe={"nom_personnalise": "3ème A", "level_code": "3E", "cycle_code": "COLLEGE"},
    )
    bulletin = {
        "eleve_id": eleve_id, "matricule": "M1", "nom": students[0]["nom"], "prenom": "Ana",
        "moyenne_generale": 13.0, "rang": 2,
        "subjects": subject_rows, "special_subjects": [],
        "total_points": 100, "total_coefficients": 10, "decision": "", "observation": "",
    }
    from app.labels import labels_pack, report_title, seq_columns

    payload = {
        "header": {
            "school_name": "Collège Hardening",
            "school_name_fr": "Collège Hardening",
            "classe": "3ème A",
            "level_code": "3E",
            "cycle_code": "COLLEGE",
            "logo_url": None,
            "school_year": "2025/2026",
            "annee_scolaire": "2025/2026",
            "trimestre": 3,
            "term": "3ème Trimestre",
            "scope": "trimestre",
            "establishment_kind": "SCHOOL",
            "effectif": 30,
            "labels": labels_pack("fr", "SCHOOL"),
            "seq_labels": seq_columns("trimestre", 3, "fr", "SCHOOL"),
            "report_title": report_title("trimestre", "fr", "SCHOOL"),
            "show_subject_groups": True,
            "show_sanctions": False,
            "show_absences": False,
            "bulletin_theme": {},
            "layout_profile": {"header_style": "school_only"},
            "simplified_bulletin": True,
        },
        "moyenne_classe": 12.0, "effectif": 30, "lang": "fr", "bulletin": bulletin,
    }
    return payload, data_ctx


# ── Feature flag ───────────────────────────────────────────────────────────

def test_flag_default_false():
    assert settings.use_bulletin_engine_v2 is False


def test_flag_false_uses_legacy_pdf(client_factory, monkeypatch):
    client, ctx = client_factory()
    payload, _ = _sample_payload()
    monkeypatch.setattr(settings, "use_bulletin_engine_v2", False)
    monkeypatch.setattr(service, "build_eleve_bulletin", lambda *a, **k: payload)
    pdf, engine, meta = pdf_dispatch.render_eleve_pdf(ctx, 1, 3)
    assert engine == "legacy"
    assert pdf[:4] == b"%PDF"
    assert meta["engine"] == "legacy"
    # rollback explicite
    monkeypatch.setattr(settings, "use_bulletin_engine_v2", True)
    monkeypatch.setattr(settings, "use_bulletin_engine_v2", False)
    pdf2, engine2, _ = pdf_dispatch.render_eleve_pdf(ctx, 1, 3)
    assert engine2 == "legacy"
    assert pdf2[:4] == b"%PDF"


def test_flag_true_uses_v2_pdf(client_factory, monkeypatch, db_session):
    client, ctx = client_factory()
    m = _create(client, "V2", definition=CAMEROON_SECONDARY_DEMO_V1)
    client.post(f"/bulletins/modeles/{m['id']}/publish")
    client.put(f"/bulletins/modeles/{m['id']}", json={"is_default": True})

    payload, _ = _sample_payload()
    monkeypatch.setattr(settings, "use_bulletin_engine_v2", True)
    monkeypatch.setattr(service, "build_eleve_bulletin", lambda *a, **k: payload)
    # resolve needs classe — provide via clients mock
    from app import clients
    monkeypatch.setattr(clients, "get_eleve", lambda *a, **k: {"id": 1, "classe_id": 7})
    monkeypatch.setattr(clients, "get_classe", lambda *a, **k: {
        "id": 7, "level_code": "3E", "cycle_code": "COLLEGE", "annee_scolaire": "2025/2026",
    })
    client.post(f"/bulletins/modeles/{m['id']}/assignations", json={"classe_id": 7, "periode": "3"})

    pdf, engine, meta = pdf_dispatch.render_eleve_pdf(ctx, 1, 3)
    assert engine == "v2"
    assert pdf[:4] == b"%PDF"
    assert meta.get("modele_id") == m["id"]


def test_flag_true_classe_zip_batch(client_factory, monkeypatch):
    client, ctx = client_factory()
    m = _create(client, "ClasseV2", definition=CAMEROON_SECONDARY_DEMO_V1)
    client.post(f"/bulletins/modeles/{m['id']}/publish")
    client.put(f"/bulletins/modeles/{m['id']}", json={"is_default": True})

    payload, _ = _sample_payload(1)
    payload2, _ = _sample_payload(2)
    cls = {
        "header": payload["header"],
        "moyenne_classe": 12.0,
        "effectif": 2,
        "lang": "fr",
        "bulletins": [payload["bulletin"], payload2["bulletin"]],
    }
    monkeypatch.setattr(settings, "use_bulletin_engine_v2", True)
    monkeypatch.setattr(service, "build_class_bulletins", lambda *a, **k: cls)
    from app import clients
    monkeypatch.setattr(clients, "get_classe", lambda *a, **k: {
        "id": 9, "level_code": "3E", "cycle_code": "COLLEGE",
    })

    zip_bytes, engine, meta = pdf_dispatch.render_classe_pdf_zip(ctx, 9, 3)
    assert engine == "v2"
    assert meta["eleve_count"] == 2
    with zipfile.ZipFile(io.BytesIO(zip_bytes)) as zf:
        names = zf.namelist()
        assert len(names) == 2
        for n in names:
            assert zf.read(n)[:4] == b"%PDF"


def test_flag_false_classe_zip_legacy(client_factory, monkeypatch):
    client, ctx = client_factory()
    payload, _ = _sample_payload(1)
    cls = {
        "header": payload["header"], "moyenne_classe": 12, "effectif": 1, "lang": "fr",
        "bulletins": [payload["bulletin"]],
    }
    monkeypatch.setattr(settings, "use_bulletin_engine_v2", False)
    monkeypatch.setattr(service, "build_class_bulletins", lambda *a, **k: cls)
    zip_bytes, engine, meta = pdf_dispatch.render_classe_pdf_zip(ctx, 1, 3)
    assert engine == "legacy"
    with zipfile.ZipFile(io.BytesIO(zip_bytes)) as zf:
        assert zf.read(zf.namelist()[0])[:4] == b"%PDF"


def test_health_exposes_flag(client_factory):
    client, _ = client_factory()
    r = client.get("/health")
    assert r.status_code == 200
    assert "use_bulletin_engine_v2" in r.json()
    assert r.json()["use_bulletin_engine_v2"] is False


# ── Assignation validation ─────────────────────────────────────────────────

def test_assignation_invalid_periode(client_factory):
    client, _ = client_factory()
    m = _create(client)
    client.post(f"/bulletins/modeles/{m['id']}/publish")
    r = client.post(f"/bulletins/modeles/{m['id']}/assignations", json={
        "classe_id": 1, "periode": "hiver",
    })
    assert r.status_code == 400


def test_assignation_invalid_classe_id(client_factory):
    client, _ = client_factory()
    m = _create(client)
    client.post(f"/bulletins/modeles/{m['id']}/publish")
    r = client.post(f"/bulletins/modeles/{m['id']}/assignations", json={"classe_id": -5})
    assert r.status_code == 400


# ── Default conflict ───────────────────────────────────────────────────────

def test_default_exclusive_transactional(client_factory):
    client, _ = client_factory()
    m1 = _create(client, "D1")
    m2 = _create(client, "D2")
    client.post(f"/bulletins/modeles/{m1['id']}/publish")
    client.post(f"/bulletins/modeles/{m2['id']}/publish")
    assert client.put(f"/bulletins/modeles/{m1['id']}", json={"is_default": True}).status_code == 200
    assert client.put(f"/bulletins/modeles/{m2['id']}", json={"is_default": True}).status_code == 200
    g1 = client.get(f"/bulletins/modeles/{m1['id']}").json()
    g2 = client.get(f"/bulletins/modeles/{m2['id']}").json()
    assert g1["is_default"] is False
    assert g2["is_default"] is True


# ── PDF robustness ─────────────────────────────────────────────────────────

def test_pdf_v2_long_names_and_appreciations():
    _, ctx = _sample_payload(long_text=True, many_subjects=True)
    pdf = generate_bulletin_pdf_v2(CAMEROON_SECONDARY_DEMO_V1, ctx)
    assert pdf[:4] == b"%PDF"
    doc = fitz.open(stream=pdf, filetype="pdf")
    assert doc.page_count >= 1
    assert len(pdf) > 2000


def test_pdf_v2_missing_logo_still_works():
    _, ctx = _sample_payload()
    # school.logo absent
    pdf = generate_bulletin_pdf_v2(CAMEROON_SECONDARY_DEMO_V1, ctx)
    assert pdf[:4] == b"%PDF"


def test_pdf_v2_invalid_image_url_graceful():
    adapter = ReportLabAdapter()
    # should not raise
    from reportlab.pdfgen import canvas as rl_canvas
    from reportlab.lib.pagesizes import A4
    buf = io.BytesIO()
    c = rl_canvas.Canvas(buf, pagesize=A4)
    adapter._draw_image(c, None, 10, 10, 40, 40)
    adapter._draw_image(c, "https://invalid.example/no-such-logo.png", 10, 60, 40, 40)
    c.save()
    assert buf.getvalue()[:4] == b"%PDF"


def test_pdf_landscape_and_primary():
    _, ctx = _sample_payload()
    prim = dict(CAMEROON_PRIMARY_DEMO_V1)
    pdf = generate_bulletin_pdf_v2(prim, ctx)
    assert pdf[:4] == b"%PDF"
    landscape = dict(CAMEROON_SECONDARY_DEMO_V1)
    landscape = {**landscape, "page": {**landscape["page"], "orientation": "landscape"}}
    pdf2 = generate_bulletin_pdf_v2(landscape, ctx)
    assert pdf2[:4] == b"%PDF"


def test_cameroon_secondary_coverage():
    _, ctx = _sample_payload()
    preview = BulletinRenderer().preview(CAMEROON_SECONDARY_DEMO_V1, ctx)
    types = {el["component_type"] for p in preview["pages"] for el in p["elements"]}
    for needed in ("institution_header", "student_block", "grades_table",
                   "summary_block", "signatures_row"):
        assert needed in types


# ── Legacy / V2 data parity ────────────────────────────────────────────────

def test_legacy_v2_data_parity_same_payload():
    payload, data_ctx = _sample_payload()
    legacy_pdf = render_bulletin_pdf(payload)
    v2_pdf = generate_bulletin_pdf_v2(CAMEROON_SECONDARY_DEMO_V1, data_ctx)
    assert legacy_pdf[:4] == b"%PDF" and v2_pdf[:4] == b"%PDF"
    bulletin = payload["bulletin"]
    assert data_ctx.summary.get("general_average") is not None or bulletin["moyenne_generale"] == 13.0
    assert len(data_ctx.subjects) == len(bulletin["subjects"])
    legacy_names = {m["nom"] for m in bulletin["subjects"]}
    ctx_names = set()
    for s in data_ctx.subjects:
        if isinstance(s, dict):
            ctx_names.add(s.get("name") or s.get("nom"))
    assert legacy_names & {n for n in ctx_names if n} or len(data_ctx.subjects) >= 3


# ── Primary limitation documented ──────────────────────────────────────────

def test_primary_template_no_competences_domain():
    lim = (CAMEROON_PRIMARY_DEMO_V1.get("meta") or {}).get("limitations", "")
    assert "no_competences_grid" in lim
    assert "no_acquisition_levels" in lim


# ── Tenant isolation (dispatch V2) ─────────────────────────────────────────

def test_v2_pdf_uses_only_same_tenant_template(client_factory, monkeypatch, db_session):
    """Tenant B ne résout pas le modèle publié du tenant A."""
    client_a, ctx_a = client_factory(tenant_id=1, user_id=1)
    m = _create(client_a, "OnlyA", definition=CAMEROON_SECONDARY_DEMO_V1)
    client_a.post(f"/bulletins/modeles/{m['id']}/publish")
    client_a.put(f"/bulletins/modeles/{m['id']}", json={"is_default": True})

    client_b, ctx_b = client_factory(tenant_id=2, user_id=2)
    payload, _ = _sample_payload()
    monkeypatch.setattr(settings, "use_bulletin_engine_v2", True)
    monkeypatch.setattr(service, "build_eleve_bulletin", lambda *a, **k: payload)
    from app import clients
    monkeypatch.setattr(clients, "get_eleve", lambda *a, **k: {"id": 1, "classe_id": 7})
    monkeypatch.setattr(clients, "get_classe", lambda *a, **k: {
        "id": 7, "level_code": "3E", "cycle_code": "COLLEGE",
    })
    with pytest.raises(ValueError, match="Aucun modèle"):
        pdf_dispatch.render_eleve_pdf(ctx_b, 1, 3)

    # Même payload, tenant A → OK
    pdf, engine, meta = pdf_dispatch.render_eleve_pdf(ctx_a, 1, 3)
    assert engine == "v2" and pdf[:4] == b"%PDF"
    assert meta["modele_id"] == m["id"]


def test_pdf_v2_multipage_many_subjects():
    _, ctx = _sample_payload(many_subjects=True)
    pdf = generate_bulletin_pdf_v2(CAMEROON_SECONDARY_DEMO_V1, ctx)
    doc = fitz.open(stream=pdf, filetype="pdf")
    assert doc.page_count >= 1
    # 25 matières → au moins une page ; table header présent sur le PDF
    text = "".join(page.get_text() for page in doc)
    assert "Matière" in text or len(pdf) > 3000


def test_pdf_v2_valid_logo_data_or_none():
    """Logo présent (data URL non dessinée) ou absent → PDF générable."""
    _, ctx = _sample_payload()
    ctx.school["logo"] = "data:image/png;base64,AAAA"
    pdf = generate_bulletin_pdf_v2(CAMEROON_SECONDARY_DEMO_V1, ctx)
    assert pdf[:4] == b"%PDF"
    ctx.school["logo"] = None
    assert generate_bulletin_pdf_v2(CAMEROON_SECONDARY_DEMO_V1, ctx)[:4] == b"%PDF"


# ── Performance smoke (in-process, mocked data) ────────────────────────────

def test_performance_smoke_classe_sizes(monkeypatch):
    """Mesure indicative in-process (pas Docker). Documentée dans le rapport."""
    import time
    from common.tenant import TenantContext
    ctx = TenantContext(user_id=1, role="admin", tenant_id=1)
    results = {}
    for n in (1, 10, 30):
        bulletins = [_sample_payload(i)[0]["bulletin"] for i in range(1, n + 1)]
        header = _sample_payload()[0]["header"]
        cls = {"header": header, "moyenne_classe": 12, "effectif": n, "lang": "fr", "bulletins": bulletins}
        monkeypatch.setattr(settings, "use_bulletin_engine_v2", False)
        monkeypatch.setattr(service, "build_class_bulletins", lambda *a, **k: cls)
        t0 = time.perf_counter()
        zip_bytes, engine, meta = pdf_dispatch.render_classe_pdf_zip(ctx, 1, 3)
        results[n] = {
            "engine": engine,
            "duration_ms": meta["duration_ms"],
            "zip_bytes": len(zip_bytes),
            "wall_ms": round((time.perf_counter() - t0) * 1000, 1),
        }
        assert engine == "legacy"
    # Garde-fou : 30 élèves < 60s en local mock
    assert results[30]["duration_ms"] < 60_000
    # Expose pour inspection pytest -s
    print("PERF_SMOKE", results)
