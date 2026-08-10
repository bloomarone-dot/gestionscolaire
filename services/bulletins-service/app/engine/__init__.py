from app.engine.template_schema import (
    TEMPLATE_SCHEMA_VERSION,
    BulletinTemplateV1,
    TemplateValidationError,
    validate_template_definition,
)
from app.engine.context import BulletinDataContext, DataContextError
from app.engine.context_builder import (
    BulletinDataContextBuilder,
    build_data_context_from_compute,
    build_data_context_from_legacy,
)
from app.engine.registry import ComponentRegistry, ComponentDefinition, get_registry
from app.engine.resolver import resolve_path, interpolate, ResolveError
from app.engine.ir import RenderedDocument, RenderedPage, RenderedElement
from app.engine.runtime import (
    validate_runtime,
    build_rendered_document,
    RuntimeValidationError,
)
from app.engine.renderer import BulletinRenderer, render_bulletin_document
from app.engine.preview import rendered_document_to_preview
from app.engine.pdf_v2 import (
    generate_bulletin_document_v2,
    generate_bulletin_preview_v2,
    generate_bulletin_pdf_v2,
)
from app.engine.units import mm_to_pt, page_size_mm

__all__ = [
    "TEMPLATE_SCHEMA_VERSION",
    "BulletinTemplateV1",
    "TemplateValidationError",
    "validate_template_definition",
    "BulletinDataContext",
    "DataContextError",
    "BulletinDataContextBuilder",
    "build_data_context_from_compute",
    "build_data_context_from_legacy",
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
    "BulletinRenderer",
    "render_bulletin_document",
    "rendered_document_to_preview",
    "generate_bulletin_document_v2",
    "generate_bulletin_preview_v2",
    "generate_bulletin_pdf_v2",
    "mm_to_pt",
    "page_size_mm",
]
