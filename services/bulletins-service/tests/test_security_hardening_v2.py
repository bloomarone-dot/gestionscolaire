"""Sécurité V2 — SSRF images, LFI, ZIP names, immutabilité versions."""
from __future__ import annotations

import io
import zipfile

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from common.db import Base, init_engine
from common.tenant import TenantContext

from app import crud_modeles as crud
from app import pdf_dispatch, service
from app.api_modeles import get_db, require_grades_staff, require_modele_manager
from app.config import settings
from app.engine.demo_templates import CAMEROON_SECONDARY_DEMO_V1
from app.engine.safe_image import (
    SafeImageError,
    fetch_image_bytes,
    load_image_for_pdf,
    validate_image_url,
)
from app.main import app
from app.models import BulletinModele  # noqa: F401


MIN_DEF = {"schema_version": 1, "name": "t", "components": []}


@pytest.fixture()
def db_session():
    engine = create_engine(
        "sqlite://",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
        future=True,
    )
    init_engine("sqlite://")
    from common import db as common_db
    common_db._engine = engine
    common_db._SessionLocal = sessionmaker(bind=engine, future=True, autoflush=False)
    Base.metadata.create_all(bind=engine)
    crud.ensure_bulletin_schema(engine)
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
        from app import main as main_mod
        app.dependency_overrides[main_mod.require_grades_staff] = lambda: ctx
        return TestClient(app), ctx

    yield _make
    app.dependency_overrides.clear()


def _create(client, name="M", definition=None):
    r = client.post("/bulletins/modeles", json={"name": name, "definition": definition or MIN_DEF})
    assert r.status_code == 201, r.text
    return r.json()


# ── SSRF / LFI ─────────────────────────────────────────────────────────────

@pytest.mark.parametrize("url", [
    "http://127.0.0.1/",
    "http://127.0.0.1:8080/x",
    "http://localhost/secret",
    "http://[::1]/",
    "http://0.0.0.0/",
    "http://169.254.169.254/latest/meta-data/",
    "http://10.0.0.5/",
    "http://172.16.1.1/",
    "http://192.168.1.1/",
    "file:///etc/passwd",
    "ftp://example.com/a.png",
])
def test_validate_image_url_blocks_dangerous(url):
    with pytest.raises(SafeImageError):
        validate_image_url(url)


def test_validate_image_url_allows_public_https(monkeypatch):
    monkeypatch.setattr(
        "app.engine.safe_image._resolve_host_ips",
        lambda host: [__import__("ipaddress").ip_address("93.184.216.34")],
    )
    assert validate_image_url("https://example.com/logo.png").startswith("https://")


def test_load_image_rejects_local_paths():
    assert load_image_for_pdf("/etc/passwd") is None
    assert load_image_for_pdf("C:\\Windows\\System32\\config\\SAM") is None
    assert load_image_for_pdf("../secret.png") is None
    assert load_image_for_pdf("../../etc/passwd") is None
    assert load_image_for_pdf("file:///etc/passwd") is None
    assert load_image_for_pdf("data:image/png;base64,AAAA") is None


def test_fetch_rejects_oversized(monkeypatch):
    class FakeResp:
        def read(self, n=-1):
            return b"x" * (64 * 1024)
        def geturl(self):
            return "https://cdn.example.com/big.png"
        def __enter__(self):
            return self
        def __exit__(self, *a):
            return False

    class FakeOpener:
        def open(self, req, timeout=None):
            return FakeResp()

    monkeypatch.setattr(
        "app.engine.safe_image._resolve_host_ips",
        lambda host: [__import__("ipaddress").ip_address("93.184.216.34")],
    )
    monkeypatch.setattr("app.engine.safe_image.build_opener", lambda *a, **k: FakeOpener())
    with pytest.raises(SafeImageError, match="volumineuse"):
        fetch_image_bytes("https://cdn.example.com/big.png")


def test_draw_image_local_path_does_not_raise():
    from reportlab.pdfgen import canvas as rl_canvas
    from reportlab.lib.pagesizes import A4
    from app.engine.reportlab_adapter import ReportLabAdapter
    buf = io.BytesIO()
    c = rl_canvas.Canvas(buf, pagesize=A4)
    adapter = ReportLabAdapter()
    adapter._draw_image(c, "/etc/passwd", 10, 10, 40, 40)
    adapter._draw_image(c, "http://127.0.0.1/x", 10, 60, 40, 40)
    c.save()
    assert buf.getvalue()[:4] == b"%PDF"


