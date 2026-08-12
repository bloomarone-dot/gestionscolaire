"""eleves-service — inscriptions (§6), transferts (§6.3), promotions (§10)."""
import logging
import re

from fastapi import Depends, FastAPI, File, HTTPException, UploadFile, status
from fastapi.responses import Response
from sqlalchemy.orm import Session, sessionmaker

from common.db import Base, add_missing_columns, get_engine, init_engine
from common.events import EventNames, EventPublisher
from common.http_client import InternalClient
from common.roles import PARENT
from common.tenant import TenantContext, require_tenant

from app import crud, import_export, pedagogie_client
from app.config import settings
from app.models import STATUT_DIPLOME, STATUT_INSCRIT, STATUT_RADIE, Eleve
from app.pdf_documents import (
    render_attestation_radiation,
    render_attestation_reussite,
    render_attestation_scolarite,
    render_carte_eleve,
)
from app.pieces import parse_pieces, pieces_complete
from app.schemas import (
    AppelIn,
    EleveCreate,
    EleveDetail,
    EleveImportResult,
    EleveRow,
    EleveUpdate,
    MouvementOut,
    ParentChildOut,
    ParentCodeOut,
    ParentDashboardOut,
    ParentLoginIn,
    ParentLoginOut,
    ParentOut,
    PresenceOut,
    PromotionApply,
    RadiationIn,
    TransferIn,
)

app = FastAPI(title="eleves-service — SaaS Scolaire", version="0.1.0")

logger = logging.getLogger(__name__)
_SessionLocal = None
_publisher: EventPublisher | None = None
_tresorerie = InternalClient(settings.tresorerie_service_url, settings.internal_shared_secret)


@app.on_event("startup")
def _startup() -> None:
    global _SessionLocal, _publisher
    init_engine(settings.database_url)
    Base.metadata.create_all(bind=get_engine())  # Alembic en Phase 5
    add_missing_columns("eleves", {"etat_sante": "TEXT", "pieces": "TEXT"})
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
        pieces_complets=pieces_complete(e.pieces),
    )


