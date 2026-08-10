"""Adapter ReportLab — RenderedDocument → bytes PDF (indépendant du métier).

Ne dépend PAS de ``app.pdf`` legacy. Conversion mm→pt centralisée via ``units``.
"""
from __future__ import annotations

import io
from typing import Any, Optional
from urllib.request import urlopen

from reportlab.lib.colors import HexColor, black, white
from reportlab.lib.utils import ImageReader
from reportlab.pdfgen import canvas

from app.engine.ir import RenderedDocument, RenderedElement, RenderedPage
from app.engine.units import mm_to_pt, page_size_pt


def _hex(color: Optional[str], default=black):
    if not color or not isinstance(color, str) or not color.startswith("#"):
        return default
    try:
        return HexColor(color)
    except Exception:
        return default


def _top_left_to_rl(page_h_pt: float, x_mm: float, y_mm: float, h_mm: float, margins: dict) -> tuple[float, float]:
    """Origine IR = haut-gauche zone utile ; ReportLab = bas-gauche page."""
    left = float(margins.get("left", 10))
    top = float(margins.get("top", 10))
    x = mm_to_pt(left + x_mm)
    y = page_h_pt - mm_to_pt(top + y_mm + h_mm)
    return x, y


class ReportLabAdapter:
    """Dessine un RenderedDocument page par page."""

    def render_pdf(self, document: RenderedDocument) -> bytes:
        buffer = io.BytesIO()
        if not document.pages:
            c = canvas.Canvas(buffer, pagesize=page_size_pt("portrait"))
            c.showPage()
            c.save()
            return buffer.getvalue()

        c: Optional[canvas.Canvas] = None
        total_pages = len(document.pages)
        for page in document.pages:
            size = page_size_pt(page.orientation)
            if c is None:
                c = canvas.Canvas(buffer, pagesize=size)
            else:
                c.setPageSize(size)
            assert c is not None
            self._draw_page(c, page, page_index=page.index, page_count=total_pages)
            c.showPage()
        assert c is not None
        c.save()
        return buffer.getvalue()

    def _draw_page(
        self,
        c: canvas.Canvas,
        page: RenderedPage,
        *,
        page_index: int,
        page_count: int,
    ) -> None:
        page_w, page_h = page_size_pt(page.orientation)
        margins = page.margins or {}
        for el in sorted(page.elements, key=lambda e: (e.z_index, e.id)):
            if not el.visible:
                continue
            self._draw_element(c, el, page_h_pt=page_h, margins=margins, page_index=page_index, page_count=page_count)

    def _draw_element(
        self,
        c: canvas.Canvas,
        el: RenderedElement,
        *,
        page_h_pt: float,
        margins: dict,
        page_index: int,
        page_count: int,
    ) -> None:
        fr = el.frame
        x, y = _top_left_to_rl(page_h_pt, fr.x_mm, fr.y_mm, fr.height_mm, margins)
        w, h = mm_to_pt(fr.width_mm), mm_to_pt(fr.height_mm)
        ctype = el.component_type
        content = el.content or {}
        style = el.style or {}

        if ctype == "text":
            self._draw_text(c, content.get("text") or "", x, y, w, h, style or content.get("style") or {})
        elif ctype in ("shape",):
            self._draw_shape(c, content, x, y, w, h)
        elif ctype == "spacer":
            return
        elif ctype in ("image", "school_logo", "student_photo"):
            self._draw_image(c, content.get("url"), x, y, w, h)
        elif ctype == "institution_header":
            self._draw_header(c, content, x, y, w, h)
        elif ctype == "student_block":
            self._draw_student_block(c, content, x, y, w, h)
        elif ctype == "grades_table":
            self._draw_grades_table(c, content, x, y, w, h, style)
        elif ctype == "summary_block":
            self._draw_summary(c, content, x, y, w, h)
        elif ctype == "attendance_block":
            self._draw_attendance(c, content, x, y, w, h)
        elif ctype == "signatures_row":
            self._draw_signatures(c, content, x, y, w, h)
        elif ctype == "qr_code":
            self._draw_qr_placeholder(c, content.get("content") or "", x, y, w, h)
        elif ctype == "page_number":
            fmt = content.get("format") or "Page {{page}} / {{pages}}"
            text = fmt.replace("{{page}}", str(page_index)).replace("{{pages}}", str(page_count))
            self._draw_text(c, text, x, y, w, h, {"font_size_pt": 8, "align": "center"})
        else:
            self._draw_text(c, f"[{ctype}]", x, y, w, h, {"font_size_pt": 8})

    def _draw_text(self, c, text: str, x, y, w, h, style: dict) -> None:
        size = float(style.get("font_size_pt") or 10)
        bold = bool(style.get("bold"))
        italic = bool(style.get("italic"))
        font = "Helvetica"
        if bold and italic:
            font = "Helvetica-BoldOblique"
        elif bold:
            font = "Helvetica-Bold"
        elif italic:
            font = "Helvetica-Oblique"
        family = style.get("font_family")
        if family == "Times-Roman":
            font = "Times-Bold" if bold else "Times-Roman"
        elif family == "Courier":
            font = "Courier-Bold" if bold else "Courier"
        c.setFillColor(_hex(style.get("color")))
        c.setFont(font, size)
        align = style.get("align") or "left"
        # baseline près du haut du cadre
        ty = y + h - size
        if align == "center":
            c.drawCentredString(x + w / 2, ty, text[:200])
        elif align == "right":
            c.drawRightString(x + w, ty, text[:200])
        else:
            c.drawString(x, ty, text[:200])

    def _draw_shape(self, c, content: dict, x, y, w, h) -> None:
        stroke = _hex(content.get("stroke_color"))
        c.setStrokeColor(stroke)
        c.setLineWidth(float(content.get("stroke_width_pt") or 0.5))
        if content.get("shape") == "line":
            c.line(x, y + h / 2, x + w, y + h / 2)
        else:
            fill = content.get("fill_color")
            if fill:
                c.setFillColor(_hex(fill))
                c.rect(x, y, w, h, stroke=1, fill=1)
            else:
                c.rect(x, y, w, h, stroke=1, fill=0)

    def _draw_image(self, c, url: Optional[str], x, y, w, h) -> None:
        if not url:
            c.setStrokeColor(black)
            c.rect(x, y, w, h, stroke=1, fill=0)
            return
        try:
            if isinstance(url, str) and url.startswith("data:"):
                # data URL non géré ici (évite complexité) — cadre vide
                c.rect(x, y, w, h, stroke=1, fill=0)
                return
            if isinstance(url, str) and url.startswith(("http://", "https://")):
                with urlopen(url, timeout=2) as resp:  # noqa: S310 — URLs école contrôlées
                    data = resp.read()
                img = ImageReader(io.BytesIO(data))
            else:
                img = ImageReader(url)
            c.drawImage(img, x, y, width=w, height=h, preserveAspectRatio=True, mask="auto")
        except Exception:
            c.setStrokeColor(black)
            c.rect(x, y, w, h, stroke=1, fill=0)

    def _draw_header(self, c, content: dict, x, y, w, h) -> None:
        title = content.get("title") or ""
        subtitle = content.get("subtitle") or ""
        school = content.get("school") or {}
        c.setFont("Helvetica-Bold", 11)
        c.drawCentredString(x + w / 2, y + h - 14, title[:120])
        c.setFont("Helvetica", 9)
        c.drawCentredString(x + w / 2, y + h - 28, subtitle[:120])
        motto = school.get("motto") or ""
        if motto and (content.get("flags") or {}).get("show_motto", True):
            c.setFont("Helvetica-Oblique", 8)
            c.drawCentredString(x + w / 2, y + h - 42, str(motto)[:100])
        logo = school.get("logo")
        if logo and (content.get("flags") or {}).get("show_logo", True):
            self._draw_image(c, logo, x + 4, y + 4, mm_to_pt(18), mm_to_pt(18))

    def _draw_student_block(self, c, content: dict, x, y, w, h) -> None:
        items = content.get("items") or []
        cols = max(1, int(content.get("columns") or 2))
        show_labels = bool(content.get("show_labels", True))
        col_w = w / cols
        row_h = mm_to_pt(6)
        c.setFont("Helvetica", 8)
        for i, item in enumerate(items):
            col = i % cols
            row = i // cols
            ix = x + col * col_w
            iy = y + h - (row + 1) * row_h - 2
            label = item.get("field") or ""
            value = item.get("value")
            value_s = "" if value is None else str(value)
            text = f"{label}: {value_s}" if show_labels else value_s
            c.drawString(ix + 2, iy, text[:60])

    def _draw_grades_table(self, c, content: dict, x, y, w, h, style: dict) -> None:
        header = content.get("header") or {}
        columns = [col for col in (header.get("columns") or [])]
        if not columns:
            return
        row_h = mm_to_pt(float((content.get("style") or style or {}).get("row_height_mm") or 6))
        font_size = float((content.get("style") or style or {}).get("font_size_pt") or 7)
        border = _hex((content.get("style") or {}).get("border_color"), black)
        header_bg = _hex((content.get("style") or {}).get("header_background"), HexColor("#EEEEEE"))

        # Largeurs normalisées
        widths = [float(col.get("width") or 0.1) for col in columns]
        total = sum(widths) or 1.0
        col_ws = [w * (ww / total) for ww in widths]

        cursor_y = y + h
        show_header = bool(content.get("show_header", True))
        # Répéter header si fragment de pagination
        pag = content.get("pagination") or {}
        if pag.get("fragment", 1) > 1 and pag.get("repeat_header") is False:
            show_header = False

        def draw_header_row(top_y: float) -> float:
            c.setFillColor(header_bg)
            c.rect(x, top_y - row_h, w, row_h, stroke=0, fill=1)
            c.setStrokeColor(border)
            c.setFillColor(black)
            c.setFont("Helvetica-Bold", font_size)
            cx = x
            for col, cw in zip(columns, col_ws):
                c.rect(cx, top_y - row_h, cw, row_h, stroke=1, fill=0)
                c.drawString(cx + 2, top_y - row_h + 2, str(col.get("label") or "")[:40])
                cx += cw
            return top_y - row_h

        if show_header:
            cursor_y = draw_header_row(cursor_y)

        for section in content.get("sections") or []:
            if section.get("show_header") and section.get("label"):
                c.setFillColor(HexColor("#F5F5F5"))
                c.rect(x, cursor_y - row_h, w, row_h, stroke=1, fill=1)
                c.setFillColor(black)
                c.setFont("Helvetica-Bold", font_size)
                c.drawString(x + 2, cursor_y - row_h + 2, str(section.get("label") or "")[:80])
                cursor_y -= row_h
            for row in section.get("rows") or []:
                if cursor_y - row_h < y - 0.5:
                    break  # sécurité — pagination devrait avoir découpé avant
                c.setStrokeColor(border)
                c.setFillColor(white)
                c.rect(x, cursor_y - row_h, w, row_h, stroke=1, fill=1)
                c.setFillColor(black)
                c.setFont("Helvetica", font_size)
                cells = {cell.get("column_id"): cell for cell in (row.get("cells") or [])}
                cx = x
                for col, cw in zip(columns, col_ws):
                    cell = cells.get(col.get("id")) or {}
                    text = str(cell.get("display") if cell.get("display") is not None else cell.get("value") or "")
                    c.drawString(cx + 2, cursor_y - row_h + 2, text[:40])
                    cx += cw
                cursor_y -= row_h
            if section.get("subtotal"):
                sub = section["subtotal"]
                c.setFont("Helvetica-Oblique", font_size)
                label = sub.get("label") or "Sous-total"
                avg = sub.get("display_average") or ""
                c.drawString(x + 2, cursor_y - row_h + 2, f"{label}: {avg}"[:80])
                cursor_y -= row_h

        if content.get("empty"):
            c.setFont("Helvetica-Oblique", 8)
            c.drawString(x + 4, y + h / 2, content.get("message") or "Tableau vide")

    def _draw_summary(self, c, content: dict, x, y, w, h) -> None:
        c.setFont("Helvetica", 8)
        items = content.get("items") or []
        line = mm_to_pt(5)
        for i, item in enumerate(items):
            ty = y + h - (i + 1) * line
            c.drawString(x + 2, ty, f"{item.get('field')}: {item.get('value')}"[:80])

    def _draw_attendance(self, c, content: dict, x, y, w, h) -> None:
        parts = []
        if content.get("show_absences", True):
            parts.append(f"Absences: {content.get('absences', '—')}")
        if content.get("show_sanctions", True):
            parts.append(f"Sanctions: {content.get('sanctions', '—')}")
        self._draw_text(c, " | ".join(parts), x, y, w, h, {"font_size_pt": 8})

    def _draw_signatures(self, c, content: dict, x, y, w, h) -> None:
        slots = content.get("slots") or []
        if not slots:
            return
        slot_w = w / len(slots)
        c.setFont("Helvetica", 8)
        for i, slot in enumerate(slots):
            sx = x + i * slot_w
            c.line(sx + 8, y + 12, sx + slot_w - 8, y + 12)
            c.drawCentredString(sx + slot_w / 2, y + 2, str(slot.get("label") or "")[:40])

    def _draw_qr_placeholder(self, c, text: str, x, y, w, h) -> None:
        c.setStrokeColor(black)
        c.rect(x, y, w, h, stroke=1, fill=0)
        c.setFont("Helvetica", 6)
        c.drawCentredString(x + w / 2, y + h / 2, f"QR:{text[:24]}")


def render_pdf_bytes(document: RenderedDocument) -> bytes:
    return ReportLabAdapter().render_pdf(document)
