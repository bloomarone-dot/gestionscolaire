"""Logique métier pedagogie-service (pure et testable — sans I/O réseau)."""
from datetime import datetime
from typing import Optional

from sqlalchemy import func
from sqlalchemy.orm import Session

from common.subsystem import infer_subsystem_from_text

from app.models import (
    SOURCE_OFFICIELLE,
    SOURCE_SPECIALE,
    AnneeScolaire,
    Classe,
    ClasseMatiere,
    SpecialSubject,
)
from app.schemas import AnneeScolaireCreate, ClasseCreate, MatiereUpdate, PassageAnneeIn, SpecialMatiereCreate


class ConfirmationRequired(Exception):
    """Levée quand on décoche une matière obligatoire sans confirmation (§5.2)."""


class NotFound(Exception):
    pass


class Conflict(Exception):
    pass


def _next_school_year_label(current: str | None) -> str:
    try:
        start = int((current or "").split("-", 1)[0])
    except ValueError:
        start = datetime.utcnow().year
    return f"{start + 1}-{start + 2}"


def get_active_year(db: Session, tenant_id: int) -> AnneeScolaire | None:
    return (
        db.query(AnneeScolaire)
        .filter(AnneeScolaire.tenant_id == tenant_id, AnneeScolaire.is_active.is_(True))
        .first()
    )


def list_annees(db: Session, tenant_id: int) -> list[AnneeScolaire]:
    return (
        db.query(AnneeScolaire)
        .filter(AnneeScolaire.tenant_id == tenant_id)
        .order_by(AnneeScolaire.annee.desc())
        .all()
    )


def create_annee(db: Session, tenant_id: int, payload: AnneeScolaireCreate) -> AnneeScolaire:
    existing = (
        db.query(AnneeScolaire)
        .filter(AnneeScolaire.tenant_id == tenant_id, AnneeScolaire.annee == payload.annee)
        .first()
    )
    if existing:
        raise Conflict("Cette année scolaire existe déjà.")
    if payload.is_active:
        _deactivate_active_years(db, tenant_id, archive=True)
    annee = AnneeScolaire(
        tenant_id=tenant_id,
        annee=payload.annee.strip(),
        date_debut=payload.date_debut,
        date_fin=payload.date_fin,
        is_active=payload.is_active,
        is_archived=False,
    )
    db.add(annee)
    db.commit()
    db.refresh(annee)
    return annee


def _deactivate_active_years(db: Session, tenant_id: int, archive: bool) -> None:
    now = datetime.utcnow()
    for year in db.query(AnneeScolaire).filter(
        AnneeScolaire.tenant_id == tenant_id,
        AnneeScolaire.is_active.is_(True),
    ):
        year.is_active = False
        if archive:
            year.is_archived = True
            year.archived_at = now


def activate_annee(db: Session, tenant_id: int, annee_id: int) -> AnneeScolaire:
    annee = (
        db.query(AnneeScolaire)
        .filter(AnneeScolaire.tenant_id == tenant_id, AnneeScolaire.id == annee_id)
        .first()
    )
    if not annee:
        raise NotFound("Année scolaire introuvable")
    _deactivate_active_years(db, tenant_id, archive=True)
    annee.is_active = True
    annee.is_archived = False
    annee.archived_at = None
    db.commit()
    db.refresh(annee)
    return annee


def passage_annee(db: Session, tenant_id: int, payload: PassageAnneeIn) -> AnneeScolaire:
    active = get_active_year(db, tenant_id)
    next_label = (payload.next_annee or _next_school_year_label(active.annee if active else None)).strip()
    existing = (
        db.query(AnneeScolaire)
        .filter(AnneeScolaire.tenant_id == tenant_id, AnneeScolaire.annee == next_label)
        .first()
    )
    _deactivate_active_years(db, tenant_id, archive=True)
    if existing:
        existing.is_active = True
        existing.is_archived = False
        existing.archived_at = None
        db.commit()
        db.refresh(existing)
        return existing
    next_year = AnneeScolaire(
        tenant_id=tenant_id,
        annee=next_label,
        date_debut=payload.date_debut,
        date_fin=payload.date_fin,
        is_active=True,
        is_archived=False,
    )
    db.add(next_year)
    db.commit()
    db.refresh(next_year)
    return next_year


