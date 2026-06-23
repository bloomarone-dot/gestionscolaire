"""Données de départ du référentiel national MINESEC (cahier des charges §2 & §3).

Transcription EXACTE des tableaux A, B, C, D et des listes de matières 3.2→3.6.
La colonne « Domaine » du cahier (§3.1) est volontairement ignorée (décision client).

Lacunes connues du document (non seedées, à fournir par le client) :
- coefficients des séries techniques sans liste de matières (TI, SES, ESF, G3,
  spécialités CETIC, anglophone technique TF*/LST/UST) ;
- mapping matières ↔ spécialité pour Anglophone Lower/Upper Sixth (Arts/Science/
  Commercial) — le cahier ne donne qu'une liste globale + une remarque ;
- liste officielle des matières OBLIGATOIRES par série (§5.2) — `is_obligatoire`
  reste False en attendant.
"""

# ── Sous-systèmes ────────────────────────────────────────────────────────────
SUBSYSTEMS = [
    ("FRANCOPHONE", "Francophone"),
    ("ANGLOPHONE", "Anglophone"),
]

# ── Types d'enseignement ─────────────────────────────────────────────────────
TEACHING_TYPES = [
    ("GENERAL", "Général", "General"),
    ("TECHNIQUE", "Technique", "Technical"),
    ("LANGUE", "Formation en langues", "Language training"),
]

# ── Cycles ───────────────────────────────────────────────────────────────────
CYCLES = [
    ("PREMIER", "Premier Cycle", "First Cycle", 1),
    ("SECOND", "Second Cycle", "Second Cycle", 2),
    ("CECRL", "Cadre européen commun (CECRL)", "CEFR", 3),
]

# ── Niveaux (code, nom, sous-système, type, cycle, examen, ordre) ─────────────
LEVELS = [
    # Tableau A — Francophone Général
    ("6E", "6ème", "FRANCOPHONE", "GENERAL", "PREMIER", None, 1),
    ("5E", "5ème", "FRANCOPHONE", "GENERAL", "PREMIER", None, 2),
    ("4E", "4ème", "FRANCOPHONE", "GENERAL", "PREMIER", None, 3),
    ("3E", "3ème", "FRANCOPHONE", "GENERAL", "PREMIER", "BEPC", 4),
    ("2ND", "2nde", "FRANCOPHONE", "GENERAL", "SECOND", None, 5),
    ("1ERE", "1ère", "FRANCOPHONE", "GENERAL", "SECOND", "Probatoire", 6),
    ("TLE", "Terminale", "FRANCOPHONE", "GENERAL", "SECOND", "BAC", 7),
    # Tableau B — Francophone Technique
    ("1CETIC", "1ère année CETIC", "FRANCOPHONE", "TECHNIQUE", "PREMIER", None, 1),
    ("2CETIC", "2ème année CETIC", "FRANCOPHONE", "TECHNIQUE", "PREMIER", None, 2),
    ("3CETIC", "3ème année CETIC", "FRANCOPHONE", "TECHNIQUE", "PREMIER", "CAP", 3),
    ("2ND-T", "2nde Technique", "FRANCOPHONE", "TECHNIQUE", "SECOND", None, 4),
    ("1ERE-T", "1ère Technique", "FRANCOPHONE", "TECHNIQUE", "SECOND", "Probatoire Technique", 5),
    ("TLE-T", "Terminale Technique", "FRANCOPHONE", "TECHNIQUE", "SECOND", "BAC Technique", 6),
    # Tableau C — Anglophone General
    ("F1", "Form 1", "ANGLOPHONE", "GENERAL", "PREMIER", None, 1),
    ("F2", "Form 2", "ANGLOPHONE", "GENERAL", "PREMIER", None, 2),
    ("F3", "Form 3", "ANGLOPHONE", "GENERAL", "PREMIER", None, 3),
    ("F4", "Form 4", "ANGLOPHONE", "GENERAL", "PREMIER", None, 4),
    ("F5", "Form 5", "ANGLOPHONE", "GENERAL", "PREMIER", "GCE O Level", 5),
    ("LS", "Lower Sixth", "ANGLOPHONE", "GENERAL", "SECOND", None, 6),
    ("US", "Upper Sixth", "ANGLOPHONE", "GENERAL", "SECOND", "GCE A Level", 7),
    # Tableau D — Anglophone Technical
    ("TF1", "Form 1 (Technical)", "ANGLOPHONE", "TECHNIQUE", "PREMIER", None, 1),
    ("TF2", "Form 2 (Technical)", "ANGLOPHONE", "TECHNIQUE", "PREMIER", None, 2),
    ("TF3", "Form 3 (Technical)", "ANGLOPHONE", "TECHNIQUE", "PREMIER", None, 3),
    ("TF4", "Form 4 (Technical)", "ANGLOPHONE", "TECHNIQUE", "PREMIER", None, 4),
    ("TF5", "Form 5 (Technical)", "ANGLOPHONE", "TECHNIQUE", "PREMIER", "CAP / GCE Technical", 5),
    ("LST", "Lower Sixth Technical", "ANGLOPHONE", "TECHNIQUE", "SECOND", None, 6),
    ("UST", "Upper Sixth Technical", "ANGLOPHONE", "TECHNIQUE", "SECOND", "A Level Technical", 7),
    # Formation en langues — niveaux CECRL (centres de langues)
    ("A1", "A1 — Élémentaire", "FRANCOPHONE", "LANGUE", "CECRL", None, 1),
    ("A2", "A2 — Élémentaire avancé", "FRANCOPHONE", "LANGUE", "CECRL", None, 2),
    ("B1", "B1 — Intermédiaire", "FRANCOPHONE", "LANGUE", "CECRL", None, 3),
    ("B2", "B2 — Intermédiaire avancé", "FRANCOPHONE", "LANGUE", "CECRL", None, 4),
    ("C1", "C1 — Avancé", "FRANCOPHONE", "LANGUE", "CECRL", None, 5),
    ("C2", "C2 — Maîtrise", "FRANCOPHONE", "LANGUE", "CECRL", None, 6),
]

