"""eleves-service — inscriptions (§6), transferts (§6.3), promotions (§10)."""
import re

from fastapi import Depends, FastAPI, File, HTTPException, UploadFile, status
from fastapi.responses import Response
from sqlalchemy.orm import Session, sessionmaker

from common.db import Base, add_missing_columns, get_engine, init_engine
from common.events import EventNames, EventPublisher
from common.tenant import TenantContext, require_tenant

from app import crud, import_export, pedagogie_client
from app.config import settings
from app.models import Eleve
from app.schemas import (
    EleveCreate,
    EleveDetail,
    EleveImportResult,
    EleveRow,
    EleveUpdate,
    ParentOut,
    PromotionApply,
    TransferIn,
)

app = FastAPI(title="eleves-service — SaaS Scolaire", version="0.1.0")

_SessionLocal = None
_publisher: EventPublisher | None = None


@app.on_event("startup")
def _startup() -> None:
    global _SessionLocal, _publisher
    init_engine(settings.database_url)
    Base.metadata.create_all(bind=get_engine())  # Alembic en Phase 5
    add_missing_columns("eleves", {"etat_sante": "TEXT"})
    _SessionLocal = sessionmaker(bind=get_engine(), future=True)
    _publisher = EventPublisher(settings.rabbitmq_url, settings.events_exchange)


def get_db() -> Session:
    db = _SessionLocal()
    try:
        yield db
    finally:
        db.close()


def _emit(event: str, data: dict) -> None:
    if _publisher is not None:
        _publisher.publish(event, data)


def _row(e: Eleve) -> EleveRow:
    return EleveRow(
        id=e.id, matricule=e.matricule, nom=e.nom, prenom=e.prenom,
        classe_id=e.classe_id, sexe=e.sexe,
        contact_parent=crud.primary_parent_phone(e), statut=e.statut,
    )


def _detail(e: Eleve) -> EleveDetail:
    return EleveDetail(
        **_row(e).model_dump(), date_naissance=e.date_naissance,
        lieu_naissance=e.lieu_naissance, photo_url=e.photo_url,
        etat_sante=e.etat_sante,
        subsystem_code=e.subsystem_code,
        type_code=e.type_code, level_code=e.level_code, series_code=e.series_code,
        created_at=e.created_at,
        parents=[ParentOut.model_validate(p) for p in e.parents],
    )


@app.get("/health", tags=["infra"])
def health() -> dict:
    return {"status": "ok", "service": "eleves-service"}


# ════════════════════════════════ ÉLÈVES ═════════════════════════════════════
@app.post("/eleves", response_model=EleveDetail, status_code=status.HTTP_201_CREATED, tags=["eleves"])
def create_eleve(
    payload: EleveCreate,
    db: Session = Depends(get_db),
    ctx: TenantContext = Depends(require_tenant),
):
    eleve = crud.create_eleve(db, ctx.tenant_id, payload)
    if eleve.classe_id:
        # §12 : notifie le parent (SMS + notif). Best-effort, jamais bloquant.
        _emit(EventNames.STUDENT_ENROLLED, {
            "tenant_id": ctx.tenant_id, "eleve_id": eleve.id,
            "classe_id": eleve.classe_id, "nom": eleve.nom, "prenom": eleve.prenom,
            "parent_phone": crud.primary_parent_phone(eleve),
        })
    return _detail(eleve)


@app.get("/eleves", response_model=list[EleveRow], tags=["eleves"])
def list_eleves(
    classe_id: int | None = None,
    db: Session = Depends(get_db),
    ctx: TenantContext = Depends(require_tenant),
):
    return [_row(e) for e in crud.list_eleves(db, ctx.tenant_id, classe_id)]


