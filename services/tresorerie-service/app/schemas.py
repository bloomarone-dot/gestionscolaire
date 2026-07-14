from datetime import date, datetime
from decimal import Decimal

from pydantic import BaseModel, Field, field_validator

try:
    from common.phone import normalize_phone
except ImportError:
    def normalize_phone(value):  # type: ignore
        return "".join(c for c in str(value or "") if c.isdigit())


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
    payment_token: str | None = None
    parent_phone: str | None = None
    mobile_provider: str | None = None
    provider_reference: str | None = None
    pay_token: str | None = None
    paid_online: bool = False
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class ParentLinkOut(BaseModel):
    payment_token: str
    payment_url: str


class PublicPaiementOut(BaseModel):
    establishment_hint: str = "École"
    student: str
    matricule: str | None
    label: str
    amount: Decimal
    currency: str
    due_date: date | None
    status: str
    paid_at: datetime | None
    receipt_number: str | None


class ParentPayInit(BaseModel):
    parent_phone: str
    provider: str = Field(..., description="MTN_MOMO ou ORANGE_MONEY")

    @field_validator("parent_phone")
    @classmethod
    def _phone(cls, value: str) -> str:
        normalized = normalize_phone(value)
        if len(normalized) < 9:
            raise ValueError("Numéro Mobile Money invalide")
        return normalized


class ParentPayInitOut(BaseModel):
    provider_reference: str
    mode: str
    instructions: list[str]
    message: str
    checkout_url: str | None = None
    sandbox: bool = False
    pay_token: str | None = None


class TresorerieStats(BaseModel):
    pending_count: int
    pending_amount: Decimal
    paid_month_count: int
    paid_month_amount: Decimal
    online_month_count: int = 0
    online_month_amount: Decimal = Decimal("0")
    cash_month_count: int = 0
    withdrawal_month_count: int = 0
    withdrawal_month_amount: Decimal = Decimal("0")
    caisse_solde: Decimal = Decimal("0")


class RetraitCreate(BaseModel):
    label: str = Field(..., min_length=1, max_length=200)
    amount: Decimal = Field(..., gt=0)
    currency: str = "XAF"
    category: str | None = None
    notes: str | None = None


class RetraitOut(BaseModel):
    id: int
    tenant_id: int
    label: str
    amount: Decimal
    currency: str
    category: str | None
    notes: str | None
    recorded_by: int | None
    created_at: datetime

    model_config = {"from_attributes": True}


# ── Grille de frais (inscription + 3 tranches) ────────────────────────────
class FeeScheduleIn(BaseModel):
    classe_nom: str | None = None
    inscription: Decimal = Field(default=Decimal("0"), ge=0)
    tranche1: Decimal = Field(default=Decimal("0"), ge=0)
    tranche2: Decimal = Field(default=Decimal("0"), ge=0)
    tranche3: Decimal = Field(default=Decimal("0"), ge=0)
    t1_start_month: int | None = Field(default=None, ge=1, le=12)
    t1_end_month: int | None = Field(default=None, ge=1, le=12)
    t2_start_month: int | None = Field(default=None, ge=1, le=12)
    t2_end_month: int | None = Field(default=None, ge=1, le=12)
    t3_start_month: int | None = Field(default=None, ge=1, le=12)
    t3_end_month: int | None = Field(default=None, ge=1, le=12)


class FeeScheduleOut(FeeScheduleIn):
    classe_id: int
    model_config = {"from_attributes": True}


# ── Paiement de scolarité (allocation automatique) ────────────────────────
class PensionPayIn(BaseModel):
    eleve_id: int
    classe_id: int | None = None
    eleve_nom: str | None = None
    matricule: str | None = None
    amount: Decimal = Field(..., gt=0)
    payment_method: str = Field(default="ESPECES", pattern="^(ESPECES|MOBILE_MONEY|VIREMENT|CHEQUE)$")
    paid_online: bool = False


class BucketOut(BaseModel):
    fee_type: str
    label: str
    due: Decimal
    paid: Decimal
    reste: Decimal


class PensionSummaryOut(BaseModel):
    eleve_id: int
    classe_id: int | None = None
    buckets: list[BucketOut] = []
    total_due: Decimal = Decimal("0")
    total_paid: Decimal = Decimal("0")
    reste: Decimal = Decimal("0")
    expected_due_now: Decimal = Decimal("0")
    en_regle: bool = True
    status: str = "NON_DEMARRE"


class PensionAllocation(BaseModel):
    fee_type: str
    label: str
    amount: Decimal


class PensionPayResult(BaseModel):
    receipt_number: str | None = None
    allocations: list[PensionAllocation] = []
    summary: PensionSummaryOut


class PensionAccountOut(BaseModel):
    eleve_id: int
    classe_id: int | None = None
    eleve_nom: str | None = None
    matricule: str | None = None
    inscription_paid: Decimal = Decimal("0")
    tranche1_paid: Decimal = Decimal("0")
    tranche2_paid: Decimal = Decimal("0")
    tranche3_paid: Decimal = Decimal("0")
    total_paid: Decimal = Decimal("0")
