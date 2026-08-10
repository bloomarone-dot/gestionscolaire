"""CRUD modèles / versions / assignations — isolation tenant + versionnement."""
from __future__ import annotations

from datetime import datetime
from typing import Any, Optional

from sqlalchemy import and_, or_, select
from sqlalchemy.orm import Session

from app.engine.demo_templates import CAMEROON_SECONDARY_DEMO_V1
from app.engine.template_schema import TemplateValidationError, validate_template_definition
from app.models import (
    STATUS_ARCHIVED,
    STATUS_DRAFT,
    STATUS_PUBLISHED,
    BulletinModele,
    BulletinModeleAssignation,
    BulletinModeleVersion,
)
from app.schemas_modeles import (
    AssignationCreateIn,
    AssignationUpdateIn,
    ModeleCreateIn,
    ModeleUpdateIn,
    VersionCreateIn,
)


class ModeleError(Exception):
    def __init__(self, message: str, *, status_code: int = 400):
        super().__init__(message)
        self.status_code = status_code


def _now() -> datetime:
    return datetime.utcnow()


def validate_definition(definition: dict[str, Any]) -> dict[str, Any]:
    try:
        return validate_template_definition(definition or {}).model_dump(mode="json")
    except TemplateValidationError as exc:
        raise ModeleError(str(exc), status_code=422) from exc


def _visible_filter(tenant_id: int):
    """Templates du tenant + templates système."""
    return or_(
        BulletinModele.tenant_id == tenant_id,
        and_(BulletinModele.is_system.is_(True), BulletinModele.tenant_id.is_(None)),
    )


def get_modele_for_read(db: Session, tenant_id: int, modele_id: int) -> BulletinModele:
    row = db.get(BulletinModele, modele_id)
    if not row:
        raise ModeleError("Modèle introuvable", status_code=404)
    if row.is_system and row.tenant_id is None:
        return row
    if row.tenant_id != tenant_id:
        # Même message : ne pas révéler l'existence cross-tenant
        raise ModeleError("Modèle introuvable", status_code=404)
    return row


def get_modele_for_write(db: Session, tenant_id: int, modele_id: int) -> BulletinModele:
    row = get_modele_for_read(db, tenant_id, modele_id)
    if row.is_system or row.tenant_id is None:
        raise ModeleError(
            "Les modèles système sont en lecture seule — dupliquez-les avant modification.",
            status_code=403,
        )
    if row.tenant_id != tenant_id:
        raise ModeleError("Modèle introuvable", status_code=404)
    return row


def list_modeles(db: Session, tenant_id: int) -> list[BulletinModele]:
    return list(
        db.scalars(
            select(BulletinModele)
            .where(_visible_filter(tenant_id))
            .order_by(BulletinModele.is_system.desc(), BulletinModele.name)
        ).all()
    )


def _clear_other_defaults(db: Session, tenant_id: int, keep_id: Optional[int] = None) -> None:
    q = select(BulletinModele).where(
        BulletinModele.tenant_id == tenant_id,
        BulletinModele.is_default.is_(True),
    )
    for row in db.scalars(q).all():
        if keep_id is not None and row.id == keep_id:
            continue
        row.is_default = False


def create_modele(
    db: Session,
    tenant_id: int,
    user_id: int,
    payload: ModeleCreateIn,
) -> BulletinModele:
    definition = validate_definition(payload.definition or {"schema_version": 1, "components": []})
    if payload.is_default:
        raise ModeleError(
            "Publiez d'abord le modèle avant de le définir par défaut.",
            status_code=409,
        )

    modele = BulletinModele(
        tenant_id=tenant_id,
        name=payload.name,
        description=payload.description,
        status=STATUS_DRAFT,
        is_default=False,
        is_system=False,
        establishment_kind=payload.establishment_kind,
        created_by=user_id,
        created_at=_now(),
        updated_at=_now(),
    )
    db.add(modele)
    db.flush()

    version = BulletinModeleVersion(
        modele_id=modele.id,
        tenant_id=tenant_id,
        version_number=1,
        schema_version=int(definition.get("schema_version") or 1),
        definition=definition,
        notes="Version initiale",
        created_by=user_id,
        created_at=_now(),
    )
    db.add(version)
    db.flush()
    modele.current_version_id = version.id
    db.commit()
    db.refresh(modele)
    return modele


