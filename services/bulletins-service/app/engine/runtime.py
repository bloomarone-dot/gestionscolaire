"""Validation runtime + construction du RenderedDocument (moteur v2).

N'appelle pas le PDF legacy. Opt-in côté API plus tard via use_bulletin_engine_v2.
"""
from __future__ import annotations

from typing import Any, Optional

from app.engine.context import BulletinDataContext, DataContextError
from app.engine.grades_table import build_grades_table_content
from app.engine.ir import RenderedDocument, RenderedElement, RenderedFrame, RenderedPage
from app.engine.registry import ComponentRegistry, ComponentRegistryError, get_registry
from app.engine.resolver import interpolate
from app.engine.template_schema import (
    BulletinTemplateV1,
    TemplateValidationError,
    validate_template_definition,
)


class RuntimeValidationError(ValueError):
    """Template ou contexte incohérent au runtime."""

    def __init__(self, message: str, *, issues: Optional[list[str]] = None):
        super().__init__(message)
        self.issues = issues or [message]


class RuntimeIssue:
    __slots__ = ("severity", "code", "message", "component_id")

    def __init__(self, severity: str, code: str, message: str, component_id: Optional[str] = None):
        self.severity = severity  # error | warning
        self.code = code
        self.message = message
        self.component_id = component_id

    def as_dict(self) -> dict[str, Any]:
        return {
            "severity": self.severity,
            "code": self.code,
            "message": self.message,
            "component_id": self.component_id,
        }


# Dimensions utiles A4 (mm) hors marges — contrôle soft des frames
_A4 = {"portrait": (210.0, 297.0), "landscape": (297.0, 210.0)}


def validate_runtime(
    template: BulletinTemplateV1 | dict[str, Any],
    context: BulletinDataContext | dict[str, Any] | None = None,
    *,
    registry: Optional[ComponentRegistry] = None,
    raise_on_error: bool = True,
) -> list[RuntimeIssue]:
    """Validation runtime (en plus de Pydantic étape 2).

    Retourne la liste d'issues. Lève ``RuntimeValidationError`` si erreur et raise_on_error.
    """
    registry = registry or get_registry()
    issues: list[RuntimeIssue] = []

    try:
        tpl = validate_template_definition(template)
    except TemplateValidationError as exc:
        issues.append(RuntimeIssue("error", "template_invalid", str(exc)))
        if raise_on_error:
            raise RuntimeValidationError(str(exc), issues=[str(exc)]) from exc
        return issues

    try:
        ctx = (
            context
            if isinstance(context, BulletinDataContext)
            else BulletinDataContext.from_mapping(context or {})
        )
    except DataContextError as exc:
        issues.append(RuntimeIssue("error", "context_invalid", str(exc)))
        if raise_on_error:
            raise RuntimeValidationError(str(exc), issues=[str(exc)]) from exc
        return issues

    page_w, page_h = _A4.get(tpl.page.orientation, _A4["portrait"])

    for comp in tpl.components:
        cid = comp.id
        if not registry.has(comp.type):
            issues.append(RuntimeIssue(
                "error", "unknown_component",
                f"Composant « {cid} » : type inconnu « {comp.type} »",
                cid,
            ))
            continue

        definition = registry.get(comp.type)
        try:
            registry.validate_props(comp.type, comp.props)
        except Exception as exc:
            issues.append(RuntimeIssue(
                "error", "invalid_props",
                f"Composant « {cid} » : props invalides — {exc}",
                cid,
            ))

        # Dimensions / frame
        fr = comp.frame
        if fr.width_mm <= 0 or fr.height_mm <= 0:
            issues.append(RuntimeIssue(
                "error", "invalid_frame",
                f"Composant « {cid} » : largeur/hauteur doivent être > 0",
                cid,
            ))
        if fr.x_mm + fr.width_mm > page_w + 5 or fr.y_mm + fr.height_mm > page_h + 5:
            issues.append(RuntimeIssue(
                "warning", "frame_overflow",
                f"Composant « {cid} » déborde probablement de la page "
                f"({tpl.page.orientation} {page_w}×{page_h} mm)",
                cid,
            ))

        # Contexte requis
        if comp.visible:
            for root_name in definition.required_context_roots:
                if root_name == "subjects":
                    if not ctx.subjects:
                        issues.append(RuntimeIssue(
                            "warning", "missing_subjects",
                            f"Composant « {cid} » ({comp.type}) : aucune matière dans le DataContext "
                            "(tableau vide au rendu)",
                            cid,
                        ))
                elif not ctx.has_root(root_name):
                    # attendance / summary peuvent être stubs vides → warning
                    sev = "warning" if root_name in ("attendance", "summary", "school", "student", "class") else "error"
                    issues.append(RuntimeIssue(
                        sev, "missing_context_root",
                        f"Composant « {cid} » ({comp.type}) : racine DataContext « {root_name} » vide ou absente",
                        cid,
                    ))

        # grades_table : binds grades.* vs sequence_columns
        if comp.type == "grades_table":
            seq_keys = {c.key for c in tpl.data_binding.sequence_columns}
            for col in (comp.props.get("columns") or []):
                bind = col.get("bind") or ""
                if bind.startswith("grades.") and seq_keys:
                    key = bind.split(".", 1)[1]
                    if key not in seq_keys:
                        issues.append(RuntimeIssue(
                            "error", "grades_bind_mismatch",
                            f"Composant « {cid} » colonne « {col.get('id')} » : "
                            f"bind grades.{key} absent de data_binding.sequence_columns",
                            cid,
                        ))

    errors = [i.message for i in issues if i.severity == "error"]
    if errors and raise_on_error:
        raise RuntimeValidationError(
            "Validation runtime échouée : " + " | ".join(errors),
            issues=errors,
        )
    return issues


