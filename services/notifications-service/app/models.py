"""notifications-service — historique des notifications (cahier §12.2).

Toute notification (envoyée ou échouée) est conservée pour preuve d'envoi.
"""
from datetime import datetime

from sqlalchemy import Column, DateTime, Integer, String, Text

from common.db import Base

STATUS_SENT = "SENT"
STATUS_FAILED = "FAILED"
STATUS_SKIPPED = "SKIPPED"


class Notification(Base):
    __tablename__ = "notifications"

    id = Column(Integer, primary_key=True)
    tenant_id = Column(Integer, nullable=False, index=True)

    event = Column(String(40), nullable=False)        # StudentEnrolled, BulletinPublished…
    recipient = Column(String(120), nullable=True)    # téléphone / email / descripteur
    channel = Column(String(20), nullable=False)      # SMS | WHATSAPP | EMAIL | INTERNAL
    content = Column(Text, nullable=False)
    status = Column(String(12), nullable=False, default=STATUS_SENT)

    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
