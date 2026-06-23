"""Reçu de paiement — PDF simple (A4)."""
from __future__ import annotations

import io
from datetime import datetime

from reportlab.lib import colors
from reportlab.lib.enums import TA_CENTER
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.lib.units import cm
from reportlab.platypus import Paragraph, SimpleDocTemplate, Spacer, Table, TableStyle

from app.models import Paiement


def _fmt_amount(amount) -> str:
    try:
        value = float(amount)
    except (TypeError, ValueError):
        return str(amount)
    return f"{value:,.0f} XAF".replace(",", " ")


def render_recu_pdf(paiement: Paiement, establishment_name: str = "Établissement") -> bytes:
    buffer = io.BytesIO()
    doc = SimpleDocTemplate(buffer, pagesize=A4, leftMargin=2 * cm, rightMargin=2 * cm, topMargin=2 * cm)
    styles = getSampleStyleSheet()
    title_style = ParagraphStyle("title", parent=styles["Heading1"], alignment=TA_CENTER, textColor=colors.HexColor("#1e3a5f"))
    body = styles["Normal"]
    center = ParagraphStyle("center", parent=body, alignment=TA_CENTER)

    student = " ".join(filter(None, [paiement.eleve_prenom, paiement.eleve_nom])) or f"Apprenant #{paiement.eleve_id}"
    paid_at = paiement.paid_at or datetime.utcnow()
    paid_label = paid_at.strftime("%d/%m/%Y %H:%M")

    story = [
        Paragraph(establishment_name, title_style),
        Spacer(1, 0.4 * cm),
        Paragraph("REÇU DE PAIEMENT", title_style),
        Spacer(1, 0.6 * cm),
    ]

    rows = [
        ["N° reçu", paiement.receipt_number or "—"],
        ["Date d'encaissement", paid_label],
        ["Apprenant", student],
        ["Matricule", paiement.matricule or "—"],
        ["Motif", paiement.label],
        ["Montant", _fmt_amount(paiement.amount)],
        ["Mode de paiement", (paiement.payment_method or "—").replace("_", " ")],
    ]
    if paiement.notes:
        rows.append(["Observations", paiement.notes])

    table = Table(rows, colWidths=[5.5 * cm, 11 * cm])
    table.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (0, -1), colors.HexColor("#eef2ff")),
        ("TEXTCOLOR", (0, 0), (0, -1), colors.HexColor("#334155")),
        ("FONTNAME", (0, 0), (0, -1), "Helvetica-Bold"),
        ("FONTNAME", (1, 0), (1, -1), "Helvetica"),
        ("FONTSIZE", (0, 0), (-1, -1), 10),
        ("BOX", (0, 0), (-1, -1), 0.5, colors.HexColor("#cbd5e1")),
        ("INNERGRID", (0, 0), (-1, -1), 0.25, colors.HexColor("#e2e8f0")),
        ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
        ("LEFTPADDING", (0, 0), (-1, -1), 8),
        ("RIGHTPADDING", (0, 0), (-1, -1), 8),
        ("TOPPADDING", (0, 0), (-1, -1), 6),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 6),
    ]))
    story.extend([table, Spacer(1, 1.2 * cm), Paragraph("Document généré par EduGestion — à conserver comme preuve de paiement.", center)])
    doc.build(story)
    return buffer.getvalue()