def _resolve_component_content(
    comp_type: str,
    props: dict[str, Any],
    template: BulletinTemplateV1,
    root: dict[str, Any],
) -> tuple[dict[str, Any], dict[str, Any]]:
    """Retourne (content, style) pour l'IR."""
    style: dict[str, Any] = {}

    if comp_type == "text":
        style = props.get("style") or {}
        return {
            "kind": "text",
            "text": interpolate(props.get("content") or "", root, missing=""),
        }, style

    if comp_type == "image":
        source = props.get("source") or "school.logo"
        url = props.get("url")
        if source == "school.logo":
            url = (root.get("school") or {}).get("logo")
        elif source == "student.photo":
            url = (root.get("student") or {}).get("photo")
        return {"kind": "image", "source": source, "url": url, "fit": props.get("fit")}, {}

    if comp_type == "shape":
        return {"kind": "shape", **{k: props.get(k) for k in ("shape", "stroke_color", "stroke_width_pt", "fill_color")}}, {}

    if comp_type == "spacer":
        return {"kind": "spacer", "note": props.get("note") or ""}, {}

    if comp_type == "institution_header":
        return {
            "kind": "institution_header",
            "title": interpolate(props.get("title") or "", root, missing=""),
            "subtitle": interpolate(props.get("subtitle") or "", root, missing=""),
            "school": {
                "name": (root.get("school") or {}).get("name"),
                "logo": (root.get("school") or {}).get("logo"),
                "motto": (root.get("school") or {}).get("motto"),
                "delegation_regional": (root.get("school") or {}).get("delegation_regional"),
                "delegation_departementale": (root.get("school") or {}).get("delegation_departementale"),
            },
            "flags": {
                "show_ministry": props.get("show_ministry", True),
                "show_logo": props.get("show_logo", True),
                "show_motto": props.get("show_motto", True),
                "show_delegations": props.get("show_delegations", True),
            },
        }, {}

    if comp_type == "school_logo":
        return {
            "kind": "school_logo",
            "url": (root.get("school") or {}).get("logo"),
            "fit": props.get("fit", "contain"),
        }, {}

    if comp_type == "student_block":
        student = root.get("student") or {}
        class_info = root.get("class") or {}
        field_map = {
            "full_name": student.get("full_name") or f"{student.get('first_name', '')} {student.get('last_name', '')}".strip(),
            "first_name": student.get("first_name"),
            "last_name": student.get("last_name"),
            "matricule": student.get("matricule"),
            "class": class_info.get("name"),
            "gender": student.get("gender"),
            "age": student.get("age"),
            "status": student.get("status"),
            "repeat_status": student.get("repeat_status"),  # stub possible
            "photo": student.get("photo"),
            "date_of_birth": student.get("date_of_birth"),
        }
        fields = props.get("fields") or []
        items = [{"field": f, "value": field_map.get(f)} for f in fields]
        return {
            "kind": "student_block",
            "items": items,
            "show_labels": props.get("show_labels", True),
            "columns": props.get("columns", 2),
        }, {}

    if comp_type == "student_photo":
        return {
            "kind": "student_photo",
            "url": (root.get("student") or {}).get("photo"),
            "fit": props.get("fit", "contain"),
            "placeholder": props.get("placeholder", True),
        }, {}

    if comp_type == "grades_table":
        return build_grades_table_content(props, template, root), props.get("style") or {}

    if comp_type == "summary_block":
        summary = root.get("summary") or {}
        fields = props.get("fields") or []
        items = [{"field": f, "value": summary.get(f)} for f in fields]
        return {
            "kind": "summary_block",
            "items": items,
            "show_labels": props.get("show_labels", True),
            "empty": not any(summary.get(f) is not None for f in fields),
        }, {}

    if comp_type == "attendance_block":
        attendance = root.get("attendance") or {}
        return {
            "kind": "attendance_block",
            "absences": attendance.get("absences", props.get("stub_label_absences", "—")),
            "sanctions": attendance.get("sanctions", props.get("stub_label_sanctions", "—")),
            "show_absences": props.get("show_absences", True),
            "show_sanctions": props.get("show_sanctions", True),
            "note": props.get("note"),
            "stub": not bool(attendance),
        }, {}

    if comp_type == "signatures_row":
        slots = []
        for slot in props.get("slots") or []:
            slots.append({
                "slot": slot.get("slot"),
                "label": interpolate(slot.get("label") or "", root, missing=""),
            })
        return {"kind": "signatures_row", "slots": slots}, {}

    if comp_type == "qr_code":
        return {
            "kind": "qr_code",
            "content": interpolate(props.get("content") or "", root, missing=""),
        }, {}

    if comp_type == "page_number":
        # {{page}} / {{pages}} résolus au backend PDF ; on garde le format
        return {"kind": "page_number", "format": props.get("format") or "Page {{page}} / {{pages}}"}, {}

    raise RuntimeValidationError(f"Pas de builder IR pour le type « {comp_type} »")