def _detail(
    e: Eleve,
    enrollment_action: str | None = None,
    previous_level_code: str | None = None,
    previous_classe_id: int | None = None,
) -> EleveDetail:
    return EleveDetail(
        **_row(e).model_dump(), date_naissance=e.date_naissance,
        lieu_naissance=e.lieu_naissance, photo_url=e.photo_url,
        etat_sante=e.etat_sante,
        subsystem_code=e.subsystem_code,
        type_code=e.type_code, level_code=e.level_code, series_code=e.series_code,
        created_at=e.created_at,
        parents=[ParentOut.model_validate(p) for p in e.parents],
        enrollment_action=enrollment_action,
        previous_level_code=previous_level_code,
        previous_classe_id=previous_classe_id,
        pieces=parse_pieces(e.pieces),
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
    eleve, action, prev_level, prev_classe = crud.enroll_eleve(db, ctx.tenant_id, payload)
    if eleve.classe_id:
        # §12 : notifie le parent (SMS + notif). Best-effort, jamais bloquant.
        event = EventNames.STUDENT_ENROLLED
        if action == "PROMOTION":
            event = EventNames.STUDENT_PROMOTED
        elif action in ("TRANSFER", "REDOUBLE", "DOWNGRADE"):
            event = EventNames.STUDENT_TRANSFERRED
        _emit(event, {
            "tenant_id": ctx.tenant_id, "eleve_id": eleve.id,
            "classe_id": eleve.classe_id, "nom": eleve.nom, "prenom": eleve.prenom,
            "parent_phone": crud.primary_parent_phone(eleve),
            "new_classe_id": eleve.classe_id,
            "old_classe_id": prev_classe,
        })
    return _detail(eleve, enrollment_action=action, previous_level_code=prev_level, previous_classe_id=prev_classe)


@app.get("/eleves/lookup", response_model=EleveDetail | None, tags=["eleves"])
def lookup_eleve(
    matricule: str | None = None,
    nom: str | None = None,
    prenom: str | None = None,
    db: Session = Depends(get_db),
    ctx: TenantContext = Depends(require_tenant),
):
    """Retrouve un élève déjà connu (réinscription / passage de classe)."""
    found = None
    if matricule:
        found = crud.get_eleve_by_matricule(db, ctx.tenant_id, matricule)
    if found is None and nom:
        found = crud.find_existing_eleve(
            db, ctx.tenant_id, EleveCreate(nom=nom, prenom=prenom, matricule=matricule),
        )
    if not found:
        return None
    return _detail(found)


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


def _classe_names(ctx: TenantContext) -> dict[int, str]:
    try:
        return pedagogie_client.class_id_to_name(pedagogie_client.list_classes(ctx))
    except Exception:
        return {}


def _pension_summary(ctx: TenantContext, eleve: Eleve) -> dict | None:
    try:
        staff_ctx = TenantContext(user_id=ctx.user_id, role="admin", tenant_id=ctx.tenant_id)
        params = {"classe_id": eleve.classe_id} if eleve.classe_id else None
        return _tresorerie.get(f"/tresorerie/pension/{eleve.id}/resume", ctx=staff_ctx, params=params)
    except Exception as exc:
        logger.warning("Résumé pension élève %s indisponible : %s", eleve.id, exc)
        return None


def _pdf_response(content: bytes, filename: str) -> Response:
    return Response(
        content=content,
        media_type="application/pdf",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )


def _last_radiation_motif(db, tenant_id: int, eleve_id: int) -> str | None:
    rows = crud.list_mouvements(db, tenant_id, eleve_id)
    for row in rows:
        if row.kind == "RADIATION":
            return row.motif
    return None


# ═══════════════════════ ESPACE PARENT (public + JWT) ════════════════════════
@app.post("/eleves/public/parent/login", response_model=ParentLoginOut, tags=["parent"])
def parent_login(payload: ParentLoginIn, db: Session = Depends(get_db)):
    try:
        access, token = crud.login_parent(db, payload.phone, payload.pin)
    except crud.AuthError as e:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, str(e))
    return ParentLoginOut(access_token=token, phone=access.phone)


@app.get("/eleves/parent/dashboard", response_model=ParentDashboardOut, tags=["parent"])
def parent_dashboard(db: Session = Depends(get_db), ctx: TenantContext = Depends(require_tenant)):
    if ctx.role != PARENT:
        raise HTTPException(status.HTTP_403_FORBIDDEN, "Espace réservé aux parents.")
    try:
        access = crud.get_parent_access(db, ctx.tenant_id, ctx.user_id)
    except crud.NotFound as e:
        raise HTTPException(status.HTTP_404_NOT_FOUND, str(e))
    names = _classe_names(ctx)
    enfants = []
    for eleve in crud.list_eleves_for_parent_phone(db, ctx.tenant_id, access.phone):
        enfants.append(ParentChildOut(
            id=eleve.id,
            matricule=eleve.matricule,
            nom=eleve.nom,
            prenom=eleve.prenom,
            classe_id=eleve.classe_id,
            classe_nom=names.get(eleve.classe_id) if eleve.classe_id else None,
            statut=eleve.statut,
            pieces=parse_pieces(eleve.pieces),
            pieces_complets=pieces_complete(eleve.pieces),
            pension=_pension_summary(ctx, eleve),
            absences=[PresenceOut.model_validate(p) for p in crud.list_absences_eleve(db, ctx.tenant_id, eleve.id)],
            mouvements=[MouvementOut.model_validate(m) for m in crud.list_mouvements(db, ctx.tenant_id, eleve.id)[:8]],
        ))
    return ParentDashboardOut(phone=access.phone, enfants=enfants)


