"""Constantes et helpers vie scolaire / conseil / examens."""

from app.models import (
    DECISION_A_DELIBERER,
    DECISION_ADMIS,
    DECISION_ADMIS_CONDITIONNEL,
    DECISION_EXCLU,
    DECISION_REDOUBLE,
    DECISION_SORTANT,
    EXAM_RESULT_ABSENT,
    EXAM_RESULT_ADMIS,
    EXAM_RESULT_ECHOUE,
    EXAM_RESULT_INSCRIT,
    SANCTION_AVERTISSEMENT,
    SANCTION_BLAME,
    SANCTION_CONVOCATION,
    SANCTION_EXCLUSION_TEMP,
    SANCTION_OBSERVATION,
)

SANCTION_KINDS = {
    SANCTION_AVERTISSEMENT: "Avertissement",
    SANCTION_BLAME: "Blâme",
    SANCTION_EXCLUSION_TEMP: "Exclusion temporaire",
    SANCTION_CONVOCATION: "Convocation des parents",
    SANCTION_OBSERVATION: "Observation",
}

CONSEIL_DECISIONS = {
    DECISION_ADMIS: "Admis",
    DECISION_ADMIS_CONDITIONNEL: "Admis conditionnel",
    DECISION_REDOUBLE: "Redouble",
    DECISION_EXCLU: "Exclu",
    DECISION_SORTANT: "Sortant",
    DECISION_A_DELIBERER: "À délibérer",
}

EXAM_CODES = (
    "CEP",
    "FSLC",
    "BEPC",
    "Probatoire",
    "BAC",
    "GCE O Level",
    "GCE A Level",
)

EXAM_RESULTS = {
    EXAM_RESULT_INSCRIT: "Inscrit",
    EXAM_RESULT_ADMIS: "Admis",
    EXAM_RESULT_ECHOUE: "Échoué",
    EXAM_RESULT_ABSENT: "Absent",
}

# Mapping niveau référentiel → examen (fallback si pas d'appel référentiel)
LEVEL_EXAM_FALLBACK = {
    "CM2": "CEP",
    "P6": "FSLC",
    "3E": "BEPC",
    "1ERE": "Probatoire",
    "TLE": "BAC",
    "F5": "GCE O Level",
    "US": "GCE A Level",
}


def mention_from_moyenne(moyenne: float | None) -> str | None:
    if moyenne is None:
        return None
    if moyenne >= 16:
        return "Excellent"
    if moyenne >= 14:
        return "Très Bien"
    if moyenne >= 12:
        return "Bien"
    if moyenne >= 10:
        return "Assez Bien"
    if moyenne >= 8:
        return "Passable"
    return "Insuffisant"


def suggest_decision(moyenne: float | None) -> str:
    if moyenne is None:
        return DECISION_A_DELIBERER
    if moyenne >= 10:
        return DECISION_ADMIS
    if moyenne >= 8:
        return DECISION_ADMIS_CONDITIONNEL
    return DECISION_REDOUBLE
