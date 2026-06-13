"""Libellés bilingues + barème d'appréciation du bulletin (modèle officiel Cameroun).

Reproduit le « STUDENT'S PROGRESS REPORT CARD » anglophone (et son équivalent
francophone). Mise en page identique ; seuls les libellés et la liste des
matières changent selon le sous-système.
"""
from typing import Optional

LABELS = {
    "fr": {
        "report_title": "BULLETIN DE NOTES",
        "subjects": "MATIÈRES",
        "average": "Moyenne",
        "coefficient": "Coef",
        "total_marks": "Total points",
        "rank": "Rang",
        "appreciation": "Appr.",
        "teacher_sign": "Émargement (M./Mme/Mlle)",
        "group_1": "PREMIER GROUPE",
        "group_2": "DEUXIÈME GROUPE",
        "group_3": "TROISIÈME GROUPE",
        "name": "NOM",
        "class": "CLASSE",
        "class_enrollment": "EFFECTIF",
        "repeater": "Redoublant",
        "unique_id": "MATRICULE",
        "year": "ANNÉE",
        "total": "TOTAL",
        "class_average": "MOYENNE DE CLASSE",
        "term_average": "MOYENNE DU TRIMESTRE",
        "absences": "Absences (heures)",
        "sanctions": "SANCTIONS",
        "position": "RANG",
        "out_of": "SUR",
        "remark": "DÉCISION",
        "passed": "ADMIS(E)",
        "failed": "AJOURNÉ(E)",
        "observation": "OBSERVATION",
        "parents": "PARENTS/TUTEURS",
        "sdm": "SURV. GÉNÉRAL",
        "principal": "LE PRINCIPAL",
        "date": "DATE",
        "next_term": "Prochaine rentrée",
        "country": "RÉPUBLIQUE DU CAMEROUN",
        "motto_nat": "Paix - Travail - Patrie",
        "ministry": "MINISTÈRE DES ENSEIGNEMENTS SECONDAIRES",
        "terms": {1: "1er TRIMESTRE", 2: "2e TRIMESTRE", 3: "3e TRIMESTRE"},
        "seqs": {1: ("1ère Séq", "2e Séq"), 2: ("3e Séq", "4e Séq"), 3: ("5e Séq", "6e Séq")},
    },
    "en": {
        "report_title": "STUDENT'S PROGRESS REPORT CARD",
        "subjects": "SUBJECTS",
        "average": "Average",
        "coefficient": "Coef",
        "total_marks": "Total marks",
        "rank": "Rank",
        "appreciation": "Appre.",
        "teacher_sign": "Teacher's sign.(MR/MRS/MISS)",
        "group_1": "FIRST GROUP",
        "group_2": "SECOND GROUP",
        "group_3": "THIRD GROUP",
        "name": "NAME",
        "class": "CLASS",
        "class_enrollment": "CLASS ENROLLMENT",
        "repeater": "Repeater",
        "unique_id": "UNIQUE ID",
        "year": "YEAR",
        "total": "TOTAL",
        "class_average": "CLASS AVERAGE",
        "term_average": "TERM AVERAGE",
        "absences": "Absences (hours)",
        "sanctions": "SANCTIONS",
        "position": "POSITION",
        "out_of": "OUT OF",
        "remark": "REMARK",
        "passed": "PASSED",
        "failed": "FAILED",
        "observation": "OBSERVATION",
        "parents": "PARENTS/GUARDIANS",
        "sdm": "S.D.M",
        "principal": "PRINCIPAL",
        "date": "DATE",
        "next_term": "Next term re-opens",
        "country": "REPUBLIC OF CAMEROON",
        "motto_nat": "Peace-Work-Fatherland",
        "ministry": "MINISTRY OF SECONDARY EDUCATION",
        "terms": {1: "1ST TERM", 2: "2ND TERM", 3: "3RD TERM"},
        "seqs": {1: ("1st SEQ", "2nd SEQ"), 2: ("3rd SEQ", "4th SEQ"), 3: ("5th SEQ", "6th SEQ")},
    },
}


def lang_for_subsystem(subsystem_code: Optional[str]) -> str:
    return "en" if subsystem_code == "ANGLOPHONE" else "fr"


def term_label(trimestre: int, lang: str) -> str:
    return LABELS[lang]["terms"].get(trimestre, LABELS[lang]["terms"][1])


def seq_labels(trimestre: int, lang: str) -> tuple[str, str]:
    return LABELS[lang]["seqs"].get(trimestre, LABELS[lang]["seqs"][1])


def seq_types_for(scope: str, trimestre: int) -> list[str]:
    """Types de notes (séquences) à agréger selon la portée.

    T1 → séq 1-2, T2 → 3-4, T3 → 5-6 ; annuel → séquences 1 à 6.
    """
    if scope == "annual":
        return [f"sequence_{i}" for i in range(1, 7)]
    return [f"sequence_{2 * trimestre - 1}", f"sequence_{2 * trimestre}"]


def seq_columns(scope: str, trimestre: int, lang: str) -> list[str]:
    """Libellés des colonnes de séquences (2 en trimestre, 6 en annuel)."""
    prefix = "Seq" if lang == "en" else "Séq"
    if scope == "annual":
        return [f"{prefix} {i}" for i in range(1, 7)]
    return list(seq_labels(trimestre, lang))


def period_label(scope: str, trimestre: int, lang: str) -> str:
    if scope == "annual":
        return "ANNUAL" if lang == "en" else "ANNUEL"
    return term_label(trimestre, lang)


def report_title(scope: str, lang: str) -> str:
    if scope == "annual":
        return "ANNUAL REPORT CARD" if lang == "en" else "BULLETIN ANNUEL"
    return LABELS[lang]["report_title"]


def appreciation(moyenne: Optional[float], lang: str) -> str:
    """Codes officiels : EN → EXCELLENT/A/IPA/CNA ; FR → équivalents."""
    if moyenne is None:
        return ""
    if lang == "en":
        if moyenne >= 18:
            return "EXCELLENT"
        if moyenne >= 16:
            return "A"
        if moyenne >= 10:
            return "IPA"
        return "CNA"
    # Francophone
    if moyenne >= 18:
        return "EXCELLENT"
    if moyenne >= 16:
        return "TB"
    if moyenne >= 14:
        return "B"
    if moyenne >= 12:
        return "AB"
    if moyenne >= 10:
        return "PASSABLE"
    return "INSUFFISANT"


def decision(moyenne_generale: Optional[float], lang: str) -> str:
    passed = (moyenne_generale or 0) >= 10
    return LABELS[lang]["passed" if passed else "failed"]


def ordinal(n: Optional[int], lang: str) -> str:
    if not n:
        return ""
    if lang == "en":
        if 10 <= n % 100 <= 20:
            suf = "th"
        else:
            suf = {1: "st", 2: "nd", 3: "rd"}.get(n % 10, "th")
        return f"{n}{suf}"
    return "1er" if n == 1 else f"{n}e"