@app.get("/eleves/presences", response_model=list[PresenceOut], tags=["presences"])
def list_presences(
    classe_id: int,
    jour: str,
    db: Session = Depends(get_db),
    ctx: TenantContext = Depends(require_tenant),
):
    from datetime import date as date_cls
    try:
        parsed = date_cls.fromisoformat(jour)
    except ValueError:
        raise HTTPException(status.HTTP_422_UNPROCESSABLE_ENTITY, "Date invalide (AAAA-MM-JJ).")
    return crud.list_presences(db, ctx.tenant_id, classe_id, parsed)


@app.post("/eleves/presences/appel", response_model=list[PresenceOut], tags=["presences"])
def save_appel(
    payload: AppelIn,
    db: Session = Depends(get_db),
    ctx: TenantContext = Depends(require_tenant),
):
    try:
        saved, newly_absent = crud.save_appel(db, ctx.tenant_id, payload)
    except crud.NotFound as e:
        raise HTTPException(status.HTTP_404_NOT_FOUND, str(e))
    except ValueError as e:
        raise HTTPException(status.HTTP_422_UNPROCESSABLE_ENTITY, str(e))
    for row in newly_absent:
        try:
            eleve = crud.get_eleve(db, ctx.tenant_id, row.eleve_id)
        except crud.NotFound:
            continue
        _emit(EventNames.STUDENT_ABSENT, {
            "tenant_id": ctx.tenant_id,
            "eleve_id": eleve.id,
            "nom": eleve.nom,
            "prenom": eleve.prenom,
            "classe_id": row.classe_id,
            "jour": str(row.jour),
            "parent_phone": crud.primary_parent_phone(eleve),
        })
    return saved


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


@app.post("/eleves/{eleve_id}/radier", response_model=EleveDetail, tags=["dossier"])
def radier_eleve(
    eleve_id: int,
    payload: RadiationIn,
    db: Session = Depends(get_db),
    ctx: TenantContext = Depends(require_tenant),
):
    try:
        eleve = crud.radier(db, ctx.tenant_id, eleve_id, payload)
    except crud.NotFound as e:
        raise HTTPException(status.HTTP_404_NOT_FOUND, str(e))
    _emit(EventNames.STUDENT_TRANSFERRED, {
        "tenant_id": ctx.tenant_id, "eleve_id": eleve.id,
        "nom": eleve.nom, "prenom": eleve.prenom,
        "parent_phone": crud.primary_parent_phone(eleve),
        "new_classe_id": None,
        "old_classe_id": None,
        "motif": payload.motif,
    })
    return _detail(eleve)


@app.get("/eleves/{eleve_id}/mouvements", response_model=list[MouvementOut], tags=["dossier"])
def eleve_mouvements(
    eleve_id: int,
    db: Session = Depends(get_db),
    ctx: TenantContext = Depends(require_tenant),
):
    try:
        return crud.list_mouvements(db, ctx.tenant_id, eleve_id)
    except crud.NotFound as e:
        raise HTTPException(status.HTTP_404_NOT_FOUND, str(e))


@app.post("/eleves/{eleve_id}/parent-code", response_model=ParentCodeOut, tags=["parent"])
def generate_parent_code(
    eleve_id: int,
    db: Session = Depends(get_db),
    ctx: TenantContext = Depends(require_tenant),
):
    try:
        phone, pin = crud.generate_parent_code(db, ctx.tenant_id, eleve_id)
    except crud.NotFound as e:
        raise HTTPException(status.HTTP_404_NOT_FOUND, str(e))
    except ValueError as e:
        raise HTTPException(status.HTTP_422_UNPROCESSABLE_ENTITY, str(e))
    eleve = crud.get_eleve(db, ctx.tenant_id, eleve_id)
    _emit(EventNames.PARENT_PIN_ISSUED, {
        "tenant_id": ctx.tenant_id,
        "eleve_id": eleve.id,
        "nom": eleve.nom,
        "prenom": eleve.prenom,
        "parent_phone": phone,
        "pin": pin,
    })
    return ParentCodeOut(
        phone=phone,
        pin=pin,
        message="Communiquez ce code au parent. Il ne sera plus réaffiché.",
    )