def create_class(
    db: Session,
    tenant_id: int,
    payload: ClasseCreate,
    official_subjects: Optional[list[dict]] = None,
) -> Classe:
    """Crée la classe et, si standard, hérite des matières du référentiel (§4.2).

    `official_subjects` : liste fournie par le référentiel (code, name,
    default_coefficient, is_obligatoire). Ignorée pour une classe spéciale (§4.3).
    """
    active_year = get_active_year(db, tenant_id)
    classe = Classe(
        tenant_id=tenant_id,
        nom_personnalise=payload.nom_personnalise.strip(),
        effectif_max=payload.effectif_max,
        prof_principal_id=payload.prof_principal_id,
        annee_scolaire_id=payload.annee_scolaire_id or (active_year.id if active_year else None),
        is_special=payload.is_special,
    )
    if payload.is_special:
        classe.niveau_libre = payload.niveau_libre
        classe.specialite_libre = payload.specialite_libre
        classe.subsystem_code = (
            payload.subsystem_code
            or infer_subsystem_from_text(payload.specialite_libre)
        )
    else:
        classe.subsystem_code = payload.subsystem_code
        classe.type_code = payload.type_code
        classe.cycle_code = payload.cycle_code
        classe.level_code = payload.level_code
        classe.series_code = payload.series_code
    db.add(classe)
    db.flush()

    # Héritage automatique des matières officielles (cochées par défaut).
    if not payload.is_special and official_subjects:
        for s in official_subjects:
            db.add(ClasseMatiere(
                tenant_id=tenant_id, classe_id=classe.id, source=SOURCE_OFFICIELLE,
                subject_code=s["code"], nom=s["name"],
                coefficient=s["default_coefficient"],
                is_obligatoire=s.get("is_obligatoire", False),
                groupe=s.get("groupe"),
                activated=True,
            ))
    db.commit()
    db.refresh(classe)
    return classe


def _activated_counts(db: Session, tenant_id: int) -> dict[int, int]:
    rows = (
        db.query(ClasseMatiere.classe_id, func.count(ClasseMatiere.id))
        .filter(ClasseMatiere.tenant_id == tenant_id, ClasseMatiere.activated.is_(True))
        .group_by(ClasseMatiere.classe_id)
        .all()
    )
    return {cid: n for cid, n in rows}


def list_classes(
    db: Session,
    tenant_id: int,
    *,
    level_code: Optional[str] = None,
    series_code: Optional[str] = None,
    subsystem_code: Optional[str] = None,
    type_code: Optional[str] = None,
    enseignant_id: Optional[int] = None,
) -> list[tuple[Classe, int]]:
    """Liste les classes du tenant, filtrables par profil (§6 étape 5) ou par enseignant."""
    q = db.query(Classe).filter(Classe.tenant_id == tenant_id)
    if subsystem_code:
        q = q.filter(Classe.subsystem_code == subsystem_code)
    if type_code:
        q = q.filter(Classe.type_code == type_code)
    if level_code:
        q = q.filter(Classe.level_code == level_code)
    if series_code:
        q = q.filter(Classe.series_code == series_code)
    if enseignant_id is not None:
        # Uniquement les classes où l'enseignant a une matière activée.
        assigned = (
            db.query(ClasseMatiere.classe_id)
            .filter(
                ClasseMatiere.tenant_id == tenant_id,
                ClasseMatiere.enseignant_id == enseignant_id,
                ClasseMatiere.activated.is_(True),
            )
            .distinct()
        )
        q = q.filter(Classe.id.in_(assigned))
    classes = q.order_by(Classe.nom_personnalise).all()
    counts = _activated_counts(db, tenant_id)
    return [(c, counts.get(c.id, 0)) for c in classes]


