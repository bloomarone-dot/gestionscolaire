"""Attestations et carte d'élève — PDF A4 / carte."""
from __future__ import annotations

import io
from datetime import datetime

from reportlab.lib import colors
from reportlab.lib.enums import TA_CENTER, TA_JUSTIFY
from reportlab.lib.pagesizes import A4, A6, landscape
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.lib.units import cm
from reportlab.platypus import Paragraph, SimpleDocTemplate, Spacer, Table, TableStyle

from app.models import Eleve


def _full_name(eleve: Eleve) -> str:
    return " ".join(filter(None, [eleve.prenom, eleve.nom])).strip() or f"Élève #{eleve.id}"


def _styles():
    styles = getSampleStyleSheet()
    title = ParagraphStyle(
        "title", parent=styles["Heading1"], alignment=TA_CENTER,
        textColor=colors.HexColor("#101F3C"), fontSize=16, spaceAfter=8,
    )
    body = ParagraphStyle("body", parent=styles["Normal"], alignment=TA_JUSTIFY, fontSize=11, leading=16)
    center = ParagraphStyle("center", parent=styles["Normal"], alignment=TA_CENTER, fontSize=10, textColor=colors.HexColor("#64748b"))
    return title, body, center


def _letterhead(establishment_name: str, heading: str) -> list:
    title, body, center = _styles()
    today = datetime.utcnow().strftime("%d/%m/%Y")
    return [
        Paragraph(establishment_name, title),
        Spacer(1, 0.2 * cm),
        Paragraph(heading, title),
        Spacer(1, 0.4 * cm),
        Paragraph(f"Fait le {today}", center),
        Spacer(1, 0.6 * cm),
    ], body, center


def render_attestation_scolarite(
    eleve: Eleve, *, establishment_name: str = "Établissement", classe_nom: str | None = None,
) -> bytes:
    buffer = io.BytesIO()
    doc = SimpleDocTemplate(buffer, pagesize=A4, leftMargin=2.2 * cm, rightMargin=2.2 * cm, topMargin=2 * cm)
    story, body, center = _letterhead(establishment_name, "ATTESTATION DE SCOLARITÉ")
    classe = classe_nom or (f"classe n°{eleve.classe_id}" if eleve.classe_id else "—")
    naissance = eleve.date_naissance.strftime("%d/%m/%Y") if eleve.date_naissance else "—"
    story.extend([
        Paragraph(
            f"Je soussigné(e), chef d'établissement de <b>{establishment_name}</b>, "
            f"atteste que <b>{_full_name(eleve)}</b>, matricule <b>{eleve.matricule}</b>, "
            f"né(e) le {naissance}"
            + (f" à {eleve.lieu_naissance}" if eleve.lieu_naissance else "")
            + f", est régulièrement inscrit(e) dans cet établissement, classe de <b>{classe}</b>, "
            "pour l'année scolaire en cours.",
            body,
        ),
        Spacer(1, 0.8 * cm),
        Paragraph(
            "La présente attestation est délivrée pour servir et valoir ce que de droit.",
            body,
        ),
        Spacer(1, 2 * cm),
        Paragraph("Le chef d'établissement", center),
        Spacer(1, 1.5 * cm),
        Paragraph("Document généré par BloomSchool.", center),
    ])
    doc.build(story)
    return buffer.getvalue()


def render_attestation_radiation(
    eleve: Eleve, *, establishment_name: str = "Établissement", motif: str | None = None,
) -> bytes:
    buffer = io.BytesIO()
    doc = SimpleDocTemplate(buffer, pagesize=A4, leftMargin=2.2 * cm, rightMargin=2.2 * cm, topMargin=2 * cm)
    story, body, center = _letterhead(establishment_name, "ATTESTATION DE RADIATION")
    story.extend([
        Paragraph(
            f"Je soussigné(e), chef d'établissement de <b>{establishment_name}</b>, "
            f"atteste que <b>{_full_name(eleve)}</b>, matricule <b>{eleve.matricule}</b>, "
            "a été radié(e) des effectifs de cet établissement.",
            body,
        ),
        Spacer(1, 0.5 * cm),
        Paragraph(f"Motif : <b>{motif or 'Non précisé'}</b>.", body),
        Spacer(1, 0.8 * cm),
        Paragraph("La présente attestation est délivrée pour servir et valoir ce que de droit.", body),
        Spacer(1, 2 * cm),
        Paragraph("Le chef d'établissement", center),
        Spacer(1, 1.5 * cm),
        Paragraph("Document généré par BloomSchool.", center),
    ])
    doc.build(story)
    return buffer.getvalue()