# ── Séries / Spécialités (code, nom_fr, nom_en) ──────────────────────────────
SERIES = [
    # Francophone Général
    ("A1", "A1 — Lettres-Langues", "A1 — Letters-Languages"),
    ("A2", "A2 — Lettres-Langues 2e langue", "A2 — Letters-Languages 2nd lang"),
    ("A4", "A4 — Lettres Bilingue", "A4 — Bilingual Letters"),
    ("C", "C — Sciences (Maths-Physique)", "C — Sciences (Maths-Physics)"),
    ("D", "D — Sciences (Biologie)", "D — Sciences (Biology)"),
    # Francophone Technique — spécialités CETIC (premier cycle)
    ("ELEC", "Électricité", "Electricity"),
    ("CBOIS", "Construction Bois", "Wood Construction"),
    ("CMETAL", "Construction Métallique", "Metal Construction"),
    ("MECAUTO", "Mécanique Auto", "Auto Mechanics"),
    ("COUTURE", "Couture-Mode", "Fashion-Sewing"),
    ("ESF", "ESF — Économie Sociale et Familiale", "Home Economics"),
    # Francophone Technique — second cycle
    ("TI", "TI — Informatique", "TI — Computing"),
    ("CG", "CG — Comptabilité-Gestion", "CG — Accounting-Management"),
    ("ACC", "ACC — Action Commerciale", "ACC — Commercial Action"),
    ("SES", "SES — Sciences Éco. et Sociales", "SES — Economic & Social Sciences"),
    ("F1", "F1 — Génie Civil", "F1 — Civil Engineering"),
    ("F2", "F2 — Génie Électrique", "F2 — Electrical Engineering"),
    ("F3", "F3 — Génie Mécanique", "F3 — Mechanical Engineering"),
    ("G1", "G1 — Comptabilité", "G1 — Accounting"),
    ("G2", "G2 — Action Commerciale", "G2 — Commercial Action"),
    ("G3", "G3 — Secrétariat", "G3 — Secretarial"),
    # Anglophone General
    ("ARTS", "Arts", "Arts"),
    ("SCIENCE", "Science", "Science"),
    ("COMMERCIAL", "Commercial", "Commercial"),
    # Anglophone Technical
    ("BUILDING", "Building", "Building"),
    ("ELECTRICAL", "Electrical", "Electrical"),
    ("MECHANICAL", "Mechanical", "Mechanical"),
    ("WOODWORK", "Woodwork", "Woodwork"),
    ("HOME_ECO", "Home Economics", "Home Economics"),
    ("TCOMMERCIAL", "Commercial (Technical)", "Commercial (Technical)"),
    ("ENGINEERING", "Engineering", "Engineering"),
    ("BUSINESS", "Business", "Business"),
]

# ── Séries proposées par niveau (Tableaux A.2, B, C.2, D) ─────────────────────
CETIC_SPECIALTIES = ["ESF", "ELEC", "CBOIS", "CMETAL", "MECAUTO", "COUTURE"]
TECH_SECOND_SERIES = ["F1", "F2", "F3", "G1", "G2", "G3", "ESF"]
ANGLO_TECH_FIRST = ["BUILDING", "ELECTRICAL", "MECHANICAL", "WOODWORK", "HOME_ECO", "TCOMMERCIAL"]
ANGLO_TECH_SIXTH = ["ENGINEERING", "BUSINESS", "HOME_ECO"]

