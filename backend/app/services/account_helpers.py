"""Helpers comptes — emails optionnels, noms."""
from typing import Optional


def optional_email(email: Optional[str], username: str, prefix: str = "noemail") -> str:
    if email and str(email).strip():
        return str(email).strip().lower()
    safe = "".join(c if c.isalnum() else "_" for c in username.lower()) or "user"
    return f"{prefix}.{safe}@edusaas.local"


def display_name(nom: str, prenom: Optional[str] = None) -> str:
    parts = [p for p in [prenom, nom] if p and str(p).strip()]
    return " ".join(parts) if parts else nom