def build_rendered_document(
    template: BulletinTemplateV1 | dict[str, Any],
    context: BulletinDataContext | dict[str, Any] | None = None,
    *,
    registry: Optional[ComponentRegistry] = None,
) -> RenderedDocument:
    """Valide au runtime puis produit un RenderedDocument (1 page pour l'instant)."""
    registry = registry or get_registry()
    issues = validate_runtime(template, context, registry=registry, raise_on_error=True)
    tpl = validate_template_definition(template)
    ctx = (
        context
        if isinstance(context, BulletinDataContext)
        else BulletinDataContext.from_mapping(context or {})
    )
    root = ctx.root_dict()

    margins = tpl.page.margins.model_dump()
    page = RenderedPage(
        index=1,
        size=tpl.page.size,
        orientation=tpl.page.orientation,
        margins=margins,
        elements=[],
    )

    for comp in sorted(tpl.components, key=lambda c: (c.z_index, c.id)):
        if not comp.visible:
            continue
        # Props déjà normalisées par Pydantic
        try:
            props = registry.validate_props(comp.type, comp.props)
        except (ComponentRegistryError, Exception) as exc:
            raise RuntimeValidationError(
                f"Composant « {comp.id} » : {exc}",
                issues=[str(exc)],
            ) from exc

        content, style = _resolve_component_content(comp.type, props, tpl, root)
        page.elements.append(
            RenderedElement(
                id=comp.id,
                component_type=comp.type,
                frame=RenderedFrame(
                    x_mm=comp.frame.x_mm,
                    y_mm=comp.frame.y_mm,
                    width_mm=comp.frame.width_mm,
                    height_mm=comp.frame.height_mm,
                ),
                z_index=comp.z_index,
                visible=True,
                content=content,
                style=style,
                metadata={"template_component_id": comp.id},
            )
        )

    warnings = [i.message for i in issues if i.severity == "warning"]
    return RenderedDocument(
        schema_version=1,
        template_name=tpl.name or "",
        pages=[page],
        warnings=warnings,
        metadata={
            "engine": "bulletin_v2",
            "groups_mode": tpl.data_binding.groups_mode,
            "component_count": len(page.elements),
        },
    )