def update_modele(
    db: Session,
    tenant_id: int,
    modele_id: int,
    payload: ModeleUpdateIn,
) -> BulletinModele:
    modele = get_modele_for_write(db, tenant_id, modele_id)
    if modele.status == STATUS_ARCHIVED:
        raise ModeleError("Modèle archivé — non modifiable", status_code=409)

    data = payload.model_dump(exclude_unset=True)
    if "definition" in data:
        if modele.status != STATUS_DRAFT:
            raise ModeleError(
                "Impossible de modifier la définition d'un modèle publié — créez une nouvelle version.",
                status_code=409,
            )
        definition = validate_definition(data.pop("definition") or {})
        version = db.get(BulletinModeleVersion, modele.current_version_id)
        if not version or version.modele_id != modele.id:
            raise ModeleError("Version courante introuvable", status_code=404)
        # DRAFT only: mise à jour in-place de la version courante (toujours v1 tant que non publié)
        version.definition = definition
        version.schema_version = int(definition.get("schema_version") or 1)

    if "is_default" in data and data["is_default"]:
        if modele.status != STATUS_PUBLISHED:
            raise ModeleError(
                "Seul un modèle PUBLISHED peut être défini par défaut.",
                status_code=409,
            )
        _clear_other_defaults(db, tenant_id, keep_id=modele.id)

    for key in ("name", "description", "establishment_kind", "is_default"):
        if key in data:
            setattr(modele, key, data[key])

    modele.updated_at = _now()
    db.commit()
    db.refresh(modele)
    return modele


def delete_modele(db: Session, tenant_id: int, modele_id: int) -> None:
    modele = get_modele_for_write(db, tenant_id, modele_id)
    # Soft: archive rather than hard delete if published; hard delete drafts OK
    if modele.status == STATUS_PUBLISHED:
        raise ModeleError("Archivez le modèle publié plutôt que de le supprimer.", status_code=409)
    # delete assignations + versions
    for a in db.scalars(
        select(BulletinModeleAssignation).where(BulletinModeleAssignation.modele_id == modele.id)
    ).all():
        db.delete(a)
    for v in db.scalars(
        select(BulletinModeleVersion).where(BulletinModeleVersion.modele_id == modele.id)
    ).all():
        db.delete(v)
    db.delete(modele)
    db.commit()


def list_versions(db: Session, tenant_id: int, modele_id: int) -> list[BulletinModeleVersion]:
    get_modele_for_read(db, tenant_id, modele_id)
    return list(
        db.scalars(
            select(BulletinModeleVersion)
            .where(BulletinModeleVersion.modele_id == modele_id)
            .order_by(BulletinModeleVersion.version_number)
        ).all()
    )


def get_version(
    db: Session, tenant_id: int, modele_id: int, version_id: int,
) -> BulletinModeleVersion:
    get_modele_for_read(db, tenant_id, modele_id)
    version = db.get(BulletinModeleVersion, version_id)
    if not version or version.modele_id != modele_id:
        raise ModeleError("Version introuvable", status_code=404)
    # Cross-tenant version of owned modele already gated by modele read
    if version.tenant_id is not None and version.tenant_id != tenant_id:
        # system versions have tenant_id None
        modele = db.get(BulletinModele, modele_id)
        if not (modele and modele.is_system):
            raise ModeleError("Version introuvable", status_code=404)
    return version


def create_version(
    db: Session,
    tenant_id: int,
    user_id: int,
    modele_id: int,
    payload: VersionCreateIn,
) -> BulletinModeleVersion:
    modele = get_modele_for_write(db, tenant_id, modele_id)
    if modele.status == STATUS_ARCHIVED:
        raise ModeleError("Modèle archivé", status_code=409)
    definition = validate_definition(payload.definition)
    last = db.scalar(
        select(BulletinModeleVersion.version_number)
        .where(BulletinModeleVersion.modele_id == modele.id)
        .order_by(BulletinModeleVersion.version_number.desc())
        .limit(1)
    )
    next_num = int(last or 0) + 1
    version = BulletinModeleVersion(
        modele_id=modele.id,
        tenant_id=tenant_id,
        version_number=next_num,
        schema_version=int(definition.get("schema_version") or 1),
        definition=definition,
        notes=payload.notes,
        created_by=user_id,
        created_at=_now(),
    )
    db.add(version)
    # Si encore DRAFT sans publication, la nouvelle version devient courante.
    # Si PUBLISHED : la nouvelle version reste hors production jusqu'à publish explicite
    # (la version publiée courante reste immuable et opérationnelle).
    if modele.status == STATUS_DRAFT:
        db.flush()
        modele.current_version_id = version.id
    modele.updated_at = _now()
    db.commit()
    db.refresh(version)
    return version


