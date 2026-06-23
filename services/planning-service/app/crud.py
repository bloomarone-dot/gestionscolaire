from datetime import time

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models import Salle, Seance
from app.schemas import SalleCreate, SalleUpdate, SeanceCreate, SeanceUpdate


def _times_overlap(debut_a: time, fin_a: time, debut_b: time, fin_b: time) -> bool:
    return debut_a < fin_b and debut_b < fin_a


def _assert_no_salle_conflict(
    db: Session,
    tenant_id: int,
    jour: int,
    debut: time,
    fin: time,
    salle_id: int | None,
    exclude_id: int | None = None,
) -> None:
    if salle_id is None:
        return
    q = select(Seance).where(
        Seance.tenant_id == tenant_id,
        Seance.salle_id == salle_id,
        Seance.jour_semaine == jour,
    )
    if exclude_id is not None:
        q = q.where(Seance.id != exclude_id)
    for other in db.scalars(q).all():
        if _times_overlap(debut, fin, other.heure_debut, other.heure_fin):
            raise ValueError(f"Conflit de salle avec le créneau {other.heure_debut}-{other.heure_fin}.")


# ── Salles ────────────────────────────────────────────────────────────────────
def list_salles(db: Session, tenant_id: int, *, actives_only: bool = False) -> list[Salle]:
    q = select(Salle).where(Salle.tenant_id == tenant_id)
    if actives_only:
        q = q.where(Salle.is_active.is_(True))
    return list(db.scalars(q.order_by(Salle.nom)).all())


def get_salle(db: Session, tenant_id: int, salle_id: int) -> Salle | None:
    return db.scalar(select(Salle).where(Salle.id == salle_id, Salle.tenant_id == tenant_id))


def create_salle(db: Session, tenant_id: int, payload: SalleCreate) -> Salle:
    row = Salle(tenant_id=tenant_id, **payload.model_dump())
    db.add(row)
    db.commit()
    db.refresh(row)
    return row


def update_salle(db: Session, tenant_id: int, salle_id: int, payload: SalleUpdate) -> Salle:
    row = get_salle(db, tenant_id, salle_id)
    if not row:
        raise LookupError("Salle introuvable")
    for key, value in payload.model_dump(exclude_unset=True).items():
        setattr(row, key, value)
    db.commit()
    db.refresh(row)
    return row


def delete_salle(db: Session, tenant_id: int, salle_id: int) -> None:
    row = get_salle(db, tenant_id, salle_id)
    if not row:
        raise LookupError("Salle introuvable")
    db.delete(row)
    db.commit()


# ── Séances ───────────────────────────────────────────────────────────────────
def list_seances(
    db: Session,
    tenant_id: int,
    *,
    classe_id: int | None = None,
    salle_id: int | None = None,
    jour_semaine: int | None = None,
    enseignant_id: int | None = None,
) -> list[Seance]:
    q = select(Seance).where(Seance.tenant_id == tenant_id)
    if classe_id is not None:
        q = q.where(Seance.classe_id == classe_id)
    if salle_id is not None:
        q = q.where(Seance.salle_id == salle_id)
    if jour_semaine is not None:
        q = q.where(Seance.jour_semaine == jour_semaine)
    if enseignant_id is not None:
        q = q.where(Seance.enseignant_id == enseignant_id)
    q = q.order_by(Seance.jour_semaine, Seance.heure_debut)
    return list(db.scalars(q).all())


def get_seance(db: Session, tenant_id: int, seance_id: int) -> Seance | None:
    return db.scalar(select(Seance).where(Seance.id == seance_id, Seance.tenant_id == tenant_id))


def create_seance(db: Session, tenant_id: int, payload: SeanceCreate) -> Seance:
    _assert_no_salle_conflict(
        db, tenant_id, payload.jour_semaine,
        payload.heure_debut, payload.heure_fin, payload.salle_id,
    )
    row = Seance(tenant_id=tenant_id, **payload.model_dump())
    db.add(row)
    db.commit()
    db.refresh(row)
    return row


def update_seance(db: Session, tenant_id: int, seance_id: int, payload: SeanceUpdate) -> Seance:
    row = get_seance(db, tenant_id, seance_id)
    if not row:
        raise LookupError("Séance introuvable")
    data = payload.model_dump(exclude_unset=True)
    for key, value in data.items():
        setattr(row, key, value)
    debut = row.heure_debut
    fin = row.heure_fin
    if fin <= debut:
        raise ValueError("L'heure de fin doit être après l'heure de début.")
    _assert_no_salle_conflict(
        db, tenant_id, row.jour_semaine, debut, fin, row.salle_id, exclude_id=row.id,
    )
    db.commit()
    db.refresh(row)
    return row


def delete_seance(db: Session, tenant_id: int, seance_id: int) -> None:
    row = get_seance(db, tenant_id, seance_id)
    if not row:
        raise LookupError("Séance introuvable")
    db.delete(row)
    db.commit()


def semaine(
    db: Session,
    tenant_id: int,
    *,
    classe_id: int | None = None,
    salle_id: int | None = None,
) -> dict[int, list[Seance]]:
    rows = list_seances(db, tenant_id, classe_id=classe_id, salle_id=salle_id)
    out: dict[int, list[Seance]] = {i: [] for i in range(7)}
    for row in rows:
        out.setdefault(row.jour_semaine, []).append(row)
    for day in out:
        out[day].sort(key=lambda s: s.heure_debut)
    return out