LEVEL_SERIES = {
    "2ND": ["A4", "C", "D"],
    "1ERE": ["A1", "A2", "A4", "C", "D"],
    "TLE": ["A1", "A2", "A4", "C", "D"],
    "1CETIC": CETIC_SPECIALTIES,
    "2CETIC": CETIC_SPECIALTIES,
    "3CETIC": CETIC_SPECIALTIES,
    "2ND-T": ["TI", "CG", "ACC", "SES", "ESF"],
    "1ERE-T": TECH_SECOND_SERIES,
    "TLE-T": TECH_SECOND_SERIES,
    "LS": ["ARTS", "SCIENCE", "COMMERCIAL"],
    "US": ["ARTS", "SCIENCE", "COMMERCIAL"],
    "TF1": ANGLO_TECH_FIRST, "TF2": ANGLO_TECH_FIRST, "TF3": ANGLO_TECH_FIRST,
    "TF4": ANGLO_TECH_FIRST, "TF5": ANGLO_TECH_FIRST,
    "LST": ANGLO_TECH_SIXTH, "UST": ANGLO_TECH_SIXTH,
}

# ── Matières (code, nom) — sans domaine ──────────────────────────────────────
SUBJECTS = [
    # Francophone — communes / général
    ("FR_FRANCAIS", "Français"),
    ("FR_ANGLAIS", "Anglais"),
    ("FR_MATHS", "Mathématiques"),
    ("FR_SVT", "Sciences de la Vie et de la Terre (SVT)"),
    ("FR_PCT", "Physique-Chimie-Technologie (PCT)"),
    ("FR_HIST", "Histoire"),
    ("FR_GEO", "Géographie"),
    ("FR_ECM", "Éducation à la Citoyenneté (ECM)"),
    ("FR_LV2", "Espagnol / Allemand (2ème langue)"),
    ("FR_EPS", "EPS"),
    ("FR_ARTS", "Arts Plastiques"),
    ("FR_INFO", "Informatique"),
    ("FR_PHILO", "Philosophie"),
    # Francophone — technique (commercial / industriel)
    ("FR_COMPTA", "Comptabilité Générale"),
    ("FR_ECO", "Économie Générale"),
    ("FR_DROIT", "Droit"),
    ("FR_OGE", "Organisation et Gestion des Entreprises"),
    ("FR_MATHFIN", "Mathématiques Financières"),
    ("FR_INFOGE", "Informatique de Gestion"),
    ("FR_TECHSPE", "Technologie de Spécialité"),
    ("FR_DESSIN", "Dessin Technique / DAO"),
    ("FR_PHYSAPP", "Physique Appliquée"),
    ("FR_TPATELIER", "Travaux Pratiques d'Atelier"),
    # Anglophone — general
    ("EN_ENGLISH", "English Language"),
    ("EN_FRENCH", "French"),
    ("EN_MATHS", "Mathematics"),
    ("EN_BIO", "Biology"),
    ("EN_CHEM", "Chemistry"),
    ("EN_PHYS", "Physics"),
    ("EN_HIST", "History"),
    ("EN_GEO", "Geography"),
    ("EN_CITIZEN", "Citizenship Education"),
    ("EN_LIT", "Literature in English"),
    ("EN_CS", "Computer Science"),
    ("EN_PE", "Physical Education (PE)"),
    # Formation en langues (CECRL)
    ("LANG_CIBLE", "Langue cible"),
    ("LANG_ORAL", "Expression orale"),
    ("LANG_ECRIT", "Expression écrite"),
    ("LANG_COMPR_ORALE", "Compréhension orale"),
    ("LANG_COMPR_ECRITE", "Compréhension écrite"),
    ("LANG_GRAMMAIRE", "Grammaire"),
    ("LANG_CULTURE", "Culture et civilisation"),
]

# ── §3.2 Premier Cycle Francophone Général (6E→3E), tronc commun ──────────────
PREMIER_CYCLE_FR = {
    "FR_FRANCAIS": 4, "FR_ANGLAIS": 3, "FR_MATHS": 4, "FR_SVT": 2, "FR_PCT": 2,
    "FR_HIST": 2, "FR_GEO": 2, "FR_ECM": 1, "FR_LV2": 2, "FR_EPS": 1,
    "FR_ARTS": 1, "FR_INFO": 1,
}
PREMIER_CYCLE_FR_LEVELS = ["6E", "5E", "4E", "3E"]

