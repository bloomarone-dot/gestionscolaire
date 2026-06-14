"""Logique métier eleves-service (pure et testable)."""
from datetime import datetime
from typing import Optional

from sqlalchemy.orm import Session

from app.models import (
    STATUT_DIPLOME,
    STATUT_INSCRIT,
    Eleve,
    Parent,
)
from app.schemas import EleveCreate, EleveUpdate, PromotionApply

# Statuts de promotion (§10)
PROMO_ADMIS = "ADMIS"
PROMO_REDOUBLE = "REDOUBLE"
PROMO_REORIENTE = "REORIENTE"
PROMO_SORTANT = "SORTANT"


class NotFound(Exception):
    pass


def generate_matricule(db: Session, tenant_id: int) -> str:
    year = datetime.utcnow().year
    seq = db.query(Eleve).filter(Eleve.tenant_id == tenant_id).count() + 1
    return f"{year}{tenant_id:03d}{seq:04d}"


def create_eleve(db: Session, tenant_id: int, payload: EleveCreate) -> Eleve:
    matricule = payload.matricule or generate_matricule(db, tenant_id)
    eleve = Eleve(
        tenant_id=tenant_id, matricule=matricule, nom=payload.nom, prenom=payload.prenom,
        date_naissance=payload.date_naissance, sexe=payload.sexe,
        lieu_naissance=payload.lieu_naissance,
        subsystem_code=payload.subsystem_code, type_code=payload.type_code,
        cycle_code=payload.cycle_code, level_code=payload.level_code,
        series_code=payload.series_code, classe_id=payload.classe_id,
        statut=STATUT_INSCRIT,
    )
    db.add(eleve)
    db.flush()
    for p in payload.parents:
        db.add(Parent(
            tenant_id=tenant_id, eleve_id=eleve.id, nom=p.nom, phone=p.phone,
            phone2=p.phone2, adresse=p.adresse, email=p.email,
        ))
    db.commit()
    db.refresh(eleve)
    return eleve


def list_eleves(db: Session, tenant_id: int, classe_id: Optional[int] = None) -> list[Eleve]:
    q = db.query(Eleve).filter(Eleve.tenant_id == tenant_id)
    if classe_id is not None:
        q = q.filter(Eleve.classe_id == classe_id)
    return q.order_by(Eleve.nom, Eleve.prenom).all()


def get_eleve(db: Session, tenant_id: int, eleve_id: int) -> Eleve:
    e = db.query(Eleve).filter(Eleve.tenant_id == tenant_id, Eleve.id == eleve_id).first()
    if not e:
        raise NotFound("Élève introuvable")
    return e


def update_eleve(db: Session, tenant_id: int, eleve_id: int, payload: EleveUpdate) -> Eleve:
    e = get_eleve(db, tenant_id, eleve_id)
    for field, value in payload.model_dump(exclude_unset=True).items():
        setattr(e, field, value)
    db.commit()
    db.refresh(e)
    return e


def delete_eleve(db: Session, tenant_id: int, eleve_id: int) -> None:
    """Supprime un élève (et ses parents en cascade)."""
    e = get_eleve(db, tenant_id, eleve_id)
    db.delete(e)
    db.commit()


def transfer(db: Session, tenant_id: int, eleve_id: int, new_classe_id: int) -> tuple[Eleve, Optional[int]]:
    """§6.3 — change de classe (même niveau). L'historique des notes (autre service) est conservé."""
    e = get_eleve(db, tenant_id, eleve_id)
    old = e.classe_id
    e.classe_id = new_classe_id
    e.statut = STATUT_INSCRIT
    db.commit()
    db.refresh(e)
    return e, old


def apply_promotion(db: Session, tenant_id: int, payload: PromotionApply) -> list[dict]:
    """§10 — applique les décisions de passage et ré-inscrit Admis/Redouble/Réorienté."""
    results = []
    for item in payload.items:
        e = get_eleve(db, tenant_id, item.eleve_id)
        if item.status in (PROMO_ADMIS, PROMO_REDOUBLE):
            if item.dest_classe_id is None:
                raise ValueError(f"Classe de destination requise pour l'élève {e.id}")
            e.classe_id = item.dest_classe_id
            e.statut = STATUT_INSCRIT
        elif item.status == PROMO_REORIENTE:
            if item.dest_classe_id is None:
                raise ValueError(f"Classe de destination requise pour l'élève {e.id}")
            e.classe_id = item.dest_classe_id
            if item.new_series_code:
                e.series_code = item.new_series_code
            e.statut = STATUT_INSCRIT
        elif item.status == PROMO_SORTANT:
            e.classe_id = None
            e.statut = STATUT_DIPLOME
        else:
            raise ValueError(f"Statut de promotion inconnu : {item.status}")
        results.append({"eleve_id": e.id, "status": item.status, "classe_id": e.classe_id})
    db.commit()
    return results


def primary_parent_phone(e: Eleve) -> Optional[str]:
    return e.parents[0].phone if e.parents else None
