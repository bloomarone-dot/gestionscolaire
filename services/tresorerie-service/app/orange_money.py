"""Client API Orange Money Local (USSD / appel de fonds) — Cameroun.

Documentation : https://www.y-note.cm/integration-de-lapi-local-orange-money/
Les identifiants se configurent via variables d'environnement (jamais en dur dans le code).
"""
from __future__ import annotations

import base64
import logging
import os
import time
from typing import Any

import httpx

logger = logging.getLogger(__name__)

API_VERSION = "1.0.2"
_TOKEN_CACHE: dict[str, Any] = {"token": None, "expires_at": 0.0}


def _base_url() -> str:
    return os.getenv("ORANGE_MONEY_API_URL", "https://api-s1.orange.cm").rstrip("/")


def is_configured() -> bool:
    required = (
        "ORANGE_MONEY_USERNAME",
        "ORANGE_MONEY_PASSWORD",
        "ORANGE_MONEY_AUTH_TOKEN",
        "ORANGE_MONEY_CHANNEL_MSISDN",
        "ORANGE_MONEY_PIN",
    )
    return all(os.getenv(key) for key in required)


def merchant_ussd_code() -> str | None:
    return os.getenv("ORANGE_MONEY_MERCHANT_USSD", "#150*47*1017193#") or None


def notification_url() -> str:
    explicit = os.getenv("ORANGE_MONEY_NOTIF_URL", "").strip()
    if explicit:
        return explicit
    public = os.getenv("PUBLIC_APP_URL", "http://localhost:8082").rstrip("/")
    return f"{public}/tresorerie/webhooks/orange-money"


def _normalize_msisdn(phone: str) -> str:
    digits = "".join(c for c in str(phone or "") if c.isdigit())
    if digits.startswith("237") and len(digits) > 9:
        digits = digits[3:]
    if digits.startswith("0") and len(digits) == 10:
        digits = digits[1:]
    if len(digits) != 9:
        raise ValueError("Numéro Orange invalide — utilisez 6XXXXXXXX sans indicatif.")
    return digits


def get_access_token(*, force: bool = False) -> str:
    now = time.time()
    if not force and _TOKEN_CACHE["token"] and now < _TOKEN_CACHE["expires_at"] - 60:
        return _TOKEN_CACHE["token"]

    username = os.getenv("ORANGE_MONEY_USERNAME", "")
    password = os.getenv("ORANGE_MONEY_PASSWORD", "")
    if not username or not password:
        raise RuntimeError("ORANGE_MONEY_USERNAME / ORANGE_MONEY_PASSWORD manquants")

    basic = base64.b64encode(f"{username}:{password}".encode()).decode()
    with httpx.Client(timeout=30.0, verify=False) as client:
        res = client.post(
            f"{_base_url()}/token",
            headers={
                "Content-Type": "application/x-www-form-urlencoded",
                "Authorization": f"Basic {basic}",
            },
            data={"grant_type": "client_credentials"},
        )
        res.raise_for_status()
        payload = res.json()

    token = payload.get("access_token")
    if not token:
        raise RuntimeError("Orange Money : access_token absent dans la réponse")
    expires_in = int(payload.get("expires_in") or 3600)
    _TOKEN_CACHE["token"] = token
    _TOKEN_CACHE["expires_at"] = now + expires_in
    return token


def _auth_headers() -> dict[str, str]:
    auth_token = os.getenv("ORANGE_MONEY_AUTH_TOKEN", "")
    if not auth_token:
        raise RuntimeError("ORANGE_MONEY_AUTH_TOKEN manquant")
    return {
        "X-AUTH-TOKEN": auth_token,
        "Authorization": f"Bearer {get_access_token()}",
        "Content-Type": "application/json",
    }


def init_payment() -> str:
    """Étape 2 — récupère le payToken."""
    with httpx.Client(timeout=30.0, verify=False) as client:
        res = client.post(
            f"{_base_url()}/omcoreapis/{API_VERSION}/mp/init",
            headers=_auth_headers(),
        )
        res.raise_for_status()
        payload = res.json()
    pay_token = (payload.get("data") or {}).get("payToken")
    if not pay_token:
        raise RuntimeError(f"Orange Money init : payToken absent — {payload}")
    return pay_token


def request_payment(
    *,
    subscriber_msisdn: str,
    amount: int,
    order_id: str,
    description: str,
    pay_token: str,
) -> dict[str, Any]:
    """Étape 3 — déclenche l'appel USSD sur le téléphone du parent."""
    channel = _normalize_msisdn(os.getenv("ORANGE_MONEY_CHANNEL_MSISDN", ""))
    pin = os.getenv("ORANGE_MONEY_PIN", "")
    if not pin:
        raise RuntimeError("ORANGE_MONEY_PIN manquant")

    body = {
        "notifUrl": notification_url(),
        "channelUserMsisdn": channel,
        "amount": str(int(amount)),
        "subscriberMsisdn": _normalize_msisdn(subscriber_msisdn),
        "pin": pin,
        "orderId": order_id,
        "description": description[:200],
        "payToken": pay_token,
    }
    with httpx.Client(timeout=30.0, verify=False) as client:
        res = client.post(
            f"{_base_url()}/omcoreapis/{API_VERSION}/mp/pay",
            headers=_auth_headers(),
            json=body,
        )
        res.raise_for_status()
        return res.json()


def payment_status(pay_token: str) -> dict[str, Any]:
    """Vérifie le statut d'une transaction (SUCCESSFULL, PENDING, FAILED…)."""
    with httpx.Client(timeout=30.0, verify=False) as client:
        res = client.get(
            f"{_base_url()}/omcoreapis/{API_VERSION}/mp/paymentstatus/{pay_token}",
            headers=_auth_headers(),
        )
        res.raise_for_status()
        return res.json()


def is_success_status(payload: dict[str, Any]) -> bool:
    data = payload.get("data") or {}
    status = str(data.get("status") or "").upper()
    return status in {"SUCCESSFULL", "SUCCESSFUL", "SUCCESS", "COMPLETED"}


def initiate_orange_ussd_payment(
    *,
    phone: str,
    amount: float,
    order_id: str,
    description: str,
) -> dict[str, Any]:
    """Flux complet : token OAuth → init → pay USSD."""
    pay_token = init_payment()
    result = request_payment(
        subscriber_msisdn=phone,
        amount=int(amount),
        order_id=order_id,
        description=description,
        pay_token=pay_token,
    )
    data = result.get("data") or {}
    message = data.get("inittxnmessage") or result.get("message") or (
        "Une demande de paiement a été envoyée sur votre téléphone Orange. "
        "Validez avec votre code secret."
    )
    ussd = merchant_ussd_code()
    instructions = [
        "Opérateur : Orange Money",
        message,
        f"Montant : {int(amount):,} XAF — Référence : {order_id}",
    ]
    if ussd:
        instructions.append(f"Alternative sans lien : composez {ussd}")
    return {
        "mode": "orange_ussd",
        "provider_reference": order_id,
        "pay_token": pay_token,
        "checkout_url": None,
        "instructions": instructions,
        "message": "Confirmez le paiement sur votre téléphone Orange (code PIN).",
        "sandbox": False,
    }