def get_class(db: Session, tenant_id: int, class_id: int) -> Classe:
    classe = (
        db.query(Classe)
        .filter(Classe.tenant_id == tenant_id, Classe.id == class_id)
        .first()
    )
    if not classe:
        raise NotFound("Classe introuvable")
    return classe


def update_class(db: Session, tenant_id: int, class_id: int, payload) -> Classe:
    classe = get_class(db, tenant_id, class_id)
    data = payload.model_dump(exclude_unset=True)
    for field, value in data.items():
        setattr(classe, field, value)
    db.commit()
    db.refresh(classe)
    return classe


def delete_class(db: Session, tenant_id: int, class_id: int) -> None:
    """Supprime une classe (et ses matières en cascade)."""
    classe = get_class(db, tenant_id, class_id)
    db.delete(classe)
    db.commit()


def list_matieres(db: Session, tenant_id: int, class_id: int) -> list[ClasseMatiere]:
    get_class(db, tenant_id, class_id)  # garantit l'appartenance au tenant
    return (
        db.query(ClasseMatiere)
        .filter(ClasseMatiere.tenant_id == tenant_id, ClasseMatiere.classe_id == class_id)
        .order_by(ClasseMatiere.source, ClasseMatiere.nom)
        .all()
    )


def _get_matiere(db: Session, tenant_id: int, class_id: int, matiere_id: int) -> ClasseMatiere:
    m = (
        db.query(ClasseMatiere)
        .filter(
            ClasseMatiere.tenant_id == tenant_id,
            ClasseMatiere.classe_id == class_id,
            ClasseMatiere.id == matiere_id,
        )
        .first()
    )
    if not m:
        raise NotFound("Matière introuvable")
    return m


def update_matiere(
    db: Session, tenant_id: int, class_id: int, matiere_id: int, payload: MatiereUpdate
) -> ClasseMatiere:
    m = _get_matiere(db, tenant_id, class_id, matiere_id)

    # §5.2 : décocher une matière obligatoire exige une confirmation explicite.
    is_deactivating = payload.activated is False and m.activated
    if is_deactivating and m.is_obligatoire and not payload.confirm:
        raise ConfirmationRequired(
            "Cette matière est obligatoire pour l'examen officiel de cette série. "
            "Si vous la désactivez, elle n'apparaîtra plus sur les bulletins ni dans "
            "les statistiques d'examen. Voulez-vous continuer ?"
        )

    if payload.activated is not None:
        m.activated = payload.activated
    if payload.coefficient is not None:
        m.coefficient = payload.coefficient
    if payload.volume_horaire is not None:
        m.volume_horaire = payload.volume_horaire
    if payload.enseignant_id is not None:
        m.enseignant_id = payload.enseignant_id
    if "groupe" in payload.model_fields_set:
        m.groupe = payload.groupe
    db.commit()
    db.refresh(m)
    return m


def add_special_matiere(
    db: Session, tenant_id: int, class_id: int, payload: SpecialMatiereCreate
) -> ClasseMatiere:
    """Ajoute une matière spéciale (§5.3) — crée la matière école + la lie à la classe."""
    get_class(db, tenant_id, class_id)
    special = SpecialSubject(
        tenant_id=tenant_id, nom=payload.nom.strip(),
        coefficient=payload.coefficient, volume_horaire=payload.volume_horaire,
    )
    db.add(special)
    db.flush()
    m = ClasseMatiere(
        tenant_id=tenant_id, classe_id=class_id, source=SOURCE_SPECIALE,
        special_subject_id=special.id, nom=special.nom,
        coefficient=special.coefficient, volume_horaire=special.volume_horaire,
        enseignant_id=payload.enseignant_id,
        activated=True, is_obligatoire=False,
    )
    db.add(m)
    db.commit()
    db.refresh(m)
    return m
