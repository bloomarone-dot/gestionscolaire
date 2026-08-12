"""Pièces du dossier élève (checklist secrétariat, sans coffre-fort de fichiers)."""
from __future__ import annotations

import json

PIECE_DEFS = [
    ("acte_naissance", "Acte de naissance"),
    ("photo", "Photo d'identité"),
    ("bulletin_precedent", "Bulletin de l'année précédente"),
    ("quitus_ancienne_ecole", "Quitus de l'ancienne école"),
]

STATUS_MANQUANT = "manquant"
STATUS_RECU = "recu"
_VALID = {STATUS_MANQUANT, STATUS_RECU}


def default_pieces() -> dict[str, str]:
    return {key: STATUS_MANQUANT for key, _ in PIECE_DEFS}


def parse_pieces(raw) -> dict[str, str]:
    data = default_pieces()
    if not raw:
        return data
    if isinstance(raw, dict):
        incoming = raw
    else:
        try:
            incoming = json.loads(raw)
        except (TypeError, ValueError):
            return data
    if not isinstance(incoming, dict):
        return data
    for key, _ in PIECE_DEFS:
        value = incoming.get(key)
        if value in _VALID:
            data[key] = value
    return data


def serialize_pieces(raw) -> str:
    return json.dumps(parse_pieces(raw), ensure_ascii=False)


def pieces_complete(raw) -> bool:
    return all(status == STATUS_RECU for status in parse_pieces(raw).values())


def apply_photo_piece(pieces: dict[str, str], photo_url: str | None) -> dict[str, str]:
    out = dict(pieces)
    if photo_url:
        out["photo"] = STATUS_RECU
    return out