def render_attestation_reussite(
    eleve: Eleve, *, establishment_name: str = "Établissement", classe_nom: str | None = None,
) -> bytes:
    buffer = io.BytesIO()
    doc = SimpleDocTemplate(buffer, pagesize=A4, leftMargin=2.2 * cm, rightMargin=2.2 * cm, topMargin=2 * cm)
    story, body, center = _letterhead(establishment_name, "ATTESTATION DE RÉUSSITE")
    classe = classe_nom or "—"
    story.extend([
        Paragraph(
            f"Je soussigné(e), chef d'établissement de <b>{establishment_name}</b>, "
            f"atteste que <b>{_full_name(eleve)}</b>, matricule <b>{eleve.matricule}</b>, "
            f"a achevé avec succès son parcours dans cet établissement"
            + (f" (dernière classe : <b>{classe}</b>)" if classe_nom else "")
            + ".",
            body,
        ),
        Spacer(1, 0.8 * cm),
        Paragraph("La présente attestation est délivrée pour servir et valoir ce que de droit.", body),
        Spacer(1, 2 * cm),
        Paragraph("Le chef d'établissement", center),
        Spacer(1, 1.5 * cm),
        Paragraph("Document généré par BloomSchool.", center),
    ])
    doc.build(story)
    return buffer.getvalue()


def _qr_image(payload: str):
    try:
        import qrcode
        from reportlab.platypus import Image

        img = qrcode.make(payload)
        buf = io.BytesIO()
        img.save(buf, format="PNG")
        buf.seek(0)
        return Image(buf, width=3.2 * cm, height=3.2 * cm)
    except Exception:
        return None


def render_carte_eleve(
    eleve: Eleve, *, establishment_name: str = "Établissement", classe_nom: str | None = None,
) -> bytes:
    buffer = io.BytesIO()
    doc = SimpleDocTemplate(
        buffer, pagesize=landscape(A6),
        leftMargin=0.6 * cm, rightMargin=0.6 * cm, topMargin=0.5 * cm, bottomMargin=0.4 * cm,
    )
    styles = getSampleStyleSheet()
    title = ParagraphStyle("c_title", parent=styles["Normal"], alignment=TA_CENTER, fontSize=9, textColor=colors.HexColor("#101F3C"), fontName="Helvetica-Bold")
    name = ParagraphStyle("c_name", parent=styles["Normal"], fontSize=12, fontName="Helvetica-Bold", textColor=colors.HexColor("#101F3C"))
    meta = ParagraphStyle("c_meta", parent=styles["Normal"], fontSize=8, textColor=colors.HexColor("#334155"))
    qr = _qr_image(f"BLOOMSCHOOL|{eleve.tenant_id}|{eleve.matricule}|{eleve.id}")
    left = [
        Paragraph(establishment_name, title),
        Spacer(1, 0.15 * cm),
        Paragraph("CARTE D'ÉLÈVE", title),
        Spacer(1, 0.25 * cm),
        Paragraph(_full_name(eleve), name),
        Spacer(1, 0.12 * cm),
        Paragraph(f"Matricule : {eleve.matricule}", meta),
        Paragraph(f"Classe : {classe_nom or '—'}", meta),
        Paragraph(f"Sexe : {eleve.sexe or '—'}", meta),
    ]
    right = qr or Paragraph(eleve.matricule, title)
    table = Table([[left, right]], colWidths=[8.2 * cm, 4.2 * cm])
    table.setStyle(TableStyle([
        ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
        ("BOX", (0, 0), (-1, -1), 1, colors.HexColor("#B8863B")),
        ("LEFTPADDING", (0, 0), (-1, -1), 8),
        ("RIGHTPADDING", (0, 0), (-1, -1), 8),
        ("TOPPADDING", (0, 0), (-1, -1), 8),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 8),
        ("BACKGROUND", (0, 0), (-1, -1), colors.HexColor("#F8FAFC")),
    ]))
    doc.build([table])
    return buffer.getvalue()