@app.get("/eleves/import/template.xlsx", tags=["eleves"])
def download_import_template(
    classe_id: int | None = None,
    ctx: TenantContext = Depends(require_tenant),
):
    """Modèle Excel — avec ``classe_id`` : liste sans colonne Classe (un fichier = une classe)."""
    classe_nom = section = None
    filename = "modele_import_eleves.xlsx"
    if classe_id is not None:
        classes = pedagogie_client.list_classes(ctx)
        classe = pedagogie_client.find_class(classes, classe_id)
        if not classe:
            raise HTTPException(status.HTTP_404_NOT_FOUND, "Classe introuvable")
        classe_nom = classe.get("nom_personnalise") or classe.get("nom") or str(classe_id)
        section = pedagogie_client.section_label(classe.get("subsystem_code"))
        safe = re.sub(r"[^\w\-]+", "_", classe_nom.strip())[:40]
        filename = f"modele_eleves_{safe}.xlsx"
    try:
        content = import_export.build_template_xlsx(classe_nom=classe_nom, section=section)
    except ImportError:
        raise HTTPException(status.HTTP_501_NOT_FOUND, "openpyxl requis pour le modèle Excel")
    return Response(
        content=content,
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )


@app.post("/eleves/import", response_model=EleveImportResult, tags=["eleves"])
async def import_eleves(
    file: UploadFile = File(...),
    classe_id: int | None = None,
    default_classe_id: int | None = None,
    db: Session = Depends(get_db),
    ctx: TenantContext = Depends(require_tenant),
):
    """Importe une liste d'élèves (.xlsx ou .csv) pour une classe donnée.

    Un fichier = une classe : ``classe_id`` (ou ``default_classe_id``) est requis.
    La section (francophone / anglophone) est déduite automatiquement de la classe.
    """
    target_id = classe_id or default_classe_id
    if not target_id:
        raise HTTPException(
            status.HTTP_400_BAD_REQUEST,
            "Classe requise — sélectionnez la classe du fichier (ex. Form 4, Terminal A)",
        )
    if not file.filename:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "Fichier requis")
    lower = file.filename.lower()
    if not lower.endswith((".xlsx", ".xls", ".csv")):
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "Format accepté : .xlsx ou .csv")

    classes = pedagogie_client.list_classes(ctx)
    classe = pedagogie_client.find_class(classes, target_id)
    if not classe:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Classe introuvable")

    content = await file.read()
    try:
        rows = import_export.read_tabular_rows(content, file.filename)
    except Exception as exc:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, f"Fichier illisible : {exc}") from exc

    lookup = pedagogie_client.class_name_lookup(classes)
    result = import_export.import_rows(
        db, ctx.tenant_id, rows,
        force_classe_id=target_id,
        classe_lookup=lookup,
    )
    classe_nom = classe.get("nom_personnalise") or classe.get("nom") or str(target_id)
    section = pedagogie_client.section_label(classe.get("subsystem_code"))
    return EleveImportResult(
        **result,
        classe_id=target_id,
        classe_nom=classe_nom,
        section=section,
    )


@app.get("/eleves/export.xlsx", tags=["eleves"])
def export_eleves_xlsx(
    classe_id: int | None = None,
    db: Session = Depends(get_db),
    ctx: TenantContext = Depends(require_tenant),
):
    """Exporte la liste des élèves en Excel."""
    eleves = crud.list_eleves(db, ctx.tenant_id, classe_id)
    classes = pedagogie_client.list_classes(ctx)
    names = pedagogie_client.class_id_to_name(classes)
    rows = import_export.export_rows(eleves, names)
    try:
        content = import_export.rows_to_xlsx(rows)
    except ImportError:
        raise HTTPException(status.HTTP_501_NOT_FOUND, "openpyxl requis pour l'export Excel")
    suffix = f"_classe_{classe_id}" if classe_id else ""
    return Response(
        content=content,
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={"Content-Disposition": f'attachment; filename="eleves{suffix}.xlsx"'},
    )


@app.get("/eleves/export.csv", tags=["eleves"])
def export_eleves_csv(
    classe_id: int | None = None,
    db: Session = Depends(get_db),
    ctx: TenantContext = Depends(require_tenant),
):
    """Exporte la liste des élèves en CSV."""
    eleves = crud.list_eleves(db, ctx.tenant_id, classe_id)
    classes = pedagogie_client.list_classes(ctx)
    names = pedagogie_client.class_id_to_name(classes)
    rows = import_export.export_rows(eleves, names)
    content = import_export.rows_to_csv(rows)
    suffix = f"_classe_{classe_id}" if classe_id else ""
    return Response(
        content=content,
        media_type="text/csv; charset=utf-8",
        headers={"Content-Disposition": f'attachment; filename="eleves{suffix}.csv"'},
    )


