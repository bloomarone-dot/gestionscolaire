"""Libellés bilingues + barème d'appréciation du bulletin (modèle officiel Cameroun).

Reproduit le « STUDENT'S PROGRESS REPORT CARD » anglophone (et son équivalent
francophone). Mise en page identique ; seuls les libellés et la liste des
matières changent selon le sous-système.
"""
from typing import Optional

from common.appreciation_scales import label_for_average
from common.subsystem import lang_for_classe, resolve_subsystem_code

LABELS = {
    "fr": {
        "report_title": "BULLETIN",
        "subjects": "MATIÈRES",
        "average": "Moyenne",
        "coefficient": "Coef",
        "total_marks": "Notes",
        "rank": "Rang",
        "appreciation": "Appr.",
        "teacher_sign": "Professeur M./Mme",
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
        "annual_average": "MOYENNE ANNUELLE",
        "absences": "Absences (heures)",
        "sanctions": "SANCTIONS",
        "position": "RANG",
        "out_of": "SUR",
        "remark": "DÉCISION",
        "passed": "ADMIS",
        "failed": "ECHEC",
        "observation": "OBSERVATION",
        "parents": "PARENTS/TUTEURS",
        "sdm": "SURV. GÉNÉRAL",
        "principal_col": "PROF PRINCIPAL",
        "principal": "PRINCIPAL",
        "class_master": "Professeur Principal",
        "series": "Série",
        "complementary": "Matières complémentaires de l'établissement",
        "date": "DATE",
        "next_term": "Prochaine rentrée",
        "country": "RÉPUBLIQUE DU CAMEROUN",
        "motto_nat": "Paix - Travail - Patrie",
        "ministry": "MINISTÈRE DE L'ENSEIGNEMENT SECONDAIRE",
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
        "annual_average": "ANNUAL AVERAGE",
        "absences": "Absences (hours)",
        "sanctions": "SANCTIONS",
        "position": "POSITION",
        "out_of": "OUT OF",
        "remark": "REMARK",
        "passed": "PASSED",
        "failed": "ECHEC",
        "observation": "OBSERVATION",
        "parents": "PARENTS/GUARDIANS",
        "sdm": "S.D.M",
        "principal": "PRINCIPAL",
        "class_master": "Class Master",
        "complementary": "Complementary subjects (school)",
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


def lang_for_class(classe: Optional[dict]) -> str:
    return lang_for_classe(classe)


def term_label(trimestre: int, lang: str) -> str:
    return LABELS[lang]["terms"].get(trimestre, LABELS[lang]["terms"][1])


def seq_labels(trimestre: int, lang: str) -> tuple[str, str]:
    return LABELS[lang]["seqs"].get(trimestre, LABELS[lang]["seqs"][1])


def seq_types_for(scope: str, trimestre: int) -> list[str]:
    """Types de notes (séquences) à agréger selon la portée.

    T1 → séq 1-2, T2 → 3-4, T3 → 5-6.
    Le bulletin annuel utilise ``subject_period_values`` (moyennes trimestrielles).
    """
    return [f"sequence_{2 * trimestre - 1}", f"sequence_{2 * trimestre}"]


def seq_columns(scope: str, trimestre: int, lang: str) -> list[str]:
    """Libellés des colonnes (2 séquences en trimestre ; Moy T1/T2/T3 en annuel)."""
    if scope == "annual":
        if lang == "en":
            return ["1st TERM", "2nd TERM", "3rd TERM"]
        return ["Moy. T1", "Moy. T2", "Moy. T3"]
    return list(seq_labels(trimestre, lang))


def period_label(scope: str, trimestre: int, lang: str) -> str:
    if scope == "annual":
        return "ANNUAL" if lang == "en" else "ANNUEL"
    return term_label(trimestre, lang)


def report_title(scope: str, lang: str) -> str:
    if scope == "annual":
        return "ANNUAL REPORT CARD" if lang == "en" else "BULLETIN ANNUEL"
    return LABELS[lang]["report_title"]


def appreciation(moyenne: Optional[float], lang: str, scales: Optional[dict] = None) -> str:
    """Appréciation selon le barème école ou les défauts officiels Cameroun."""
    return label_for_average(moyenne, lang, scales)


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
