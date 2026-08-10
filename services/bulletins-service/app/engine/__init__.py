"""Exports publics du moteur bulletin v2 (schéma + runtime étape 4)."""

from app.engine.template_schema import (
    TEMPLATE_SCHEMA_VERSION,
    BulletinTemplateV1,
    TemplateValidationError,
    validate_template_definition,
)
from app.engine.context import BulletinDataContext, DataContextError
from app.engine.registry import ComponentRegistry, ComponentDefinition, get_registry
from app.engine.resolver import resolve_path, interpolate, ResolveError
from app.engine.ir import RenderedDocument, RenderedPage, RenderedElement
from app.engine.runtime import (
    validate_runtime,
    build_rendered_document,
    RuntimeValidationError,
)

__all__ = [
    "TEMPLATE_SCHEMA_VERSION",
    "BulletinTemplateV1",
    "TemplateValidationError",
    "validate_template_definition",
    "BulletinDataContext",
    "DataContextError",
    "ComponentRegistry",
    "ComponentDefinition",
    "get_registry",
    "resolve_path",
    "interpolate",
    "ResolveError",
    "RenderedDocument",
    "RenderedPage",
    "RenderedElement",
    "validate_runtime",
    "build_rendered_document",
    "RuntimeValidationError",
]
