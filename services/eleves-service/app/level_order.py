"""Ordre des niveaux — sert à détecter un passage en classe supérieure."""

# Du plus petit au plus grand. 4ème → 3ème est bien une promotion.
LEVEL_ORDER = [
    "PS", "MS", "GS",
    "SIL", "CP", "CE1", "CE2", "CM1", "CM2",
    "P1", "P2", "P3", "P4", "P5", "P6",
    "6E", "5E", "4E", "3E", "2ND", "1ERE", "TLE",
    "F1", "F2", "F3", "F4", "F5", "LS", "US",
    "1CETIC", "2CETIC", "3CETIC",
    "2ND-T", "1ERE-T", "TLE-T",
    "TF1", "TF2", "TF3", "TF4", "TF5", "LST", "UST",
    "A1", "A2", "B1", "B2", "C1", "C2",
]

_INDEX = {code: i for i, code in enumerate(LEVEL_ORDER)}

ACTION_NEW = "NEW"
ACTION_PROMOTION = "PROMOTION"
ACTION_REDOUBLE = "REDOUBLE"
ACTION_TRANSFER = "TRANSFER"
ACTION_DOWNGRADE = "DOWNGRADE"


def level_index(code: str | None) -> int | None:
    if not code:
        return None
    return _INDEX.get(str(code).strip().upper())


def classify_level_move(previous_level: str | None, new_level: str | None, previous_classe_id=None, new_classe_id=None) -> str:
    """Compare l'ancien et le nouveau niveau d'un élève déjà connu."""
    prev_i = level_index(previous_level)
    new_i = level_index(new_level)
    if prev_i is None or new_i is None:
        if previous_classe_id and new_classe_id and previous_classe_id != new_classe_id:
            return ACTION_TRANSFER
        return ACTION_TRANSFER
    if new_i > prev_i:
        return ACTION_PROMOTION
    if new_i < prev_i:
        return ACTION_DOWNGRADE
    if previous_classe_id and new_classe_id and previous_classe_id != new_classe_id:
        return ACTION_TRANSFER
    return ACTION_REDOUBLE
