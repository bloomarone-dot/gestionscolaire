from typing import Optional

from pydantic import BaseModel, Field


class LoginRequest(BaseModel):
    phone: str = Field(..., description="Numéro de téléphone (identifiant de connexion)")
    password: str


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