@app.get("/eleves/{eleve_id}", response_model=EleveDetail, tags=["eleves"])
def get_eleve(eleve_id: int, db: Session = Depends(get_db), ctx: TenantContext = Depends(require_tenant)):
    try:
        return _detail(crud.get_eleve(db, ctx.tenant_id, eleve_id))
    except crud.NotFound as e:
        raise HTTPException(status.HTTP_404_NOT_FOUND, str(e))


@app.put("/eleves/{eleve_id}", response_model=EleveDetail, tags=["eleves"])
def update_eleve(
    eleve_id: int,
    payload: EleveUpdate,
    db: Session = Depends(get_db),
    ctx: TenantContext = Depends(require_tenant),
):
    try:
        return _detail(crud.update_eleve(db, ctx.tenant_id, eleve_id, payload))
    except crud.NotFound as e:
        raise HTTPException(status.HTTP_404_NOT_FOUND, str(e))


@app.delete("/eleves/{eleve_id}", status_code=status.HTTP_204_NO_CONTENT, tags=["eleves"])
def delete_eleve(eleve_id: int, db: Session = Depends(get_db), ctx: TenantContext = Depends(require_tenant)):
    try:
        crud.delete_eleve(db, ctx.tenant_id, eleve_id)
    except crud.NotFound as e:
        raise HTTPException(status.HTTP_404_NOT_FOUND, str(e))


@app.get("/eleves/{eleve_id}/matieres", tags=["eleves"])
def inherited_subjects(
    eleve_id: int,
    db: Session = Depends(get_db),
    ctx: TenantContext = Depends(require_tenant),
):
    """Matières héritées de la classe de l'élève (§6.2) — dérivées, non dupliquées."""
    try:
        eleve = crud.get_eleve(db, ctx.tenant_id, eleve_id)
    except crud.NotFound as e:
        raise HTTPException(status.HTTP_404_NOT_FOUND, str(e))
    if not eleve.classe_id:
        return []
    return pedagogie_client.class_activated_subjects(ctx, eleve.classe_id)


# ════════════════════════════ TRANSFERT (§6.3) ═══════════════════════════════
@app.post("/eleves/{eleve_id}/transfer", response_model=EleveDetail, tags=["transfert"])
def transfer_eleve(
    eleve_id: int,
    payload: TransferIn,
    db: Session = Depends(get_db),
    ctx: TenantContext = Depends(require_tenant),
):
    try:
        eleve, old = crud.transfer(db, ctx.tenant_id, eleve_id, payload.new_classe_id)
    except crud.NotFound as e:
        raise HTTPException(status.HTTP_404_NOT_FOUND, str(e))
    _emit(EventNames.STUDENT_TRANSFERRED, {
        "tenant_id": ctx.tenant_id, "eleve_id": eleve.id,
        "old_classe_id": old, "new_classe_id": eleve.classe_id,
        "nom": eleve.nom, "prenom": eleve.prenom,
        "parent_phone": crud.primary_parent_phone(eleve),
    })
    return _detail(eleve)


# ═══════════════════════════ PROMOTIONS (§10) ═════════════════════════════════
@app.post("/eleves/promotions/apply", tags=["promotions"])
def apply_promotion(
    payload: PromotionApply,
    db: Session = Depends(get_db),
    ctx: TenantContext = Depends(require_tenant),
):
    try:
        results = crud.apply_promotion(db, ctx.tenant_id, payload)
    except crud.NotFound as e:
        raise HTTPException(status.HTTP_404_NOT_FOUND, str(e))
    except ValueError as e:
        raise HTTPException(status.HTTP_422_UNPROCESSABLE_ENTITY, str(e))
    for r in results:
        _emit(EventNames.STUDENT_PROMOTED, {"tenant_id": ctx.tenant_id, **r})
    return {"applied": len(results), "results": results}
