from datetime import date, datetime
from decimal import Decimal

from pydantic import BaseModel, Field


class PaiementCreate(BaseModel):
    eleve_id: int
    eleve_nom: str | None = None
    eleve_prenom: str | None = None
    matricule: str | None = None
    label: str = Field(..., min_length=1, max_length=200)
    amount: Decimal = Field(..., gt=0)
    currency: str = "XAF"
    due_date: date | None = None
    notes: str | None = None


class PaiementEncaisser(BaseModel):
    payment_method: str = Field(..., pattern="^(ESPECES|MOBILE_MONEY|VIREMENT|CHEQUE)$")
    paid_at: datetime | None = None
    notes: str | None = None


class PaiementOut(BaseModel):
    id: int
    tenant_id: int
    eleve_id: int
    eleve_nom: str | None
    eleve_prenom: str | None
    matricule: str | None
    label: str
    amount: Decimal
    currency: str
    due_date: date | None
    paid_at: datetime | None
    status: str
    payment_method: str | None
    receipt_number: str | None
    notes: str | None
    recorded_by: int | None
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class TresorerieStats(BaseModel):
    pending_count: int
    pending_amount: Decimal
    paid_month_count: int
    paid_month_amount: Decimal
