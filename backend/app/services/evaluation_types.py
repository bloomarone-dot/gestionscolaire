"""
Types d'évaluation — 6 séquences par année (2 par trimestre) + note trimestrielle.
"""
from typing import Optional

MAX_SEQUENCES = 6
SEQUENCE_TYPES = tuple(f"sequence_{i}" for i in range(1, MAX_SEQUENCES + 1))
VALID_TYPES = frozenset(SEQUENCE_TYPES) | {"trimestre"}

TYPE_LABELS_FR = {
    **{f"sequence_{i}": f"{i}{'ère' if i == 1 else 'ème'} séquence" for i in range(1, MAX_SEQUENCES + 1)},
    "trimestre": "Note trimestrielle",
}
TYPE_LABELS_EN = {
    "sequence_1": "1st sequence",
    "sequence_2": "2nd sequence",
    "sequence_3": "3rd sequence",
    "sequence_4": "4th sequence",
    "sequence_5": "5th sequence",
    "sequence_6": "6th sequence",
    "trimestre": "Term grade",
}


def trimestre_from_sequence_type(type_eval: str) -> int:
    if not type_eval.startswith("sequence_"):
        raise ValueError(f"Type séquence invalide : {type_eval}")
    num = int(type_eval.rsplit("_", 1)[1])
    if num < 1 or num > MAX_SEQUENCES:
        raise ValueError(f"Numéro de séquence invalide : {num}")
    return (num - 1) // 2 + 1


def global_sequence_number(trimestre: int, slot: int) -> int:
    """slot: 1 ou 2 (première ou deuxième séquence du trimestre)."""
    return (trimestre - 1) * 2 + slot


def global_sequence_type(trimestre: int, slot: int) -> str:
    return f"sequence_{global_sequence_number(trimestre, slot)}"


def sequence_column_label(seq_num: int, lang: str) -> str:
    if lang == "en":
        suffix = {1: "st", 2: "nd", 3: "rd"}.get(seq_num if seq_num <= 3 else 0, "th")
        return f"{seq_num}{suffix} SEQ."
    return f"{seq_num}e eva"


def sequence_labels_for_trimestre(trimestre: int, lang: str) -> tuple[str, str]:
    first = global_sequence_number(trimestre, 1)
    second = global_sequence_number(trimestre, 2)
    return sequence_column_label(first, lang), sequence_column_label(second, lang)


def all_sequence_labels(lang: str) -> list[str]:
    return [sequence_column_label(i, lang) for i in range(1, MAX_SEQUENCES + 1)]


def normalize_trimestre_for_type(type_eval: str, trimestre: int) -> int:
    if type_eval in SEQUENCE_TYPES:
        return trimestre_from_sequence_type(type_eval)
    return trimestre


def empty_note_group() -> dict:
    return {key: None for key in SEQUENCE_TYPES} | {"trimestre": None}


def _note_value(entry) -> Optional[float]:
    if entry is None:
        return None
    if hasattr(entry, "valeur"):
        return entry.valeur
    if isinstance(entry, (int, float)):
        return float(entry)
    return None


def resolve_sequence_entry(group: dict, trimestre: int, slot: int):
    """Retourne l'entrée note (objet Note ou None) pour une séquence du trimestre."""
    global_key = global_sequence_type(trimestre, slot)
    legacy_key = f"sequence_{slot}"
    return group.get(global_key) or group.get(legacy_key)


def resolve_sequence_value(group: dict, trimestre: int, slot: int) -> Optional[float]:
    return _note_value(resolve_sequence_entry(group, trimestre, slot))