def update_version_definition(
    db: Session,
    tenant_id: int,
    modele_id: int,
    version_id: int,
    definition: dict,
) -> BulletinModeleVersion:
    """Met à jour la définition d'une version non publiée (brouillon d'édition)."""
    modele = get_modele_for_write(db, tenant_id, modele_id)
    if modele.status == STATUS_ARCHIVED:
        raise ModeleError("Modèle archivé — non modifiable", status_code=409)
    version = get_version(db, tenant_id, modele_id, version_id)
    if modele.status == STATUS_PUBLISHED and version.id == modele.current_version_id:
        raise ModeleError(
            "Version publiée immuable — créez une nouvelle version DRAFT.",
            status_code=409,
        )
    validated = validate_definition(definition)
    version.definition = validated
    version.schema_version = int(validated.get("schema_version") or 1)
    modele.updated_at = _now()
    db.commit()
    db.refresh(version)
    return version


def publish_modele(
    db: Session,
    tenant_id: int,
    modele_id: int,
    *,
    version_id: Optional[int] = None,
) -> BulletinModele:
    modele = get_modele_for_write(db, tenant_id, modele_id)
    if modele.status == STATUS_ARCHIVED:
        raise ModeleError("Impossible de publier un modèle archivé", status_code=409)

    if version_id is not None:
        version = get_version(db, tenant_id, modele_id, version_id)
    else:
        # Dernière version créée
        version = db.scalar(
            select(BulletinModeleVersion)
            .where(BulletinModeleVersion.modele_id == modele.id)
            .order_by(BulletinModeleVersion.version_number.desc())
            .limit(1)
        )
    if not version:
        raise ModeleError("Aucune version à publier", status_code=404)

    # Valider à nouveau avant publication
    validate_definition(version.definition)

    modele.current_version_id = version.id
    modele.status = STATUS_PUBLISHED
    modele.updated_at = _now()
    db.commit()
    db.refresh(modele)
    return modele


def archive_modele(db: Session, tenant_id: int, modele_id: int) -> BulletinModele:
    modele = get_modele_for_write(db, tenant_id, modele_id)
    modele.status = STATUS_ARCHIVED
    modele.is_default = False
    modele.updated_at = _now()
    # désactiver assignations
    for a in db.scalars(
        select(BulletinModeleAssignation).where(
            BulletinModeleAssignation.modele_id == modele.id,
            BulletinModeleAssignation.tenant_id == tenant_id,
        )
    ).all():
        a.is_active = False
    db.commit()
    db.refresh(modele)
    return modele


def duplicate_modele(
    db: Session,
    tenant_id: int,
    user_id: int,
    modele_id: int,
    *,
    name: Optional[str] = None,
) -> BulletinModele:
    source = get_modele_for_read(db, tenant_id, modele_id)
    version = None
    if source.current_version_id:
        version = db.get(BulletinModeleVersion, source.current_version_id)
    if not version:
        version = db.scalar(
            select(BulletinModeleVersion)
            .where(BulletinModeleVersion.modele_id == source.id)
            .order_by(BulletinModeleVersion.version_number.desc())
            .limit(1)
        )
    if not version:
        raise ModeleError("Aucune définition à dupliquer", status_code=404)

    definition = validate_definition(dict(version.definition or {}))
    new_name = name or f"{source.name} (copie)"
    payload = ModeleCreateIn(
        name=new_name[:160],
        description=source.description,
        establishment_kind=source.establishment_kind,
        definition=definition,
        is_default=False,
    )
    return create_modele(db, tenant_id, user_id, payload)


def _assignment_fingerprint(data: dict[str, Any]) -> tuple:
    return (
        data.get("annee_scolaire"),
        data.get("classe_id"),
        data.get("level_code"),
        data.get("cycle_code"),
        data.get("series_code"),
        data.get("periode"),
    )


def _assert_no_assignment_conflict(
    db: Session,
    tenant_id: int,
    fingerprint: tuple,
    *,
    exclude_id: Optional[int] = None,
    modele_id: Optional[int] = None,
) -> None:
    rows = db.scalars(
        select(BulletinModeleAssignation).where(
            BulletinModeleAssignation.tenant_id == tenant_id,
            BulletinModeleAssignation.is_active.is_(True),
        )
    ).all()
    for row in rows:
        if exclude_id and row.id == exclude_id:
            continue
        fp = _assignment_fingerprint({
            "annee_scolaire": row.annee_scolaire,
            "classe_id": row.classe_id,
            "level_code": row.level_code,
            "cycle_code": row.cycle_code,
            "series_code": row.series_code,
            "periode": row.periode,
        })
        if fp == fingerprint and any(x is not None for x in fingerprint):
            raise ModeleError(
                "Conflit d'assignation : une règle active existe déjà pour ce périmètre.",
                status_code=409,
            )