# ── ZIP sanitizer ──────────────────────────────────────────────────────────

def test_sanitize_zip_entry_name_traversal():
    assert ".." not in crud.sanitize_zip_entry_name(1, "../../../evil.pdf")
    assert "/" not in crud.sanitize_zip_entry_name(1, "../../../evil.pdf")
    assert "\\" not in crud.sanitize_zip_entry_name(1, "..\\..\\evil.pdf")
    name = crud.sanitize_zip_entry_name(9, "élève-Émilie/2024")
    assert name.startswith("bulletin_9_")
    assert name.endswith(".pdf")
    assert "/" not in name
    long = crud.sanitize_zip_entry_name(3, "A" * 200)
    assert len(long) < 100


def test_classe_zip_uses_safe_names(monkeypatch):
    from common.tenant import TenantContext
    ctx = TenantContext(user_id=1, role="admin", tenant_id=1)
    cls = {
        "header": {},
        "moyenne_classe": 12, "effectif": 1, "lang": "fr",
        "bulletins": [{
            "eleve_id": 1, "matricule": "../../../evil", "nom": "A", "prenom": "B",
            "moyenne_generale": 10, "rang": 1, "subjects": [], "special_subjects": [],
            "total_points": 0, "total_coefficients": 0,
        }],
    }
    monkeypatch.setattr(settings, "use_bulletin_engine_v2", False)
    monkeypatch.setattr(service, "build_class_bulletins", lambda *a, **k: cls)
    import app.pdf_dispatch as pd
    monkeypatch.setattr(pd, "render_bulletin_pdf", lambda p: b"%PDF-1.4 mock")
    zip_bytes, engine, meta = pd.render_classe_pdf_zip(ctx, 1, 1)
    with zipfile.ZipFile(io.BytesIO(zip_bytes)) as zf:
        names = zf.namelist()
        assert len(names) == 1
        assert ".." not in names[0]
        assert "/" not in names[0].replace("bulletin_", "")
        assert names[0].endswith(".pdf")
        assert "evil" in names[0]

# ── Version immutability ───────────────────────────────────────────────────

def test_historical_published_version_immutable(client_factory):
    client, _ = client_factory()
    m = _create(client, "Hist", definition=CAMEROON_SECONDARY_DEMO_V1)
    assert client.post(f"/bulletins/modeles/{m['id']}/publish").status_code == 200
    v1_id = client.get(f"/bulletins/modeles/{m['id']}").json()["current_version"]["id"]
    # Nouvelle version
    r = client.post(
        f"/bulletins/modeles/{m['id']}/versions",
        json={"definition": CAMEROON_SECONDARY_DEMO_V1, "notes": "v2"},
    )
    assert r.status_code == 201, r.text
    v2_id = r.json()["id"]
    # v1 (anciennement publiée) ne peut plus être modifiée
    bad = client.put(
        f"/bulletins/modeles/{m['id']}/versions/{v1_id}",
        json={"definition": {**CAMEROON_SECONDARY_DEMO_V1, "name": "hacked"}},
    )
    assert bad.status_code == 409
    # Publier v2 puis tenter de modifier v2
    assert client.post(f"/bulletins/modeles/{m['id']}/publish?version_id={v2_id}").status_code == 200
    bad2 = client.put(
        f"/bulletins/modeles/{m['id']}/versions/{v2_id}",
        json={"definition": {**CAMEROON_SECONDARY_DEMO_V1, "name": "hacked2"}},
    )
    assert bad2.status_code == 409


def test_default_unique_index_enforced(client_factory, db_session):
    client, _ = client_factory()
    m1 = _create(client, "D1")
    m2 = _create(client, "D2")
    client.post(f"/bulletins/modeles/{m1['id']}/publish")
    client.post(f"/bulletins/modeles/{m2['id']}/publish")
    assert client.put(f"/bulletins/modeles/{m1['id']}", json={"is_default": True}).status_code == 200
    assert client.put(f"/bulletins/modeles/{m2['id']}", json={"is_default": True}).status_code == 200
    # Un seul default actif
    rows = list(db_session.execute(
        text("SELECT id FROM bulletin_modeles WHERE is_default = 1 AND tenant_id = 1")
    ).fetchall())
    assert len(rows) == 1
    assert rows[0][0] == m2["id"]
