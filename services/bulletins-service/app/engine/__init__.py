"""Moteur de bulletins configurables (v2) — schéma template, validation, rendu.

Le PDF legacy (`app.pdf`) reste inchangé. Ce package est opt-in via
`settings.use_bulletin_engine_v2`.
"""

from app.engine.template_schema import (
    TEMPLATE_SCHEMA_VERSION,
    BulletinTemplateV1,
    TemplateValidationError,
    validate_template_definition,
)

__all__ = [
    "TEMPLATE_SCHEMA_VERSION",
    "BulletinTemplateV1",
    "TemplateValidationError",
    "validate_template_definition",
]
