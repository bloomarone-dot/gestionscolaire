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

from app.models import FEE_LABELS, Paiement, PensionPaiement


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
    story.extend([table, Spacer(1, 1.2 * cm), Paragraph("Document généré par BloomSchool — à conserver comme preuve de paiement.", center)])
    doc.build(story)
    return buffer.getvalue()


def render_pension_recu_pdf(
    rows: list[PensionPaiement],
    establishment_name: str = "Établissement",
) -> bytes:
    """Reçu d'un versement de scolarité (inscription + tranches)."""
    if not rows:
        raise ValueError("Aucun versement pour ce reçu")
    first = rows[0]
    buffer = io.BytesIO()
    doc = SimpleDocTemplate(buffer, pagesize=A4, leftMargin=2 * cm, rightMargin=2 * cm, topMargin=2 * cm)
    styles = getSampleStyleSheet()
    title_style = ParagraphStyle("title", parent=styles["Heading1"], alignment=TA_CENTER, textColor=colors.HexColor("#101F3C"))
    body = styles["Normal"]
    center = ParagraphStyle("center", parent=body, alignment=TA_CENTER)

    paid_at = first.created_at or datetime.utcnow()
    total = sum(float(r.amount or 0) for r in rows)
    story = [
        Paragraph(establishment_name, title_style),
        Spacer(1, 0.4 * cm),
        Paragraph("REÇU DE SCOLARITÉ", title_style),
        Spacer(1, 0.6 * cm),
    ]
    header_rows = [
        ["N° reçu", first.receipt_number or "—"],
        ["Date", paid_at.strftime("%d/%m/%Y %H:%M")],
        ["Apprenant", first.eleve_nom or f"Apprenant #{first.eleve_id}"],
        ["Matricule", first.matricule or "—"],
        ["Mode de paiement", (first.payment_method or "—").replace("_", " ")],
    ]
    table = Table(header_rows, colWidths=[5.5 * cm, 11 * cm])
    table.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (0, -1), colors.HexColor("#eef2ff")),
        ("FONTNAME", (0, 0), (0, -1), "Helvetica-Bold"),
        ("FONTSIZE", (0, 0), (-1, -1), 10),
        ("BOX", (0, 0), (-1, -1), 0.5, colors.HexColor("#cbd5e1")),
        ("INNERGRID", (0, 0), (-1, -1), 0.25, colors.HexColor("#e2e8f0")),
        ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
        ("LEFTPADDING", (0, 0), (-1, -1), 8),
        ("RIGHTPADDING", (0, 0), (-1, -1), 8),
        ("TOPPADDING", (0, 0), (-1, -1), 6),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 6),
    ]))
    story.extend([table, Spacer(1, 0.6 * cm)])

    alloc_rows = [["Poste", "Montant"]]
    for row in rows:
        alloc_rows.append([FEE_LABELS.get(row.fee_type, row.fee_type), _fmt_amount(row.amount)])
    alloc_rows.append(["Total", _fmt_amount(total)])
    alloc = Table(alloc_rows, colWidths=[10 * cm, 6.5 * cm])
    alloc.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#101F3C")),
        ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
        ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
        ("FONTNAME", (0, -1), (-1, -1), "Helvetica-Bold"),
        ("ALIGN", (1, 0), (1, -1), "RIGHT"),
        ("FONTSIZE", (0, 0), (-1, -1), 10),
        ("BOX", (0, 0), (-1, -1), 0.5, colors.HexColor("#cbd5e1")),
        ("INNERGRID", (0, 0), (-1, -1), 0.25, colors.HexColor("#e2e8f0")),
        ("TOPPADDING", (0, 0), (-1, -1), 6),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 6),
        ("LEFTPADDING", (0, 0), (-1, -1), 8),
    ]))
    story.extend([alloc, Spacer(1, 1.2 * cm), Paragraph("Document généré par BloomSchool — à conserver comme preuve de paiement.", center)])
    doc.build(story)
    return buffer.getvalue()


def render_quitus_pdf(
    *,
    establishment_name: str = "Établissement",
    eleve_nom: str,
    matricule: str,
    total_due,
    total_paid,
    status: str,
) -> bytes:
    buffer = io.BytesIO()
    doc = SimpleDocTemplate(buffer, pagesize=A4, leftMargin=2 * cm, rightMargin=2 * cm, topMargin=2 * cm)
    styles = getSampleStyleSheet()
    title_style = ParagraphStyle("title", parent=styles["Heading1"], alignment=TA_CENTER, textColor=colors.HexColor("#101F3C"))
    body = styles["Normal"]
    center = ParagraphStyle("center", parent=body, alignment=TA_CENTER)
    today = datetime.utcnow().strftime("%d/%m/%Y")
    story = [
        Paragraph(establishment_name, title_style),
        Spacer(1, 0.4 * cm),
        Paragraph("QUITUS DE CAISSE", title_style),
        Spacer(1, 0.6 * cm),
        Paragraph(
            f"Je soussigné(e), responsable de la caisse de <b>{establishment_name}</b>, "
            f"atteste que <b>{eleve_nom}</b>, matricule <b>{matricule or '—'}</b>, "
            "est en règle vis-à-vis des frais de scolarité de l'année en cours "
            f"(versé {_fmt_amount(total_paid)} sur {_fmt_amount(total_due)}, situation : {status}).",
            body,
        ),
        Spacer(1, 0.6 * cm),
        Paragraph(f"Fait le {today}. Le présent quitus est délivré pour servir et valoir ce que de droit.", body),
        Spacer(1, 2 * cm),
        Paragraph("Le caissier / l'intendant", center),
        Spacer(1, 1.2 * cm),
        Paragraph("Document généré par BloomSchool.", center),
    ]
    doc.build(story)
    return buffer.getvalue()
