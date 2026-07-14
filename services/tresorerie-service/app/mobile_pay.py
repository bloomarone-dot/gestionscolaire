"""Intégration Mobile Money — MTN / Orange (Cameroun).

Mode sandbox : confirmation manuelle pour les tests.
Mode production Orange : API Local USSD (Y-Note / api-s1.orange.cm).
"""
from __future__ import annotations

import os
import secrets
from typing import Any

from app import orange_money

PROVIDER_MTN = "MTN_MOMO"
PROVIDER_ORANGE = "ORANGE_MONEY"

PROVIDER_LABELS = {
    PROVIDER_MTN: "MTN Mobile Money",
    PROVIDER_ORANGE: "Orange Money",
}


def is_sandbox() -> bool:
    return os.getenv("MOBILE_PAYMENT_SANDBOX", "true").lower() in ("1", "true", "yes")


def normalize_provider(value: str) -> str:
    v = (value or "").strip().upper()
    if v in (PROVIDER_MTN, "MTN", "MOMO"):
        return PROVIDER_MTN
    if v in (PROVIDER_ORANGE, "ORANGE", "OM"):
        return PROVIDER_ORANGE
    raise ValueError("Opérateur invalide — choisissez MTN ou Orange.")


def new_provider_reference() -> str:
    return f"MM-{secrets.token_hex(8).upper()}"


def payment_instructions(provider: str, amount: str, reference: str, phone: str) -> list[str]:
    """Instructions affichées au parent en attendant l'API opérateur."""
    label = PROVIDER_LABELS.get(provider, provider)
    if provider == PROVIDER_MTN:
        return [
            f"Opérateur : {label}",
            f"Depuis le {phone}, composez *126# puis suivez « Paiement marchand ».",
            f"Montant : {amount} XAF — Référence : {reference}",
            "Une fois le paiement validé, vous recevrez le reçu sur cette page.",
        ]
    ussd = orange_money.merchant_ussd_code()
    lines = [
        f"Opérateur : {label}",
        f"Depuis le {phone}, composez #150*50# puis validez le paiement.",
        f"Montant : {amount} XAF — Référence : {reference}",
    ]
    if ussd:
        lines.append(f"Ou composez directement {ussd} (paiement marchand sans frais).")
    lines.append("Une fois le paiement validé, vous recevrez le reçu sur cette page.")
    return lines


def initiate_checkout(
    *,
    amount: float,
    currency: str,
    reference: str,
    phone: str,
    provider: str,
    description: str,
    return_url: str,
) -> dict[str, Any]:
    """Démarre un paiement — sandbox, Orange USSD production, ou manuel."""
    if is_sandbox():
        return {
            "mode": "sandbox",
            "provider_reference": reference,
            "checkout_url": None,
            "instructions": payment_instructions(provider, f"{amount:,.0f}", reference, phone),
            "message": "Mode test : le parent confirme après paiement USSD simulé.",
            "sandbox": True,
        }

    if provider == PROVIDER_ORANGE and orange_money.is_configured():
        try:
            result = orange_money.initiate_orange_ussd_payment(
                phone=phone,
                amount=amount,
                order_id=reference,
                description=description or "Frais scolaire",
            )
            return result
        except Exception as exc:
            return {
                "mode": "error",
                "provider_reference": reference,
                "checkout_url": None,
                "instructions": payment_instructions(provider, f"{amount:,.0f}", reference, phone),
                "message": f"Orange Money indisponible ({exc}). Réessayez ou contactez l'école.",
                "sandbox": False,
            }

    return {
        "mode": "manual",
        "provider_reference": reference,
        "checkout_url": None,
        "instructions": payment_instructions(provider, f"{amount:,.0f}", reference, phone),
        "message": (
            "Paiement manuel — configurez ORANGE_MONEY_* sur le serveur "
            "ou utilisez MTN (API non fournie)."
        ),
        "sandbox": False,
    }
