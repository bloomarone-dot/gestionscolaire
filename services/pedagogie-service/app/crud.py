"""Logique métier pedagogie-service (pure et testable — sans I/O réseau)."""
from typing import Optional

from sqlalchemy import func
from sqlalchemy.orm import Session

from app.models import (
    SOURCE_OFFICIELLE,
    SOURCE_SPECIALE,
    Classe,
    ClasseMatiere,
    SpecialSubject,
)
from app.schemas import ClasseCreate, MatiereUpdate, SpecialMatiereCreate


class ConfirmationRequired(Exception):
    """Levée quand on décoche une matière obligatoire sans confirmation (§5.2)."""


class NotFound(Exception):
    pass


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
    classe = Classe(
        tenant_id=tenant_id,
        nom_personnalise=payload.nom_personnalise.strip(),
        effectif_max=payload.effectif_max,
        prof_principal_id=payload.prof_principal_id,
        is_special=payload.is_special,
    )
    if payload.is_special:
        classe.niveau_libre = payload.niveau_libre
        classe.specialite_libre = payload.specialite_libre
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


def list_classes(db: Session, tenant_id: int) -> list[tuple[Classe, int]]:
    classes = (
        db.query(Classe)
        .filter(Classe.tenant_id == tenant_id)
        .order_by(Classe.nom_personnalise)
        .all()
    )
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
        activated=True, is_obligatoire=False,
    )
    db.add(m)
    db.commit()
    db.refresh(m)
    return m
