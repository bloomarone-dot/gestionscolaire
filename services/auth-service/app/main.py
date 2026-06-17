"""auth-service — authentification par téléphone + mot de passe, émission JWT.

Service de référence du monorepo : il illustre la structure attendue de chaque
service (config, models, schemas, init DB, routeurs, /health).

Note multi-tenant : la table `accounts` n'est PAS soumise à la RLS — le login
doit retrouver un compte par téléphone *avant* de connaître le tenant. Les autres
services, eux, appliquent la RLS sur leurs tables école.
"""
from fastapi import Depends, FastAPI, HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from common.db import Base, get_engine, init_engine
from common.jwt import TokenPayload, create_access_token
from common.security import hash_password, verify_password
from common.tenant import TenantContext, require_roles

from app.config import settings
from app.models import Account, Role
from app.schemas import (
    AccountCreate,
    AccountResponse,
    LoginRequest,
    TokenResponse,
)

app = FastAPI(title="auth-service — SaaS Scolaire", version="0.1.0")


def _get_session() -> Session:
    from sqlalchemy.orm import sessionmaker

    return sessionmaker(bind=get_engine(), future=True)()


@app.on_event("startup")
def _startup() -> None:
    init_engine(settings.database_url)
    # Skeleton : création directe des tables. Remplacé par Alembic en Phase 5.
    Base.metadata.create_all(bind=get_engine())


@app.get("/health", tags=["infra"])
def health() -> dict:
    return {"status": "ok", "service": "auth-service"}


@app.post("/auth/login", response_model=TokenResponse, tags=["auth"])
def login(payload: LoginRequest) -> TokenResponse:
    session = _get_session()
    try:
        account = session.scalar(
            select(Account).where(Account.phone == payload.phone)
        )
        if not account or not verify_password(payload.password, account.hashed_password):
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Téléphone ou mot de passe incorrect",
            )
        if not account.is_active:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Ce compte est désactivé",
            )
        token = create_access_token(
            TokenPayload(
                sub=account.phone,
                user_id=account.id,
                role=account.role,
                tenant_id=account.tenant_id,
            )
        )
        return TokenResponse(
            access_token=token,
            user_id=account.id,
            role=account.role,
            tenant_id=account.tenant_id,
            first_name=account.first_name,
            last_name=account.last_name,
        )
    finally:
        session.close()


@app.post(
    "/auth/accounts",
    response_model=AccountResponse,
    status_code=status.HTTP_201_CREATED,
    tags=["auth"],
)
def create_account(
    payload: AccountCreate,
    ctx: TenantContext = Depends(require_roles(Role.SUPERADMIN, Role.ADMIN)),
) -> AccountResponse:
    """Crée un compte (appelé par l'admin établissement ou un service métier).

    Applique les règles téléphone du cahier des charges :
    - Direction : deux téléphones obligatoires ;
    - autres rôles : téléphone principal obligatoire ;
    - email toujours facultatif.
    """
    if payload.role == Role.DIRECTION and not payload.phone2:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="La Direction doit fournir deux numéros de téléphone.",
        )
    # Un admin d'établissement ne crée que dans son propre tenant.
    # Superadmin agissant sur un établissement (X-School-Id) : hériter ctx.tenant_id.
    tenant_id = payload.tenant_id
    if ctx.role == Role.ADMIN:
        tenant_id = ctx.tenant_id
    elif tenant_id is None and ctx.tenant_id is not None:
        tenant_id = ctx.tenant_id

    session = _get_session()
    try:
        if session.scalar(select(Account).where(Account.phone == payload.phone)):
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="Ce numéro de téléphone est déjà utilisé.",
            )
        account = Account(
            phone=payload.phone,
            phone2=payload.phone2,
            email=payload.email,
            hashed_password=hash_password(payload.password),
            first_name=payload.first_name,
            last_name=payload.last_name,
            role=payload.role,
            tenant_id=tenant_id,
        )
        session.add(account)
        session.commit()
        session.refresh(account)
        return AccountResponse.model_validate(account)
    finally:
        session.close()


@app.delete("/auth/accounts/{account_id}", status_code=status.HTTP_204_NO_CONTENT, tags=["auth"])
def delete_account(
    account_id: int,
    ctx: TenantContext = Depends(require_roles(Role.SUPERADMIN, Role.ADMIN)),
) -> None:
    """Supprime un compte (rollback création personnel ou nettoyage admin)."""
    session = _get_session()
    try:
        account = session.get(Account, account_id)
        if not account:
            raise HTTPException(status.HTTP_404_NOT_FOUND, "Compte introuvable")
        if ctx.role == Role.ADMIN:
            if account.tenant_id != ctx.tenant_id:
                raise HTTPException(status.HTTP_403_FORBIDDEN, "Compte hors de votre établissement.")
            if account.role in (Role.ADMIN, Role.SUPERADMIN):
                raise HTTPException(status.HTTP_403_FORBIDDEN, "Impossible de supprimer ce type de compte.")
        session.delete(account)
        session.commit()
    finally:
        session.close()


@app.get("/auth/me", response_model=AccountResponse, tags=["auth"])
def me(ctx: TenantContext = Depends(require_roles(
    Role.SUPERADMIN, Role.ADMIN, Role.DIRECTION, Role.ENSEIGNANT, Role.PARENT
))) -> AccountResponse:
    session = _get_session()
    try:
        account = session.get(Account, ctx.user_id)
        if not account:
            raise HTTPException(status_code=404, detail="Compte introuvable")
        return AccountResponse.model_validate(account)
    finally:
        session.close()


@app.get("/auth/accounts", response_model=list[AccountResponse], tags=["auth"])
def list_accounts(
    role: str | None = None,
    ctx: TenantContext = Depends(require_roles(Role.SUPERADMIN)),
) -> list[AccountResponse]:
    """Liste les comptes plateforme (superadmin) — ex. admins d'établissement."""
    session = _get_session()
    try:
        q = select(Account)
        if role:
            q = q.where(Account.role == role)
        q = q.order_by(Account.created_at.desc())
        return [AccountResponse.model_validate(a) for a in session.scalars(q).all()]
    finally:
        session.close()
