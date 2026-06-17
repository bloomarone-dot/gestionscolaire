"""Tableau des notifications automatiques (cahier §12.1) — logique pure et testable.

`build_notifications(event, data, enabled_channels)` traduit un événement métier en
une liste de messages {recipient, channel, content}, en respectant :
- les canaux du tableau §12.1 ;
- les canaux activés par l'école (§12.2) si fournis (INTERNAL toujours autorisé) ;
- l'email n'est JAMAIS bloquant : le canal EMAIL n'est inclus que si une adresse
  est connue, et son absence ne supprime pas les autres canaux.
"""
from typing import Optional

SMS = "SMS"
WHATSAPP = "WHATSAPP"
EMAIL = "EMAIL"
INTERNAL = "INTERNAL"


def _full_name(data: dict) -> str:
    return f"{data.get('nom') or ''} {data.get('prenom') or ''}".strip()


def _messages_for(event: str, data: dict) -> list[tuple[Optional[str], list[str], str]]:
    """Retourne [(recipient, channels, content)] selon le tableau §12.1."""
    name = _full_name(data)
    if event == "StudentEnrolled":
        return [(
            data.get("parent_phone"), [SMS, INTERNAL],
            f"Confirmation d'inscription de {name} en classe {data.get('classe_id')}.",
        )]
    if event == "BulletinPublished":
        channels = [SMS, WHATSAPP]
        if data.get("parent_email"):
            channels.append(EMAIL)
        return [(
            data.get("parent_phone"), channels,
            f"Le bulletin de {name} – {data.get('classe')} – "
            f"Trimestre {data.get('trimestre')} est disponible.",
        )]
    if event == "TeacherAssigned":
        return [(
            data.get("enseignant_phone"), [SMS, INTERNAL],
            f"Vous êtes assigné(e) à {data.get('matiere')} pour la classe {data.get('classe')}.",
        )]
    if event == "ClassSubjectsUpdated":
        return [(
            f"teachers:classe:{data.get('classe_id')}", [INTERNAL],
            f"La liste des matières de la classe {data.get('classe_id')} a été mise à jour.",
        )]
    if event in ("StudentTransferred", "StudentPromoted"):
        new_classe = data.get("new_classe_id") or data.get("classe_id")
        return [(
            data.get("parent_phone"), [INTERNAL, SMS],
            f"{name} est désormais inscrit en classe {new_classe}.",
        )]
    return []


def build_notifications(
    event: str, data: dict, enabled_channels: Optional[set[str]] = None
) -> list[dict]:
    """Développe un événement en notifications par canal (§12)."""
    out: list[dict] = []
    for recipient, channels, content in _messages_for(event, data):
        for channel in channels:
            # §12.2 : respecter les canaux activés (INTERNAL toujours permis).
            if enabled_channels is not None and channel != INTERNAL and channel not in enabled_channels:
                continue
            # email jamais bloquant : déjà filtré en amont (inclus seulement si connu).
            out.append({"recipient": recipient, "channel": channel, "content": content})
    return out
