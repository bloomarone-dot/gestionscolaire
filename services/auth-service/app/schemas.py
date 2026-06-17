from typing import Optional

from pydantic import BaseModel, Field, field_validator


def normalize_phone(value: str) -> str:
    digits = "".join(c for c in str(value or "") if c.isdigit())
    if digits.startswith("237") and len(digits) > 9:
        return digits[3:]
    return digits


class LoginRequest(BaseModel):
    phone: str = Field(..., description="Numéro de téléphone (identifiant de connexion)")
    password: str

    @field_validator("phone")
    @classmethod
    def _normalize_phone(cls, value: str) -> str:
        normalized = normalize_phone(value)
        if not normalized:
            raise ValueError("Numéro de téléphone invalide")
        return normalized


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user_id: int
    role: str
    tenant_id: Optional[int] = None
    first_name: Optional[str] = None
    last_name: Optional[str] = None


class AccountCreate(BaseModel):
    phone: str
    password: str
    role: str
    tenant_id: Optional[int] = None
    phone2: Optional[str] = None
    email: Optional[str] = None  # facultatif — jamais bloquant
    first_name: Optional[str] = None
    last_name: Optional[str] = None


class AccountResponse(BaseModel):
    id: int
    phone: str
    phone2: Optional[str] = None
    email: Optional[str] = None
    role: str
    tenant_id: Optional[int] = None
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    is_active: bool

    model_config = {"from_attributes": True}