def _specificity(row: BulletinModeleAssignation) -> int:
    """Plus petit = plus spécifique (priorité de résolution)."""
    if row.classe_id is not None:
        return 1
    if row.level_code:
        return 2
    if row.cycle_code:
        return 3
    return 50


def create_assignation(
    db: Session,
    tenant_id: int,
    modele_id: int,
    payload: AssignationCreateIn,
) -> BulletinModeleAssignation:
    modele = get_modele_for_write(db, tenant_id, modele_id)
    if modele.status != STATUS_PUBLISHED:
        raise ModeleError(
            "Seuls les modèles PUBLISHED peuvent être assignés opérationnellement.",
            status_code=409,
        )
    data = payload.model_dump()
    if not any([
        data.get("classe_id"), data.get("level_code"), data.get("cycle_code"),
        data.get("series_code"), data.get("annee_scolaire"), data.get("periode"),
    ]):
        raise ModeleError(
            "Indiquez au moins un critère (classe, niveau, cycle, année ou période).",
            status_code=400,
        )
    _assert_no_assignment_conflict(db, tenant_id, _assignment_fingerprint(data))
    row = BulletinModeleAssignation(
        tenant_id=tenant_id,
        modele_id=modele.id,
        **data,
        created_at=_now(),
        updated_at=_now(),
    )
    db.add(row)
    db.commit()
    db.refresh(row)
    return row


def update_assignation(
    db: Session,
    tenant_id: int,
    modele_id: int,
    assignation_id: int,
    payload: AssignationUpdateIn,
) -> BulletinModeleAssignation:
    get_modele_for_write(db, tenant_id, modele_id)
    row = db.get(BulletinModeleAssignation, assignation_id)
    if not row or row.modele_id != modele_id or row.tenant_id != tenant_id:
        raise ModeleError("Assignation introuvable", status_code=404)
    data = payload.model_dump(exclude_unset=True)
    merged = {
        "annee_scolaire": data.get("annee_scolaire", row.annee_scolaire),
        "classe_id": data.get("classe_id", row.classe_id),
        "level_code": data.get("level_code", row.level_code),
        "cycle_code": data.get("cycle_code", row.cycle_code),
        "series_code": data.get("series_code", row.series_code),
        "periode": data.get("periode", row.periode),
    }
    if data.get("is_active", row.is_active):
        _assert_no_assignment_conflict(
            db, tenant_id, _assignment_fingerprint(merged), exclude_id=row.id,
        )
    for k, v in data.items():
        setattr(row, k, v)
    row.updated_at = _now()
    db.commit()
    db.refresh(row)
    return row


def delete_assignation(
    db: Session, tenant_id: int, modele_id: int, assignation_id: int,
) -> None:
    get_modele_for_write(db, tenant_id, modele_id)
    row = db.get(BulletinModeleAssignation, assignation_id)
    if not row or row.modele_id != modele_id or row.tenant_id != tenant_id:
        raise ModeleError("Assignation introuvable", status_code=404)
    db.delete(row)
    db.commit()


def list_assignations(
    db: Session, tenant_id: int, modele_id: int,
) -> list[BulletinModeleAssignation]:
    get_modele_for_read(db, tenant_id, modele_id)
    return list(
        db.scalars(
            select(BulletinModeleAssignation).where(
                BulletinModeleAssignation.tenant_id == tenant_id,
                BulletinModeleAssignation.modele_id == modele_id,
            ).order_by(BulletinModeleAssignation.priority, BulletinModeleAssignation.id)
        ).all()
    )


