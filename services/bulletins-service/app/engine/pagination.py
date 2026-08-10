"""Pagination multi-pages — surtout grades_table (répétition d'en-tête)."""
from __future__ import annotations

from copy import deepcopy
from typing import Any

from app.engine.ir import RenderedDocument, RenderedElement, RenderedFrame, RenderedPage
from app.engine.units import page_size_mm


def _flatten_table_blocks(content: dict[str, Any]) -> list[dict[str, Any]]:
    """Séquence ordonnée de blocs atomiques (ne pas couper une ligne)."""
    blocks: list[dict[str, Any]] = []
    for section in content.get("sections") or []:
        if section.get("show_header") and section.get("label"):
            blocks.append({
                "kind": "group_header",
                "section_id": section.get("id"),
                "label": section.get("label"),
            })
        for row in section.get("rows") or []:
            blocks.append({
                "kind": "row",
                "section_id": section.get("id"),
                "row": row,
            })
        if section.get("subtotal"):
            blocks.append({
                "kind": "subtotal",
                "section_id": section.get("id"),
                "subtotal": section.get("subtotal"),
            })
    return blocks


def _chunk_height(n_blocks: int, *, row_h: float, has_table_header: bool, header_h: float) -> float:
    h = n_blocks * row_h
    if has_table_header:
        h += header_h
    return h


def _rebuild_sections_from_blocks(
    blocks: list[dict[str, Any]],
    original: dict[str, Any],
) -> list[dict[str, Any]]:
    """Reconstruit sections[{rows…}] à partir d'un sous-ensemble de blocs."""
    by_id: dict[str, dict[str, Any]] = {}
    order: list[str] = []
    for block in blocks:
        sid = block.get("section_id") or "_default"
        if sid not in by_id:
            # retrouver label original
            label = sid
            show_header = True
            for sec in original.get("sections") or []:
                if sec.get("id") == sid:
                    label = sec.get("label") or sid
                    show_header = bool(sec.get("show_header", True))
                    break
            by_id[sid] = {
                "id": sid,
                "label": label,
                "show_header": show_header,
                "rows": [],
                "subtotal": None,
            }
            order.append(sid)
        sec = by_id[sid]
        if block["kind"] == "group_header":
            sec["label"] = block.get("label") or sec["label"]
            sec["show_header"] = True
        elif block["kind"] == "row":
            sec["rows"].append(block["row"])
        elif block["kind"] == "subtotal":
            sec["subtotal"] = block.get("subtotal")
    return [by_id[i] for i in order]


def split_grades_table_element(
    element: RenderedElement,
    *,
    page_orientation: str,
    margins: dict[str, float],
) -> tuple[list[RenderedElement], list[str]]:
    """Découpe un grades_table en 1..N éléments (pages successives).

    Retourne (elements_par_fragment, warnings).
    Le premier fragment garde la frame d'origine ; les suivants démarrent
    sous la marge haute, même x/width.
    """
    warnings: list[str] = []
    content = element.content or {}
    if content.get("kind") != "grades_table":
        return [element], warnings

    style = content.get("style") or {}
    row_h = float(style.get("row_height_mm") or element.style.get("row_height_mm") or 6.0)
    header_h = row_h * 1.2
    show_header = bool(content.get("show_header", True))
    avail = float(element.frame.height_mm)
    if avail <= header_h + row_h:
        warnings.append(
            f"grades_table « {element.id} » : hauteur de frame trop faible "
            f"({avail} mm) — risque de pagination agressive"
        )
        avail = max(avail, header_h + row_h * 2)

    blocks = _flatten_table_blocks(content)
    if not blocks:
        return [element], warnings

    chunks: list[list[dict[str, Any]]] = []
    current: list[dict[str, Any]] = []
    for block in blocks:
        trial = current + [block]
        # En-tête tableau compté une fois par chunk
        need = _chunk_height(len(trial), row_h=row_h, has_table_header=show_header, header_h=header_h)
        if current and need > avail + 0.01:
            chunks.append(current)
            current = [block]
        else:
            current = trial
    if current:
        chunks.append(current)

    if len(chunks) == 1:
        # Toujours annoter metadata pagination
        el = element.model_copy(deep=True)
        el.metadata = {
            **(el.metadata or {}),
            "page_fragment": 1,
            "page_fragments_total": 1,
            "repeat_header": bool(
                (content.get("header") or {}).get("repeat_on_page_break", True)
            ),
        }
        return [el], warnings

    warnings.append(
        f"grades_table « {element.id} » paginé sur {len(chunks)} pages "
        f"({len(blocks)} blocs)"
    )

    page_w, page_h = page_size_mm(page_orientation)  # noqa: F841
    top = float(margins.get("top", 10))
    fragments: list[RenderedElement] = []
    repeat = bool((content.get("header") or {}).get("repeat_on_page_break", True))

    for i, chunk in enumerate(chunks):
        frag_content = deepcopy(content)
        frag_content["sections"] = _rebuild_sections_from_blocks(chunk, content)
        frag_content["empty"] = False
        frag_content["pagination"] = {
            "fragment": i + 1,
            "fragments_total": len(chunks),
            "repeat_header": repeat and show_header,
        }
        if i == 0:
            frame = element.frame
        else:
            # Continuation : haut de page utile, même abscisse / largeur
            used_h = _chunk_height(
                len(chunk), row_h=row_h, has_table_header=show_header and repeat, header_h=header_h,
            )
            frame = RenderedFrame(
                x_mm=element.frame.x_mm,
                y_mm=top,
                width_mm=element.frame.width_mm,
                height_mm=max(used_h, row_h),
            )
        fragments.append(
            RenderedElement(
                id=f"{element.id}__p{i + 1}" if i else element.id,
                component_type="grades_table",
                frame=frame,
                z_index=element.z_index,
                visible=True,
                content=frag_content,
                style=dict(element.style or {}),
                metadata={
                    **(element.metadata or {}),
                    "page_fragment": i + 1,
                    "page_fragments_total": len(chunks),
                    "source_component_id": element.id,
                    "continuation": i > 0,
                },
            )
        )
    return fragments, warnings


def paginate_document(doc: RenderedDocument) -> RenderedDocument:
    """Produit un document multi-pages si un grades_table déborde."""
    if not doc.pages:
        return doc

    base = doc.pages[0]
    margins = base.margins or {}
    orientation = base.orientation

    page1_elements: list[RenderedElement] = []
    continuation_pages: list[list[RenderedElement]] = []
    all_warnings = list(doc.warnings or [])

    for el in base.elements:
        if el.component_type != "grades_table":
            page1_elements.append(el)
            continue
        frags, warns = split_grades_table_element(
            el, page_orientation=orientation, margins=margins,
        )
        all_warnings.extend(warns)
        page1_elements.append(frags[0])
        for extra in frags[1:]:
            continuation_pages.append([extra])

    pages = [
        RenderedPage(
            index=1,
            size=base.size,
            orientation=orientation,
            margins=margins,
            elements=page1_elements,
        )
    ]
    for i, elems in enumerate(continuation_pages, start=2):
        pages.append(
            RenderedPage(
                index=i,
                size=base.size,
                orientation=orientation,
                margins=margins,
                elements=elems,
            )
        )

    return RenderedDocument(
        schema_version=doc.schema_version,
        template_name=doc.template_name,
        pages=pages,
        warnings=all_warnings,
        metadata={
            **(doc.metadata or {}),
            "page_count": len(pages),
            "paginated": len(pages) > 1,
        },
    )
