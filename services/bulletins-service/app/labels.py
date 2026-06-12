"""Libellés bilingues FR/EN du bulletin (cahier §11.2/§11.3).

Le format est identique entre les deux langues ; seuls les libellés et la liste
des matières changent. FR pour le sous-système francophone, EN pour l'anglophone.
"""
from typing import Optional

LABELS = {
    "fr": {
        "report_card": "BULLETIN DE NOTES",
        "term": "Trimestre",
        "subject": "Matière",
        "average": "Moyenne",
        "coefficient": "Coef.",
        "points": "Moy. × Coef.",
        "rank": "Rang",
        "appreciation": "Appréciation",
        "teacher": "Enseignant",
        "total_coeff": "Total des coefficients",
        "total_points": "Total des points",
        "general_average": "Moyenne générale",
        "general_rank": "Rang général",
        "class_average": "Moyenne de la classe",
        "complementary": "Matières complémentaires de l'établissement",
        "official_subjects": "Matières officielles",
        "group_1": "1er Groupe",
        "group_2": "2e Groupe",
        "teacher_principal": "Professeur Principal",
        "head": "Censeur / Principal",
        "parent": "Parent",
        "decision_pass": "ADMIS",
        "decision_fail": "AJOURNÉ",
    },
    "en": {
        "report_card": "REPORT CARD",
        "term": "Term",
        "subject": "Subject",
        "average": "Average",
        "coefficient": "Coef.",
        "points": "Avg × Coef.",
        "rank": "Position",
        "appreciation": "Remark",
        "teacher": "Teacher",
        "total_coeff": "Total coefficients",
        "total_points": "Total points",
        "general_average": "General Average",
        "general_rank": "Overall Position",
        "class_average": "Class Average",
        "complementary": "School complementary subjects",
        "official_subjects": "Official subjects",
        "group_1": "1st Group",
        "group_2": "2nd Group",
        "teacher_principal": "Class Master",
        "head": "Vice-Principal / Principal",
        "parent": "Parent",
        "decision_pass": "PASSED",
        "decision_fail": "FAILED",
    },
}


def lang_for_subsystem(subsystem_code: Optional[str]) -> str:
    return "en" if subsystem_code == "ANGLOPHONE" else "fr"


def appreciation(moyenne: Optional[float], lang: str) -> str:
    if moyenne is None:
        return ""
    scale_fr = [
        (18, "Excellent"), (16, "Très Bien"), (14, "Bien"),
        (12, "Assez Bien"), (10, "Passable"), (0, "Insuffisant"),
    ]
    scale_en = [
        (18, "Excellent"), (16, "Very Good"), (14, "Good"),
        (12, "Fairly Good"), (10, "Average"), (0, "Weak"),
    ]
    scale = scale_en if lang == "en" else scale_fr
    for threshold, label in scale:
        if moyenne >= threshold:
            return label
    return scale[-1][1]


def decision(moyenne_generale: Optional[float], lang: str) -> str:
    passed = (moyenne_generale or 0) >= 10
    key = "decision_pass" if passed else "decision_fail"
    return LABELS[lang][key]
