"""Attribution automatique fonction → rôle de connexion (école primaire)."""
from __future__ import annotations

import json
from typing import Any

# Fonctions considérées comme enseignantes (profil ENSEIGNANT).
TEACHER_FONCTIONS = frozenset({
    "Enseignant",
    "Instituteur",
    "Institutrice",
    "Maître",
    "Maîtresse",
})

# Mapping par défaut fonction → rôle auth (admin peut surcharger via paramètres école).
DEFAULT_FONCTION_AUTH_ROLES: dict[str, str] = {
    "Enseignant": "enseignant",
    "Instituteur": "enseignant",
    "Institutrice": "enseignant",
    "Maître": "enseignant",
    "Maîtresse": "enseignant",
    "Directeur": "direction",
    "Directrice": "direction",
    "Censeur": "direction",
    "Principal": "direction",
    "Surveillant": "direction",
    "Surveillant General": "direction",
    "Surveillant de discipline": "direction",
    "Agent de sécurité": "direction",
    "Agent d'entretien": "direction",
    "Personnel de santé": "direction",
    "Chauffeur": "direction",
    "Secrétaire": "secretaire",
    "Directeur d'etudes": "direction",
}


def parse_operational_settings(raw: str | None) -> dict[str, Any]:
    if not raw:
        return {"personnel_auto_roles": False, "fonction_auth_roles": {}}
    try:
        data = json.loads(raw)
        if not isinstance(data, dict):
            return {"personnel_auto_roles": False, "fonction_auth_roles": {}}
        return {
            "personnel_auto_roles": bool(data.get("personnel_auto_roles")),
            "fonction_auth_roles": dict(data.get("fonction_auth_roles") or {}),
        }
    except (json.JSONDecodeError, TypeError):
        return {"personnel_auto_roles": False, "fonction_auth_roles": {}}


def dump_operational_settings(data: dict[str, Any]) -> str:
    return json.dumps(
        {
            "personnel_auto_roles": bool(data.get("personnel_auto_roles")),
            "fonction_auth_roles": dict(data.get("fonction_auth_roles") or {}),
        },
        ensure_ascii=False,
    )


def resolve_auth_role(fonction: str | None, settings: dict[str, Any] | None = None) -> str:
    fn = (fonction or "").strip()
    custom = (settings or {}).get("fonction_auth_roles") or {}
    if fn in custom:
        return str(custom[fn])
    if fn in DEFAULT_FONCTION_AUTH_ROLES:
        return DEFAULT_FONCTION_AUTH_ROLES[fn]
    if fn in TEACHER_FONCTIONS:
        return "enseignant"
    return "direction"


def is_teacher_fonction(fonction: str | None) -> bool:
    return (fonction or "").strip() in TEACHER_FONCTIONS
