"""Normalisation des numéros de téléphone (login + création de comptes)."""


def normalize_phone(value: str | None) -> str:
    """Retire les séparateurs et le préfixe pays 237 si présent."""
    digits = "".join(c for c in str(value or "") if c.isdigit())
    if digits.startswith("237") and len(digits) > 9:
        return digits[3:]
    return digits