# ── §3.3 Second Cycle Général — coefficient par série (— = non enseignée) ─────
# Colonne A1/A2 partagée par les séries A1 et A2.
SECOND_CYCLE_FR_BY_SERIES = {
    "A1": {"FR_FRANCAIS": 4, "FR_ANGLAIS": 4, "FR_LV2": 4, "FR_MATHS": 2,
           "FR_PHILO": 4, "FR_HIST": 2, "FR_GEO": 2, "FR_EPS": 1, "FR_INFO": 1},
    "A2": {"FR_FRANCAIS": 4, "FR_ANGLAIS": 4, "FR_LV2": 4, "FR_MATHS": 2,
           "FR_PHILO": 4, "FR_HIST": 2, "FR_GEO": 2, "FR_EPS": 1, "FR_INFO": 1},
    "A4": {"FR_FRANCAIS": 4, "FR_ANGLAIS": 3, "FR_LV2": 4, "FR_MATHS": 3,
           "FR_PCT": 2, "FR_SVT": 2, "FR_PHILO": 3, "FR_HIST": 2, "FR_GEO": 2,
           "FR_EPS": 1, "FR_INFO": 1},
    "C": {"FR_FRANCAIS": 3, "FR_ANGLAIS": 2, "FR_MATHS": 5, "FR_PCT": 5,
          "FR_SVT": 2, "FR_PHILO": 2, "FR_GEO": 2, "FR_EPS": 1, "FR_INFO": 1},
    "D": {"FR_FRANCAIS": 3, "FR_ANGLAIS": 2, "FR_MATHS": 5, "FR_PCT": 4,
          "FR_SVT": 4, "FR_PHILO": 2, "FR_HIST": 2, "FR_EPS": 1, "FR_INFO": 1},
}
SECOND_CYCLE_FR_LEVELS = ["2ND", "1ERE", "TLE"]

# ── §3.4 Sections Techniques Commerciales (G1/G2/ACC/CG) ─────────────────────
TECH_COMMERCIAL = {
    "FR_COMPTA": 5, "FR_ECO": 3, "FR_DROIT": 2, "FR_OGE": 4, "FR_MATHFIN": 3,
    "FR_INFOGE": 3, "FR_FRANCAIS": 3, "FR_ANGLAIS": 2, "FR_EPS": 1,
}
TECH_COMMERCIAL_BY_LEVEL = {"2ND-T": ["CG", "ACC"], "1ERE-T": ["G1", "G2"], "TLE-T": ["G1", "G2"]}

# ── §3.5 Sections Industrielles (F1/F2/F3) ───────────────────────────────────
TECH_INDUSTRIAL = {
    "FR_TECHSPE": 6, "FR_DESSIN": 4, "FR_MATHS": 4, "FR_PHYSAPP": 4,
    "FR_TPATELIER": 5, "FR_FRANCAIS": 2, "FR_ANGLAIS": 2, "FR_EPS": 1,
}
TECH_INDUSTRIAL_BY_LEVEL = {"1ERE-T": ["F1", "F2", "F3"], "TLE-T": ["F1", "F2", "F3"]}

# ── §3.6 Anglophone General (Form 1 à Form 5), tronc commun ───────────────────
ANGLO_GENERAL = {
    "EN_ENGLISH": 4, "EN_FRENCH": 2, "EN_MATHS": 4, "EN_BIO": 2, "EN_CHEM": 2,
    "EN_PHYS": 2, "EN_HIST": 2, "EN_GEO": 2, "EN_CITIZEN": 1, "EN_LIT": 3,
    "EN_CS": 1, "EN_PE": 1,
}
ANGLO_GENERAL_LEVELS = ["F1", "F2", "F3", "F4", "F5"]

# ── Formation en langues (CECRL) — tronc commun par niveau ─────────────────────
LANGUE_LEVELS = ["A1", "A2", "B1", "B2", "C1", "C2"]
LANGUE_SUBJECTS = {
    "LANG_CIBLE": 4,
    "LANG_ORAL": 3,
    "LANG_ECRIT": 3,
    "LANG_COMPR_ORALE": 2,
    "LANG_COMPR_ECRITE": 2,
    "LANG_GRAMMAIRE": 2,
    "LANG_CULTURE": 1,
}

# ── Groupes de bulletin (second cycle francophone uniquement) ─────────────────
# Décision client : 2 groupes (« 1er Groupe » / « 2e Groupe »), variables selon la
# série. Affectation matière → groupe par série. À COMPLÉTER avec les données
# officielles du client — laissé vide pour ne rien inventer. Tant que vide, les
# matières sont affichées sans regroupement sur le bulletin.
# Format : { series_code: { subject_code: groupe(1|2) } }
SECOND_CYCLE_FR_GROUPS: dict[str, dict[str, int]] = {
    # "C": {"FR_MATHS": 1, "FR_PCT": 1, "FR_FRANCAIS": 2, ...},
    # "D": {...}, "A1": {...}, "A2": {...}, "A4": {...},
}


def groupe_for(series_code: str, subject_code: str) -> int | None:
    return SECOND_CYCLE_FR_GROUPS.get(series_code, {}).get(subject_code)

