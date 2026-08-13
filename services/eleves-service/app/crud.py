"""Logique métier eleves-service (pure et testable)."""
from datetime import date, datetime, timedelta
from typing import Optional

import hmac
import secrets
from hashlib import sha256

from sqlalchemy.orm import Session, joinedload

from common.config import get_base_settings
from common.jwt import TokenPayload, create_access_token
from common.phone import normalize_phone

from app.level_order import ACTION_NEW, classify_level_move
from app.models import (
    MOUVEMENT_INSCRIPTION,
    MOUVEMENT_PROMOTION,
    MOUVEMENT_RADIATION,
    MOUVEMENT_REDOUBLEMENT,
    MOUVEMENT_REINSCRIPTION,
    MOUVEMENT_SORTIE,
    MOUVEMENT_TRANSFERT,
    PRESENCE_ABSENT,
    PRESENCE_PRESENT,
    PRESENCE_RETARD,
    STATUT_ABANDON,
    STATUT_DIPLOME,
    STATUT_EXCLU,
    STATUT_INSCRIT,
    STATUT_RADIE,
    Eleve,
    EleveMouvement,
    Parent,
    ParentAccess,
    Presence,
)
from app.pieces import apply_photo_piece, parse_pieces, serialize_pieces
from app.schemas import AppelIn, EleveCreate, EleveUpdate, PromotionApply, RadiationIn

# Statuts de promotion (§10)
PROMO_ADMIS = "ADMIS"
PROMO_REDOUBLE = "REDOUBLE"
PROMO_REORIENTE = "REORIENTE"
PROMO_SORTANT = "SORTANT"
PROMO_EXCLU = "EXCLU"
PROMO_ABANDON = "ABANDON"

PRESENCE_STATUTS = {PRESENCE_PRESENT, PRESENCE_ABSENT, PRESENCE_RETARD}


class NotFound(Exception):
    pass


class AuthError(Exception):
    pass


def generate_matricule(db: Session, tenant_id: int) -> str:
    year = datetime.utcnow().year
    seq = db.query(Eleve).filter(Eleve.tenant_id == tenant_id).count() + 1
    return f"{year}{tenant_id:03d}{seq:04d}"


def _pieces_for(payload_pieces, photo_url: Optional[str]) -> str:
    return serialize_pieces(apply_photo_piece(parse_pieces(payload_pieces), photo_url))


def log_mouvement(
    db: Session,
    tenant_id: int,
    eleve_id: int,
    kind: str,
    *,
    from_classe_id: Optional[int] = None,
    to_classe_id: Optional[int] = None,
    motif: Optional[str] = None,
) -> EleveMouvement:
    row = EleveMouvement(
        tenant_id=tenant_id,
        eleve_id=eleve_id,
        kind=kind,
        from_classe_id=from_classe_id,
        to_classe_id=to_classe_id,
        motif=motif,
    )
    db.add(row)
    return row


def find_existing_eleve(db: Session, tenant_id: int, payload: EleveCreate) -> Optional[Eleve]:
    """Retrouve un élève déjà inscrit (matricule, sinon nom + prénom + date de naissance)."""
    if payload.matricule:
        found = get_eleve_by_matricule(db, tenant_id, payload.matricule)
        if found:
            return found
    nom = (payload.nom or "").strip().lower()
    prenom = (payload.prenom or "").strip().lower()
    if not nom:
        return None
    q = db.query(Eleve).filter(Eleve.tenant_id == tenant_id, Eleve.nom.ilike(payload.nom.strip()))
    if prenom:
        q = q.filter(Eleve.prenom.ilike(payload.prenom.strip()))
    if payload.date_naissance:
        q = q.filter(Eleve.date_naissance == payload.date_naissance)
    return q.order_by(Eleve.id.desc()).first()


