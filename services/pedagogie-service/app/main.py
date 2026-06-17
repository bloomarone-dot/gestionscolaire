"""pedagogie-service — classes en cascade (§4) et matières de la classe (§5)."""
from fastapi import Depends, FastAPI, HTTPException, status
from sqlalchemy.orm import Session, sessionmaker

from common.db import Base, add_missing_columns, get_engine, init_engine
from common.events import EventNames, EventPublisher
from common.tenant import TenantContext, require_tenant

from app import crud
from app.config import settings
from app.models import Classe, ClasseMatiere, SOURCE_OFFICIELLE
from app.referentiel_client import fetch_official_subjects
from app.schemas import (
    AnneeScolaireCreate,
    AnneeScolaireOut,
    ClasseCreate,
    ClasseDetail,
    ClasseListItem,
    ClasseUpdate,
    MatiereOut,
    MatiereUpdate,
    PassageAnneeIn,
    SpecialMatiereCreate,
)

app = FastAPI(title="pedagogie-service — SaaS Scolaire", version="0.1.0")

_SessionLocal = None
_publisher: EventPublisher | None = None


@app.on_event("startup")
def _startup() -> None:
    global _SessionLocal, _publisher
    init_engine(settings.database_url)
    Base.metadata.create_all(bind=get_engine())  # Alembic en Phase 5
    add_missing_columns("classe_matieres", {"groupe": "INTEGER"})
    add_missing_columns("classes", {
        "annee_scolaire_id": "INTEGER",
        "prof_principal_id": "INTEGER",
    })
    _SessionLocal = sessionmaker(bind=get_engine(), future=True)
    _publisher = EventPublisher(settings.rabbitmq_url, settings.events_exchange)


def get_db() -> Session:
    db = _SessionLocal()
    try:
        yield db
    finally:
        db.close()


def _emit_class_subjects_updated(tenant_id: int, classe_id: int) -> None:
    if _publisher is not None:
        _publisher.publish(
            EventNames.CLASS_SUBJECTS_UPDATED,
            {"tenant_id": tenant_id, "classe_id": classe_id},
        )


# ── Sérialisation ────────────────────────────────────────────────────────────
def _matiere_out(m: ClasseMatiere) -> MatiereOut:
    return MatiereOut(
        id=m.id, nom=m.nom, source=m.source,
        type="Officielle" if m.source == SOURCE_OFFICIELLE else "Spéciale",
        subject_code=m.subject_code, coefficient=m.coefficient,
        volume_horaire=m.volume_horaire, enseignant_id=m.enseignant_id,
        activated=m.activated, is_obligatoire=m.is_obligatoire, groupe=m.groupe,
    )


def _classe_item(c: Classe, nb_matieres: int) -> ClasseListItem:
    return ClasseListItem(
        id=c.id, nom_personnalise=c.nom_personnalise, subsystem_code=c.subsystem_code,
        type_code=c.type_code, level_code=c.level_code, series_code=c.series_code,
        niveau_libre=c.niveau_libre, specialite_libre=c.specialite_libre,
        effectif_max=c.effectif_max, prof_principal_id=c.prof_principal_id,
        annee_scolaire_id=c.annee_scolaire_id,
        annee_scolaire=c.annee_scolaire.annee if c.annee_scolaire else None,
        nb_matieres=nb_matieres, statut="Spéciale" if c.is_special else "Standard",
    )


@app.get("/health", tags=["infra"])
def health() -> dict:
    return {"status": "ok", "service": "pedagogie-service"}


# ═══════════════════════ ANNÉES SCOLAIRES ════════════════════════════════════
@app.get("/pedagogie/annees-scolaires", response_model=list[AnneeScolaireOut], tags=["annees-scolaires"])
def list_annees_scolaires(
    db: Session = Depends(get_db),
    ctx: TenantContext = Depends(require_tenant),
):
    return crud.list_annees(db, ctx.tenant_id)


@app.post("/pedagogie/annees-scolaires", response_model=AnneeScolaireOut,
          status_code=status.HTTP_201_CREATED, tags=["annees-scolaires"])
def create_annee_scolaire(
    payload: AnneeScolaireCreate,
    db: Session = Depends(get_db),
    ctx: TenantContext = Depends(require_tenant),
):
    try:
        return crud.create_annee(db, ctx.tenant_id, payload)
    except crud.Conflict as e:
        raise HTTPException(status.HTTP_409_CONFLICT, str(e))


@app.put("/pedagogie/annees-scolaires/{annee_id}/activer",
         response_model=AnneeScolaireOut, tags=["annees-scolaires"])
def activate_annee_scolaire(
    annee_id: int,
    db: Session = Depends(get_db),
    ctx: TenantContext = Depends(require_tenant),
):
    try:
        return crud.activate_annee(db, ctx.tenant_id, annee_id)
    except crud.NotFound as e:
        raise HTTPException(status.HTTP_404_NOT_FOUND, str(e))


@app.post("/pedagogie/annees-scolaires/passage",
          response_model=AnneeScolaireOut, tags=["annees-scolaires"])
def passage_annee_scolaire(
    payload: PassageAnneeIn,
    db: Session = Depends(get_db),
    ctx: TenantContext = Depends(require_tenant),
):
    return crud.passage_annee(db, ctx.tenant_id, payload)


# ════════════════════════════════ CLASSES ════════════════════════════════════
@app.post("/pedagogie/classes", response_model=ClasseDetail,
          status_code=status.HTTP_201_CREATED, tags=["classes"])
