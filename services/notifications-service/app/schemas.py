from datetime import datetime
from typing import List, Optional

from pydantic import BaseModel


class NotificationOut(BaseModel):
    id: int
    event: str
    recipient: Optional[str] = None
    channel: str
    content: str
    status: str
    created_at: datetime
    model_config = {"from_attributes": True}


class AnnouncementIn(BaseModel):
    """Annonce générale (§12.1) — texte libre envoyé aux destinataires choisis."""
    content: str
    recipients: List[str] = []          # téléphones / emails
    channels: List[str] = ["INTERNAL"]  # SMS | WHATSAPP | EMAIL | INTERNAL