def reenroll_eleve(db: Session, tenant_id: int, existing: Eleve, payload: EleveCreate) -> tuple[Eleve, str, Optional[str], Optional[int]]:
    """Réinscrit un élève existant (passage, redoublement ou changement de classe)."""
    previous_level = existing.level_code
    previous_classe = existing.classe_id
    action = classify_level_move(
        previous_level, payload.level_code, previous_classe, payload.classe_id,
    )
    existing.nom = payload.nom
    if payload.prenom is not None:
        existing.prenom = payload.prenom
    if payload.date_naissance is not None:
        existing.date_naissance = payload.date_naissance
    if payload.sexe is not None:
        existing.sexe = payload.sexe
    if payload.lieu_naissance is not None:
        existing.lieu_naissance = payload.lieu_naissance
    if payload.photo_url is not None:
        existing.photo_url = payload.photo_url
    if payload.etat_sante is not None:
        existing.etat_sante = payload.etat_sante
    if payload.subsystem_code is not None:
        existing.subsystem_code = payload.subsystem_code
    if payload.type_code is not None:
        existing.type_code = payload.type_code
    if payload.cycle_code is not None:
        existing.cycle_code = payload.cycle_code
    if payload.level_code is not None:
        existing.level_code = payload.level_code
    if payload.series_code is not None:
        existing.series_code = payload.series_code
    if payload.pieces is not None or payload.photo_url:
        existing.pieces = _pieces_for(payload.pieces if payload.pieces is not None else existing.pieces, existing.photo_url)
    existing.classe_id = payload.classe_id
    existing.statut = STATUT_INSCRIT
    if payload.parents:
        existing.parents.clear()
        db.flush()
        for p in payload.parents:
            db.add(Parent(
                tenant_id=tenant_id, eleve_id=existing.id, nom=p.nom, phone=p.phone,
                phone2=p.phone2, adresse=p.adresse, email=p.email,
            ))
    kind = MOUVEMENT_REDOUBLEMENT if action == "REDOUBLE" else MOUVEMENT_REINSCRIPTION
    if action == "PROMOTION":
        kind = MOUVEMENT_PROMOTION
    elif action == "TRANSFER":
        kind = MOUVEMENT_TRANSFERT
    log_mouvement(
        db, tenant_id, existing.id, kind,
        from_classe_id=previous_classe, to_classe_id=payload.classe_id,
        motif=action,
    )
    db.commit()
    db.refresh(existing)
    return existing, action, previous_level, previous_classe


def enroll_eleve(db: Session, tenant_id: int, payload: EleveCreate) -> tuple[Eleve, str, Optional[str], Optional[int]]:
    """Nouvelle inscription, ou réinscription si l'élève est déjà connu."""
    existing = find_existing_eleve(db, tenant_id, payload)
    if existing:
        return reenroll_eleve(db, tenant_id, existing, payload)
    created = create_eleve(db, tenant_id, payload)
    return created, ACTION_NEW, None, None