def create_classe(
    payload: ClasseCreate,
    db: Session = Depends(get_db),
    ctx: TenantContext = Depends(require_tenant),
):
    official = None
    if not payload.is_special:
        # Héritage automatique des matières du référentiel (§4.2).
        official = fetch_official_subjects(ctx, payload.level_code, payload.series_code)
    classe = crud.create_class(db, ctx.tenant_id, payload, official)
    if classe.matieres:
        _emit_class_subjects_updated(ctx.tenant_id, classe.id)
    return _detail(db, ctx.tenant_id, classe)


@app.get("/pedagogie/classes", response_model=list[ClasseListItem], tags=["classes"])
def list_classes(
    level: str | None = None,
    series: str | None = None,
    subsystem: str | None = None,
    type: str | None = None,
    enseignant: int | None = None,
    db: Session = Depends(get_db),
    ctx: TenantContext = Depends(require_tenant),
):
    """Liste/filtre les classes — par profil (§6) ou par enseignant (ses classes)."""
    rows = crud.list_classes(
        db, ctx.tenant_id, level_code=level, series_code=series,
        subsystem_code=subsystem, type_code=type, enseignant_id=enseignant,
    )
    return [_classe_item(c, n) for c, n in rows]


@app.get("/pedagogie/classes/{class_id}", response_model=ClasseDetail, tags=["classes"])
def get_classe(
    class_id: int,
    db: Session = Depends(get_db),
    ctx: TenantContext = Depends(require_tenant),
):
    try:
        classe = crud.get_class(db, ctx.tenant_id, class_id)
    except crud.NotFound as e:
        raise HTTPException(status.HTTP_404_NOT_FOUND, str(e))
    return _detail(db, ctx.tenant_id, classe)


@app.put("/pedagogie/classes/{class_id}", response_model=ClasseDetail, tags=["classes"])
def update_classe(
    class_id: int,
    payload: ClasseUpdate,
    db: Session = Depends(get_db),
    ctx: TenantContext = Depends(require_tenant),
):
    try:
        classe = crud.update_class(db, ctx.tenant_id, class_id, payload)
    except crud.NotFound as e:
        raise HTTPException(status.HTTP_404_NOT_FOUND, str(e))
    return _detail(db, ctx.tenant_id, classe)


@app.delete("/pedagogie/classes/{class_id}", status_code=status.HTTP_204_NO_CONTENT, tags=["classes"])
def delete_classe(
    class_id: int,
    db: Session = Depends(get_db),
    ctx: TenantContext = Depends(require_tenant),
):
    try:
        crud.delete_class(db, ctx.tenant_id, class_id)
    except crud.NotFound as e:
        raise HTTPException(status.HTTP_404_NOT_FOUND, str(e))


def _detail(db: Session, tenant_id: int, classe: Classe) -> ClasseDetail:
    matieres = crud.list_matieres(db, tenant_id, classe.id)
    item = _classe_item(classe, sum(1 for m in matieres if m.activated))
    return ClasseDetail(
        **item.model_dump(), is_special=classe.is_special,
        cycle_code=classe.cycle_code, created_at=classe.created_at,
        matieres=[_matiere_out(m) for m in matieres],
    )


# ════════════════════════ MATIÈRES DE LA CLASSE (§5) ══════════════════════════
@app.get("/pedagogie/classes/{class_id}/matieres", response_model=list[MatiereOut], tags=["matieres"])
def list_matieres(
    class_id: int,
    db: Session = Depends(get_db),
    ctx: TenantContext = Depends(require_tenant),
):
    try:
        return [_matiere_out(m) for m in crud.list_matieres(db, ctx.tenant_id, class_id)]
    except crud.NotFound as e:
        raise HTTPException(status.HTTP_404_NOT_FOUND, str(e))


@app.patch("/pedagogie/classes/{class_id}/matieres/{matiere_id}",
           response_model=MatiereOut, tags=["matieres"])
def update_matiere(
    class_id: int,
    matiere_id: int,
    payload: MatiereUpdate,
    db: Session = Depends(get_db),
    ctx: TenantContext = Depends(require_tenant),
):
    try:
        m = crud.update_matiere(db, ctx.tenant_id, class_id, matiere_id, payload)
    except crud.ConfirmationRequired as e:
        # §5.2 : le frontend affiche [Annuler] [Confirmer] puis renvoie confirm=true.
        raise HTTPException(status.HTTP_409_CONFLICT, str(e))
    except crud.NotFound as e:
        raise HTTPException(status.HTTP_404_NOT_FOUND, str(e))
    _emit_class_subjects_updated(ctx.tenant_id, class_id)
    return _matiere_out(m)


@app.post("/pedagogie/classes/{class_id}/matieres/special",
          response_model=MatiereOut, status_code=status.HTTP_201_CREATED, tags=["matieres"])
def add_special_matiere(
    class_id: int,
    payload: SpecialMatiereCreate,
    db: Session = Depends(get_db),
    ctx: TenantContext = Depends(require_tenant),
):
    try:
        m = crud.add_special_matiere(db, ctx.tenant_id, class_id, payload)
    except crud.NotFound as e:
        raise HTTPException(status.HTTP_404_NOT_FOUND, str(e))
    _emit_class_subjects_updated(ctx.tenant_id, class_id)
    return _matiere_out(m)