def resolve_modele(
    db: Session,
    tenant_id: int,
    *,
    annee_scolaire: Optional[str] = None,
    classe_id: Optional[int] = None,
    level_code: Optional[str] = None,
    cycle_code: Optional[str] = None,
    series_code: Optional[str] = None,
    periode: Optional[str] = None,
) -> Optional[BulletinModele]:
    """Résolution par priorité d'assignation puis défaut tenant puis système."""
    rows = list(
        db.scalars(
            select(BulletinModeleAssignation).where(
                BulletinModeleAssignation.tenant_id == tenant_id,
                BulletinModeleAssignation.is_active.is_(True),
            )
        ).all()
    )

    def matches(row: BulletinModeleAssignation) -> bool:
        if row.annee_scolaire and annee_scolaire and row.annee_scolaire != annee_scolaire:
            return False
        if row.classe_id is not None and classe_id is not None and row.classe_id != classe_id:
            return False
        if row.classe_id is not None and classe_id is None:
            return False
        if row.level_code and level_code and row.level_code != level_code:
            return False
        if row.level_code and not level_code:
            return False
        if row.cycle_code and cycle_code and row.cycle_code != cycle_code:
            return False
        if row.cycle_code and not cycle_code:
            return False
        if row.series_code and series_code and row.series_code != series_code:
            return False
        if row.periode and periode and str(row.periode) != str(periode):
            return False
        # Assignation « large » (pas de critère) ne match jamais ici
        if not any([row.classe_id, row.level_code, row.cycle_code, row.series_code, row.annee_scolaire, row.periode]):
            return False
        # Si l'assignation fixe un critère, le contexte doit le satisfaire
        if row.classe_id is not None and row.classe_id != classe_id:
            return False
        if row.level_code and row.level_code != level_code:
            return False
        if row.cycle_code and row.cycle_code != cycle_code:
            return False
        return True

    candidates = [r for r in rows if matches(r)]
    if candidates:
        candidates.sort(key=lambda r: (_specificity(r), r.priority, r.id))
        # Conflit : même spécificité + même priority
        best = candidates[0]
        ties = [
            r for r in candidates
            if _specificity(r) == _specificity(best) and r.priority == best.priority and r.id != best.id
            and (
                (r.classe_id and r.classe_id == best.classe_id)
                or (r.level_code and r.level_code == best.level_code)
                or (r.cycle_code and r.cycle_code == best.cycle_code)
            )
        ]
        if ties:
            raise ModeleError(
                "Conflit de résolution : plusieurs assignations de même priorité.",
                status_code=409,
            )
        modele = db.get(BulletinModele, best.modele_id)
        if modele and modele.tenant_id == tenant_id and modele.status == STATUS_PUBLISHED:
            return modele

    default = db.scalar(
        select(BulletinModele).where(
            BulletinModele.tenant_id == tenant_id,
            BulletinModele.is_default.is_(True),
            BulletinModele.status == STATUS_PUBLISHED,
        )
    )
    if default:
        return default

    system = db.scalar(
        select(BulletinModele).where(
            BulletinModele.is_system.is_(True),
            BulletinModele.tenant_id.is_(None),
            BulletinModele.status == STATUS_PUBLISHED,
        ).order_by(BulletinModele.id).limit(1)
    )
    return system


def ensure_system_demo_template(db: Session) -> BulletinModele:
    """Idempotent : template système camerounais pour duplication."""
    existing = db.scalar(
        select(BulletinModele).where(
            BulletinModele.is_system.is_(True),
            BulletinModele.tenant_id.is_(None),
        ).limit(1)
    )
    if existing:
        return existing
    definition = validate_definition(CAMEROON_SECONDARY_DEMO_V1)
    modele = BulletinModele(
        tenant_id=None,
        name=CAMEROON_SECONDARY_DEMO_V1.get("name") or "Bulletin démo",
        description="Template système (lecture seule) — dupliquer pour personnaliser.",
        status=STATUS_PUBLISHED,
        is_default=False,
        is_system=True,
        establishment_kind="SCHOOL",
        created_by=None,
        created_at=_now(),
        updated_at=_now(),
    )
    db.add(modele)
    db.flush()
    version = BulletinModeleVersion(
        modele_id=modele.id,
        tenant_id=None,
        version_number=1,
        schema_version=1,
        definition=definition,
        notes="Système",
        created_by=None,
        created_at=_now(),
    )
    db.add(version)
    db.flush()
    modele.current_version_id = version.id
    db.commit()
    db.refresh(modele)
    return modele


def get_definition_for_render(
    db: Session,
    tenant_id: int,
    modele_id: int,
    version_id: Optional[int] = None,
) -> dict[str, Any]:
    modele = get_modele_for_read(db, tenant_id, modele_id)
    if version_id is not None:
        version = get_version(db, tenant_id, modele_id, version_id)
    else:
        if not modele.current_version_id:
            raise ModeleError("Aucune version courante", status_code=404)
        version = db.get(BulletinModeleVersion, modele.current_version_id)
        if not version:
            raise ModeleError("Version courante introuvable", status_code=404)
    return validate_definition(dict(version.definition or {}))