def create_eleve(db: Session, tenant_id: int, payload: EleveCreate) -> Eleve:
    matricule = payload.matricule or generate_matricule(db, tenant_id)
    eleve = Eleve(
        tenant_id=tenant_id, matricule=matricule, nom=payload.nom, prenom=payload.prenom,
        date_naissance=payload.date_naissance, sexe=payload.sexe,
        lieu_naissance=payload.lieu_naissance,
        photo_url=payload.photo_url, etat_sante=payload.etat_sante,
        pieces=_pieces_for(payload.pieces, payload.photo_url),
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
    log_mouvement(db, tenant_id, eleve.id, MOUVEMENT_INSCRIPTION, to_classe_id=eleve.classe_id)
    db.commit()
    db.refresh(eleve)
    return eleve


def list_eleves(db: Session, tenant_id: int, classe_id: Optional[int] = None) -> list[Eleve]:
    q = db.query(Eleve).options(joinedload(Eleve.parents)).filter(Eleve.tenant_id == tenant_id)
    if classe_id is not None:
        q = q.filter(Eleve.classe_id == classe_id)
    return q.order_by(Eleve.nom, Eleve.prenom).all()


def get_eleve(db: Session, tenant_id: int, eleve_id: int) -> Eleve:
    e = db.query(Eleve).filter(Eleve.tenant_id == tenant_id, Eleve.id == eleve_id).first()
    if not e:
        raise NotFound("Élève introuvable")
    return e


def get_eleve_by_matricule(db: Session, tenant_id: int, matricule: str) -> Optional[Eleve]:
    key = (matricule or "").strip()
    if not key:
        return None
    return (
        db.query(Eleve)
        .filter(Eleve.tenant_id == tenant_id, Eleve.matricule == key)
        .first()
    )


def update_eleve(db: Session, tenant_id: int, eleve_id: int, payload: EleveUpdate) -> Eleve:
    e = get_eleve(db, tenant_id, eleve_id)
    data = payload.model_dump(exclude_unset=True)
    pieces = data.pop("pieces", None)
    for field, value in data.items():
        setattr(e, field, value)
    if pieces is not None or data.get("photo_url"):
        e.pieces = _pieces_for(pieces if pieces is not None else e.pieces, e.photo_url)
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
    log_mouvement(
        db, tenant_id, e.id, MOUVEMENT_TRANSFERT,
        from_classe_id=old, to_classe_id=new_classe_id,
    )
    db.commit()
    db.refresh(e)
    return e, old


def radier(db: Session, tenant_id: int, eleve_id: int, payload: RadiationIn) -> Eleve:
    e = get_eleve(db, tenant_id, eleve_id)
    old = e.classe_id
    motif = payload.motif
    if payload.destination_ecole:
        motif = f"{payload.motif} → {payload.destination_ecole}"
    e.statut = STATUT_RADIE
    e.classe_id = None
    log_mouvement(
        db, tenant_id, e.id, MOUVEMENT_RADIATION,
        from_classe_id=old, motif=motif,
    )
    db.commit()
    db.refresh(e)
    return e


def list_mouvements(db: Session, tenant_id: int, eleve_id: int) -> list[EleveMouvement]:
    get_eleve(db, tenant_id, eleve_id)
    return (
        db.query(EleveMouvement)
        .filter(EleveMouvement.tenant_id == tenant_id, EleveMouvement.eleve_id == eleve_id)
        .order_by(EleveMouvement.created_at.desc())
        .all()
    )


def apply_promotion(db: Session, tenant_id: int, payload: PromotionApply) -> list[dict]:
    """§10 — applique les décisions de passage et ré-inscrit Admis/Redouble/Réorienté."""
    results = []
    for item in payload.items:
        e = get_eleve(db, tenant_id, item.eleve_id)
        old_classe = e.classe_id
        if item.status in (PROMO_ADMIS, PROMO_REDOUBLE):
            if item.dest_classe_id is None:
                raise ValueError(f"Classe de destination requise pour l'élève {e.id}")
            e.classe_id = item.dest_classe_id
            if item.new_level_code:
                e.level_code = item.new_level_code
            e.statut = STATUT_INSCRIT
            kind = MOUVEMENT_REDOUBLEMENT if item.status == PROMO_REDOUBLE else MOUVEMENT_PROMOTION
        elif item.status == PROMO_REORIENTE:
            if item.dest_classe_id is None:
                raise ValueError(f"Classe de destination requise pour l'élève {e.id}")
            e.classe_id = item.dest_classe_id
            if item.new_series_code:
                e.series_code = item.new_series_code
            if item.new_level_code:
                e.level_code = item.new_level_code
            e.statut = STATUT_INSCRIT
            kind = MOUVEMENT_TRANSFERT
        elif item.status == PROMO_SORTANT:
            e.classe_id = None
            e.statut = STATUT_DIPLOME
            kind = MOUVEMENT_SORTIE
        elif item.status == PROMO_EXCLU:
            e.classe_id = None
            e.statut = STATUT_EXCLU
            kind = MOUVEMENT_SORTIE
        elif item.status == PROMO_ABANDON:
            e.classe_id = None
            e.statut = STATUT_ABANDON
            kind = MOUVEMENT_SORTIE
        else:
            raise ValueError(f"Statut de promotion inconnu : {item.status}")
        log_mouvement(
            db, tenant_id, e.id, kind,
            from_classe_id=old_classe, to_classe_id=e.classe_id, motif=item.status,
        )
        results.append({"eleve_id": e.id, "status": item.status, "classe_id": e.classe_id})
    db.commit()
    return results


def primary_parent_phone(e: Eleve) -> Optional[str]:
    return e.parents[0].phone if e.parents else None


def _hash_pin(pin: str) -> str:
    secret = get_base_settings().jwt_secret.encode()
    return hmac.new(secret, pin.encode(), sha256).hexdigest()


def generate_parent_code(db: Session, tenant_id: int, eleve_id: int) -> tuple[str, str]:
    e = get_eleve(db, tenant_id, eleve_id)
    phone = normalize_phone(primary_parent_phone(e))
    if not phone:
        raise ValueError("Aucun téléphone parent sur ce dossier.")
    pin = f"{secrets.randbelow(1_000_000):06d}"
    row = (
        db.query(ParentAccess)
        .filter(ParentAccess.tenant_id == tenant_id, ParentAccess.phone == phone)
        .first()
    )
    if row is None:
        row = ParentAccess(tenant_id=tenant_id, phone=phone, pin_hash=_hash_pin(pin))
        db.add(row)
    else:
        row.pin_hash = _hash_pin(pin)
        row.created_at = datetime.utcnow()
    db.commit()
    return phone, pin


def login_parent(db: Session, phone: str, pin: str) -> tuple[ParentAccess, str]:
    key = normalize_phone(phone)
    if not key or not pin:
        raise AuthError("Téléphone ou code invalide.")
    pin_hash = _hash_pin(pin)
    matches = (
        db.query(ParentAccess)
        .filter(ParentAccess.phone == key, ParentAccess.pin_hash == pin_hash)
        .all()
    )
    if not matches:
        # Anciens dossiers : téléphone stocké non normalisé.
        matches = [
            row for row in db.query(ParentAccess).all()
            if normalize_phone(row.phone) == key and hmac.compare_digest(row.pin_hash, pin_hash)
        ]
    if not matches:
        raise AuthError("Téléphone ou code incorrect.")
    access = matches[0]
    token = create_access_token(
        TokenPayload(sub=access.phone, user_id=access.id, role="parent", tenant_id=access.tenant_id),
        expires_delta=timedelta(days=7),
    )
    return access, token


def list_eleves_for_parent_phone(db: Session, tenant_id: int, phone: str) -> list[Eleve]:
    key = normalize_phone(phone)
    eleves = (
        db.query(Eleve)
        .options(joinedload(Eleve.parents), joinedload(Eleve.mouvements))
        .filter(Eleve.tenant_id == tenant_id)
        .all()
    )
    out = []
    for e in eleves:
        for parent in e.parents:
            if normalize_phone(parent.phone) == key or normalize_phone(parent.phone2) == key:
                out.append(e)
                break
    return out


def get_parent_access(db: Session, tenant_id: int, access_id: int) -> ParentAccess:
    row = (
        db.query(ParentAccess)
        .filter(ParentAccess.tenant_id == tenant_id, ParentAccess.id == access_id)
        .first()
    )
    if not row:
        raise NotFound("Accès parent introuvable")
    return row


def save_appel(db: Session, tenant_id: int, payload: AppelIn) -> tuple[list[Presence], list[Presence]]:
    """Enregistre l'appel du jour. Retourne (toutes les lignes, absences nouvellement posées)."""
    if not payload.items:
        raise ValueError("L'appel doit contenir au moins un élève.")
    absents_before = {
        row.eleve_id
        for row in db.query(Presence).filter(
            Presence.tenant_id == tenant_id,
            Presence.classe_id == payload.classe_id,
            Presence.jour == payload.jour,
            Presence.statut == PRESENCE_ABSENT,
        )
    }
    saved: list[Presence] = []
    for item in payload.items:
        statut = (item.statut or PRESENCE_PRESENT).upper()
        if statut not in PRESENCE_STATUTS:
            raise ValueError(f"Statut de présence inconnu : {item.statut}")
        get_eleve(db, tenant_id, item.eleve_id)
        row = (
            db.query(Presence)
            .filter(
                Presence.tenant_id == tenant_id,
                Presence.classe_id == payload.classe_id,
                Presence.eleve_id == item.eleve_id,
                Presence.jour == payload.jour,
            )
            .first()
        )
        if row is None:
            row = Presence(
                tenant_id=tenant_id,
                classe_id=payload.classe_id,
                eleve_id=item.eleve_id,
                jour=payload.jour,
                statut=statut,
                motif=item.motif,
            )
            db.add(row)
        else:
            row.statut = statut
            row.motif = item.motif
        saved.append(row)
    db.commit()
    for row in saved:
        db.refresh(row)
    newly_absent = [row for row in saved if row.statut == PRESENCE_ABSENT and row.eleve_id not in absents_before]
    return saved, newly_absent


def list_presences(db: Session, tenant_id: int, classe_id: int, jour: date) -> list[Presence]:
    return (
        db.query(Presence)
        .filter(
            Presence.tenant_id == tenant_id,
            Presence.classe_id == classe_id,
            Presence.jour == jour,
        )
        .all()
    )


def list_absences_eleve(db: Session, tenant_id: int, eleve_id: int, limit: int = 20) -> list[Presence]:
    return (
        db.query(Presence)
        .filter(
            Presence.tenant_id == tenant_id,
            Presence.eleve_id == eleve_id,
            Presence.statut == PRESENCE_ABSENT,
        )
        .order_by(Presence.jour.desc())
        .limit(limit)
        .all()
    )


# ── Discipline ────────────────────────────────────────────────────────────────

from app.models import (  # noqa: E402
    CONSEIL_BROUILLON,
    CONSEIL_VALIDE,
    DECISION_A_DELIBERER,
    EXAM_RESULT_INSCRIT,
    ConseilDecision,
    ConseilSession,
    ExamCandidat,
    Sanction,
)
from app.schemas import (  # noqa: E402
    ConseilCreate,
    ConseilDecisionsBulk,
    ExamCandidatIn,
    SanctionIn,
)
from app.vie_scolaire import SANCTION_KINDS, suggest_decision, mention_from_moyenne  # noqa: E402


def create_sanction(db: Session, tenant_id: int, payload: SanctionIn, recorded_by: int | None) -> Sanction:
    kind = (payload.kind or "").upper()
    if kind not in SANCTION_KINDS:
        raise ValueError(f"Type de sanction inconnu : {payload.kind}")
    eleve = get_eleve(db, tenant_id, payload.eleve_id)
    row = Sanction(
        tenant_id=tenant_id,
        eleve_id=payload.eleve_id,
        classe_id=payload.classe_id or eleve.classe_id,
        kind=kind,
        jour=payload.jour,
        motif=payload.motif,
        duree_jours=payload.duree_jours,
        convocation_at=payload.convocation_at,
        recorded_by=recorded_by,
    )
    db.add(row)
    db.commit()
    db.refresh(row)
    return row


def list_sanctions(
    db: Session,
    tenant_id: int,
    *,
    eleve_id: int | None = None,
    classe_id: int | None = None,
    kind: str | None = None,
) -> list[Sanction]:
    q = db.query(Sanction).filter(Sanction.tenant_id == tenant_id)
    if eleve_id is not None:
        q = q.filter(Sanction.eleve_id == eleve_id)
    if classe_id is not None:
        q = q.filter(Sanction.classe_id == classe_id)
    if kind:
        q = q.filter(Sanction.kind == kind.upper())
    return q.order_by(Sanction.jour.desc(), Sanction.id.desc()).all()


def get_sanction(db: Session, tenant_id: int, sanction_id: int) -> Sanction:
    row = db.query(Sanction).filter(Sanction.tenant_id == tenant_id, Sanction.id == sanction_id).first()
    if not row:
        raise NotFound("Sanction introuvable")
    return row


def delete_sanction(db: Session, tenant_id: int, sanction_id: int) -> None:
    row = get_sanction(db, tenant_id, sanction_id)
    db.delete(row)
    db.commit()


def count_sanctions_eleve(db: Session, tenant_id: int, eleve_id: int) -> int:
    return (
        db.query(Sanction)
        .filter(Sanction.tenant_id == tenant_id, Sanction.eleve_id == eleve_id)
        .count()
    )


# ── Conseil de classe ─────────────────────────────────────────────────────────

def create_conseil(
    db: Session,
    tenant_id: int,
    payload: ConseilCreate,
    bulletin_by_eleve: dict[int, dict] | None = None,
) -> ConseilSession:
    eleves = list_eleves(db, tenant_id, payload.classe_id)
    if not eleves:
        raise ValueError("Aucun élève dans cette classe.")
    session = ConseilSession(
        tenant_id=tenant_id,
        classe_id=payload.classe_id,
        trimestre=payload.trimestre or 1,
        titre=payload.titre or f"Conseil T{payload.trimestre or 1}",
        held_on=payload.held_on,
        notes=payload.notes,
        statut=CONSEIL_BROUILLON,
    )
    db.add(session)
    db.flush()
    bulletin_by_eleve = bulletin_by_eleve or {}
    for e in eleves:
        info = bulletin_by_eleve.get(e.id) or {}
        moyenne_raw = info.get("moyenne")
        try:
            moyenne_f = float(moyenne_raw) if moyenne_raw is not None else None
        except (TypeError, ValueError):
            moyenne_f = None
        db.add(ConseilDecision(
            tenant_id=tenant_id,
            session_id=session.id,
            eleve_id=e.id,
            rang=info.get("rang"),
            moyenne=str(moyenne_raw) if moyenne_raw is not None else None,
            mention=info.get("mention") or mention_from_moyenne(moyenne_f),
            decision=info.get("decision") or suggest_decision(moyenne_f),
            observation=None,
        ))
    db.commit()
    db.refresh(session)
    return get_conseil(db, tenant_id, session.id)


def list_conseils(db: Session, tenant_id: int, classe_id: int | None = None) -> list[ConseilSession]:
    q = db.query(ConseilSession).filter(ConseilSession.tenant_id == tenant_id)
    if classe_id is not None:
        q = q.filter(ConseilSession.classe_id == classe_id)
    return q.order_by(ConseilSession.created_at.desc()).all()


def get_conseil(db: Session, tenant_id: int, session_id: int) -> ConseilSession:
    row = (
        db.query(ConseilSession)
        .options(joinedload(ConseilSession.decisions))
        .filter(ConseilSession.tenant_id == tenant_id, ConseilSession.id == session_id)
        .first()
    )
    if not row:
        raise NotFound("Conseil de classe introuvable")
    return row


def update_conseil_decisions(
    db: Session, tenant_id: int, session_id: int, payload: ConseilDecisionsBulk,
) -> ConseilSession:
    session = get_conseil(db, tenant_id, session_id)
    if session.statut == CONSEIL_VALIDE:
        raise ValueError("Conseil déjà validé — décisions verrouillées.")
    by_eleve = {d.eleve_id: d for d in session.decisions}
    for item in payload.decisions:
        row = by_eleve.get(item.eleve_id)
        if row is None:
            row = ConseilDecision(
                tenant_id=tenant_id, session_id=session.id, eleve_id=item.eleve_id,
                decision=DECISION_A_DELIBERER,
            )
            db.add(row)
            by_eleve[item.eleve_id] = row
        if item.rang is not None:
            row.rang = item.rang
        if item.moyenne is not None:
            row.moyenne = item.moyenne
        if item.mention is not None:
            row.mention = item.mention
        if item.decision:
            row.decision = item.decision
        if item.observation is not None:
            row.observation = item.observation
    db.commit()
    return get_conseil(db, tenant_id, session_id)


def validate_conseil(db: Session, tenant_id: int, session_id: int) -> ConseilSession:
    session = get_conseil(db, tenant_id, session_id)
    session.statut = CONSEIL_VALIDE
    db.commit()
    return get_conseil(db, tenant_id, session_id)


# ── Examens officiels ─────────────────────────────────────────────────────────

def upsert_exam_candidat(db: Session, tenant_id: int, payload: ExamCandidatIn) -> ExamCandidat:
    eleve = get_eleve(db, tenant_id, payload.eleve_id)
    row = (
        db.query(ExamCandidat)
        .filter(
            ExamCandidat.tenant_id == tenant_id,
            ExamCandidat.eleve_id == payload.eleve_id,
            ExamCandidat.exam_code == payload.exam_code,
            ExamCandidat.session_label == payload.session_label,
        )
        .first()
    )
    if row is None:
        row = ExamCandidat(
            tenant_id=tenant_id,
            eleve_id=payload.eleve_id,
            exam_code=payload.exam_code,
            session_label=payload.session_label,
        )
        db.add(row)
    row.classe_id = payload.classe_id or eleve.classe_id
    row.centre = payload.centre
    row.numero_table = payload.numero_table
    row.matieres = payload.matieres
    row.resultat = payload.resultat or EXAM_RESULT_INSCRIT
    db.commit()
    db.refresh(row)
    return row


def list_exam_candidats(
    db: Session,
    tenant_id: int,
    *,
    exam_code: str | None = None,
    session_label: str | None = None,
    classe_id: int | None = None,
) -> list[ExamCandidat]:
    q = db.query(ExamCandidat).filter(ExamCandidat.tenant_id == tenant_id)
    if exam_code:
        q = q.filter(ExamCandidat.exam_code == exam_code)
    if session_label:
        q = q.filter(ExamCandidat.session_label == session_label)
    if classe_id is not None:
        q = q.filter(ExamCandidat.classe_id == classe_id)
    return q.order_by(ExamCandidat.exam_code, ExamCandidat.numero_table, ExamCandidat.id).all()


def delete_exam_candidat(db: Session, tenant_id: int, candidat_id: int) -> None:
    row = (
        db.query(ExamCandidat)
        .filter(ExamCandidat.tenant_id == tenant_id, ExamCandidat.id == candidat_id)
        .first()
    )
    if not row:
        raise NotFound("Candidat introuvable")
    db.delete(row)
    db.commit()


def eleves_for_exam_levels(db: Session, tenant_id: int, level_codes: set[str]) -> list[Eleve]:
    if not level_codes:
        return []
    return (
        db.query(Eleve)
        .options(joinedload(Eleve.parents))
        .filter(
            Eleve.tenant_id == tenant_id,
            Eleve.statut == STATUT_INSCRIT,
            Eleve.level_code.in_(list(level_codes)),
        )
        .order_by(Eleve.nom, Eleve.prenom)
        .all()
    )
