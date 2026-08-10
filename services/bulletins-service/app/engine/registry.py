"""Registry des composants de bulletin (moteur v2).

Source de vérité des *types* autorisés et de leurs props Pydantic.
Le rendu PDF/HTML viendra plus tard ; ici on ne définit que le contrat.
"""
from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any, Optional

from pydantic import BaseModel

from app.engine.template_schema import COMPONENT_TYPES, _PROPS_BY_TYPE


@dataclass(frozen=True)
class ComponentDefinition:
    """Métadonnées d'un type de composant enregistré."""

    type: str
    category: str
    props_model: type[BaseModel]
    # Racines du BulletinDataContext nécessaires (ex. school, student, subjects)
    required_context_roots: frozenset[str] = field(default_factory=frozenset)
    description: str = ""


# Catégories stables pour l'éditeur (étape 8)
_CATEGORY_BY_TYPE: dict[str, str] = {
    "text": "design",
    "image": "design",
    "shape": "design",
    "spacer": "design",
    "institution_header": "school",
    "school_logo": "school",
    "student_block": "student",
    "student_photo": "student",
    "grades_table": "academic",
    "summary_block": "summary",
    "attendance_block": "summary",
    "signatures_row": "signature",
    "qr_code": "other",
    "page_number": "other",
}

_REQUIRED_ROOTS: dict[str, frozenset[str]] = {
    "text": frozenset(),
    "image": frozenset({"school", "student"}),
    "shape": frozenset(),
    "spacer": frozenset(),
    "institution_header": frozenset({"school"}),
    "school_logo": frozenset({"school"}),
    "student_block": frozenset({"student", "class"}),
    "student_photo": frozenset({"student"}),
    "grades_table": frozenset({"subjects"}),
    "summary_block": frozenset({"summary"}),
    "attendance_block": frozenset({"attendance"}),
    "signatures_row": frozenset(),
    "qr_code": frozenset(),
    "page_number": frozenset(),
}

_DESCRIPTIONS: dict[str, str] = {
    "text": "Texte libre avec variables {{…}} whitelistées",
    "image": "Image (logo école, photo élève, URL contrôlée)",
    "shape": "Ligne ou rectangle décoratif",
    "spacer": "Espace réservé (layout)",
    "institution_header": "En-tête établissement / ministère",
    "school_logo": "Logo de l'établissement",
    "student_block": "Bloc d'identité élève",
    "student_photo": "Photo élève",
    "grades_table": "Tableau de notes configurable",
    "summary_block": "Totaux / moyenne / rang / décision",
    "attendance_block": "Absences / sanctions (stubs possibles)",
    "signatures_row": "Ligne de signatures",
    "qr_code": "QR code (contenu interpolé sûr)",
    "page_number": "Numéro de page",
}


class ComponentRegistryError(ValueError):
    """Type de composant inconnu ou non enregistré."""


class ComponentRegistry:
    """Registry simple et extensible (register / get / has / list / validate_props)."""

    def __init__(self) -> None:
        self._defs: dict[str, ComponentDefinition] = {}

    def register(self, definition: ComponentDefinition) -> None:
        if definition.type in self._defs:
            raise ComponentRegistryError(f"Composant déjà enregistré : {definition.type}")
        self._defs[definition.type] = definition

    def get(self, type_name: str) -> ComponentDefinition:
        if type_name not in self._defs:
            raise ComponentRegistryError(
                f"Composant inconnu « {type_name} ». "
                f"Types connus : {', '.join(sorted(self._defs))}"
            )
        return self._defs[type_name]

    def has(self, type_name: str) -> bool:
        return type_name in self._defs

    def list(self) -> list[ComponentDefinition]:
        return [self._defs[k] for k in sorted(self._defs)]

    def validate_props(self, type_name: str, props: dict[str, Any]) -> dict[str, Any]:
        definition = self.get(type_name)
        parsed = definition.props_model.model_validate(props or {})
        return parsed.model_dump(mode="json")


def build_default_registry() -> ComponentRegistry:
    """Construit le registry v1 à partir du schéma Pydantic (pas de duplication de types)."""
    registry = ComponentRegistry()
    for type_name in sorted(COMPONENT_TYPES):
        props_model = _PROPS_BY_TYPE.get(type_name)
        if props_model is None:
            continue
        registry.register(
            ComponentDefinition(
                type=type_name,
                category=_CATEGORY_BY_TYPE.get(type_name, "other"),
                props_model=props_model,
                required_context_roots=_REQUIRED_ROOTS.get(type_name, frozenset()),
                description=_DESCRIPTIONS.get(type_name, ""),
            )
        )
    return registry


# Singleton de processus — le moteur v2 n'est pas multi-tenant au niveau registry
# (les *données* le sont via BulletinDataContext).
DEFAULT_REGISTRY = build_default_registry()


def get_registry() -> ComponentRegistry:
    return DEFAULT_REGISTRY