@app.get("/eleves/{eleve_id}/attestations/scolarite.pdf", tags=["dossier"])
def attestation_scolarite(
    eleve_id: int,
    establishment_name: str = "Établissement",
    db: Session = Depends(get_db),
    ctx: TenantContext = Depends(require_tenant),
):
    try:
        eleve = crud.get_eleve(db, ctx.tenant_id, eleve_id)
    except crud.NotFound as e:
        raise HTTPException(status.HTTP_404_NOT_FOUND, str(e))
    if eleve.statut != STATUT_INSCRIT:
        raise HTTPException(status.HTTP_422_UNPROCESSABLE_ENTITY, "Attestation de scolarité réservée aux élèves inscrits.")
    names = _classe_names(ctx)
    pdf = render_attestation_scolarite(
        eleve, establishment_name=establishment_name,
        classe_nom=names.get(eleve.classe_id) if eleve.classe_id else None,
    )
    return _pdf_response(pdf, f"attestation_scolarite_{eleve.matricule}.pdf")


@app.get("/eleves/{eleve_id}/attestations/radiation.pdf", tags=["dossier"])
def attestation_radiation(
    eleve_id: int,
    establishment_name: str = "Établissement",
    db: Session = Depends(get_db),
    ctx: TenantContext = Depends(require_tenant),
):
    try:
        eleve = crud.get_eleve(db, ctx.tenant_id, eleve_id)
    except crud.NotFound as e:
        raise HTTPException(status.HTTP_404_NOT_FOUND, str(e))
    if eleve.statut != STATUT_RADIE:
        raise HTTPException(status.HTTP_422_UNPROCESSABLE_ENTITY, "L'élève n'est pas radié.")
    pdf = render_attestation_radiation(
        eleve, establishment_name=establishment_name,
        motif=_last_radiation_motif(db, ctx.tenant_id, eleve.id),
    )
    return _pdf_response(pdf, f"attestation_radiation_{eleve.matricule}.pdf")


@app.get("/eleves/{eleve_id}/attestations/reussite.pdf", tags=["dossier"])
def attestation_reussite(
    eleve_id: int,
    establishment_name: str = "Établissement",
    db: Session = Depends(get_db),
    ctx: TenantContext = Depends(require_tenant),
):
    try:
        eleve = crud.get_eleve(db, ctx.tenant_id, eleve_id)
    except crud.NotFound as e:
        raise HTTPException(status.HTTP_404_NOT_FOUND, str(e))
    if eleve.statut != STATUT_DIPLOME:
        raise HTTPException(status.HTTP_422_UNPROCESSABLE_ENTITY, "Attestation de réussite réservée aux élèves sortants.")
    names = _classe_names(ctx)
    last = next((m for m in crud.list_mouvements(db, ctx.tenant_id, eleve.id) if m.from_classe_id), None)
    classe_nom = names.get(last.from_classe_id) if last and last.from_classe_id else None
    pdf = render_attestation_reussite(eleve, establishment_name=establishment_name, classe_nom=classe_nom)
    return _pdf_response(pdf, f"attestation_reussite_{eleve.matricule}.pdf")


@app.get("/eleves/{eleve_id}/carte.pdf", tags=["dossier"])
def carte_eleve(
    eleve_id: int,
    establishment_name: str = "Établissement",
    db: Session = Depends(get_db),
    ctx: TenantContext = Depends(require_tenant),
):
    try:
        eleve = crud.get_eleve(db, ctx.tenant_id, eleve_id)
    except crud.NotFound as e:
        raise HTTPException(status.HTTP_404_NOT_FOUND, str(e))
    names = _classe_names(ctx)
    pdf = render_carte_eleve(
        eleve, establishment_name=establishment_name,
        classe_nom=names.get(eleve.classe_id) if eleve.classe_id else None,
    )
    return _pdf_response(pdf, f"carte_eleve_{eleve.matricule}.pdf")
