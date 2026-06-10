"""
Registre des modèles de bulletins par établissement.
"""
from typing import Callable

AVAILABLE_TEMPLATES = {
    "cameroon_bilingual": {
        "id": "cameroon_bilingual",
        "label": "Cameroun — bilingue (en-tête FR + EN)",
        "description": "Modèle officiel type Royal Priesthood avec en-tête bilingue.",
        "pdf_builder": "cameroon",
    },
    "cameroon_auto": {
        "id": "cameroon_auto",
        "label": "Cameroun — auto (selon section classe)",
        "label_en": "Cameroon — auto (by class section)",
        "description": "Même modèle ; langue du bulletin selon francophone/anglophone.",
        "pdf_builder": "cameroon",
    },
    "standard": {
        "id": "standard",
        "label": "Standard EduSaaS",
        "description": "Bulletin simplifié (tableau notes, sans en-tête ministériel).",
        "pdf_builder": "standard",
    },
}


def resolve_template(school_template: str | None, classe_section: str | None = None) -> str:
    template = school_template or "cameroon_bilingual"
    if template not in AVAILABLE_TEMPLATES:
        template = "cameroon_bilingual"
    return template


def get_pdf_builder_name(template_id: str) -> str:
    tpl = AVAILABLE_TEMPLATES.get(template_id, AVAILABLE_TEMPLATES["cameroon_bilingual"])
    return tpl["pdf_builder"]
