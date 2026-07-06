"""Libellés bilingues + barème d'appréciation du bulletin (modèle officiel Cameroun).

Reproduit le « STUDENT'S PROGRESS REPORT CARD » anglophone (et son équivalent
francophone). Les centres de formation en langues utilisent un relevé simplifié
(sessions CECRL, sans en-tête MINESEC).
"""
from typing import Optional

from common.appreciation_scales import label_for_average
from common.establishment import is_language_center, is_primary_school
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


PRIMARY_OVERRIDES = {
    "fr": {
        "report_title": "BULLETIN SCOLAIRE",
        "ministry": "MINISTÈRE DE L'ÉDUCATION DE BASE",
        "country": "RÉPUBLIQUE DU CAMEROUN",
        "motto_nat": "Paix - Travail - Patrie",
        "class": "CLASSE",
        "teacher_sign": "Enseignant(e)",
        "principal_col": "ENSEIGNANT(E) TITULAIRE",
        "principal": "DIRECTEUR / DIRECTRICE",
        "terms": {1: "1er TRIMESTRE", 2: "2e TRIMESTRE", 3: "3e TRIMESTRE"},
    },
    "en": {
        "report_title": "PRIMARY SCHOOL REPORT",
        "ministry": "MINISTRY OF BASIC EDUCATION",
    },
}

LANG_CENTER_OVERRIDES = {
    "fr": {
        "report_title": "RELEVÉ DE NOTES",
        "class": "GROUPE",
        "class_enrollment": "EFFECTIF",
        "class_average": "MOYENNE DU GROUPE",
        "term_average": "MOYENNE DE SESSION",
        "annual_average": "MOYENNE GLOBALE",
        "teacher_sign": "Formateur",
        "parents": "RESPONSABLE",
        "principal_col": "COORDINATION",
        "principal": "DIRECTION",
        "next_term": "Prochaine session",
        "terms": {1: "SESSION 1", 2: "SESSION 2", 3: "SESSION 3"},
        "seqs": {1: ("Séance récente", "Séance préc."), 2: ("Séance récente", "Séance préc."), 3: ("Séance récente", "Séance préc.")},
    },
    "en": {
        "report_title": "PROGRESS REPORT",
        "class": "GROUP",
        "class_enrollment": "ENROLLMENT",
        "class_average": "GROUP AVERAGE",
        "term_average": "SESSION AVERAGE",
        "annual_average": "OVERALL AVERAGE",
        "teacher_sign": "Trainer",
        "terms": {1: "SESSION 1", 2: "SESSION 2", 3: "SESSION 3"},
        "seqs": {1: ("Recent session", "Previous"), 2: ("Recent session", "Previous"), 3: ("Recent session", "Previous")},
    },
}


def lang_for_subsystem(subsystem_code: Optional[str]) -> str:
    return "en" if subsystem_code == "ANGLOPHONE" else "fr"


def lang_for_class(classe: Optional[dict]) -> str:
    return lang_for_classe(classe)


def labels_pack(lang: str, establishment_kind: Optional[str] = None) -> dict:
    base = LABELS[lang]
    if is_primary_school(establishment_kind):
        overrides = PRIMARY_OVERRIDES.get(lang, PRIMARY_OVERRIDES["fr"])
        return {**base, **overrides}
    if not is_language_center(establishment_kind):
        return base
    overrides = LANG_CENTER_OVERRIDES.get(lang, LANG_CENTER_OVERRIDES["fr"])
    return {**base, **overrides}


def term_label(trimestre: int, lang: str, establishment_kind: Optional[str] = None) -> str:
    pack = labels_pack(lang, establishment_kind)
    return pack["terms"].get(trimestre, pack["terms"][1])


def seq_labels(trimestre: int, lang: str, establishment_kind: Optional[str] = None) -> tuple[str, str]:
    pack = labels_pack(lang, establishment_kind)
    return pack["seqs"].get(trimestre, pack["seqs"][1])


def seq_types_for(scope: str, trimestre: int) -> list[str]:
    """Types de notes (séquences) à agréger selon la portée.

    T1 → séq 1-2, T2 → 3-4, T3 → 5-6.
    Le bulletin annuel utilise ``subject_period_values`` (moyennes trimestrielles).
    """
    return [f"sequence_{2 * trimestre - 1}", f"sequence_{2 * trimestre}"]


def seq_columns(
    scope: str, trimestre: int, lang: str, establishment_kind: Optional[str] = None,
) -> list[str]:
    """Libellés des colonnes (2 séquences en trimestre ; Moy T1/T2/T3 en annuel)."""
    if scope == "annual":
        if is_language_center(establishment_kind):
            return ["Session 1", "Session 2", "Session 3"]
        if lang == "en":
            return ["1st TERM", "2nd TERM", "3rd TERM"]
        return ["Moy. T1", "Moy. T2", "Moy. T3"]
    return list(seq_labels(trimestre, lang, establishment_kind))


def period_label(
    scope: str, trimestre: int, lang: str, establishment_kind: Optional[str] = None,
) -> str:
    if scope == "annual":
        if is_language_center(establishment_kind):
            return "CERTIFICAT DE FIN DE FORMATION"
        return "ANNUAL" if lang == "en" else "ANNUEL"
    return term_label(trimestre, lang, establishment_kind)


def report_title(
    scope: str, lang: str, establishment_kind: Optional[str] = None,
) -> str:
    if scope == "annual":
        if is_language_center(establishment_kind):
            return "CERTIFICAT DE FIN DE FORMATION"
        return "ANNUAL REPORT CARD" if lang == "en" else "BULLETIN ANNUEL"
    return labels_pack(lang, establishment_kind)["report_title"]


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
