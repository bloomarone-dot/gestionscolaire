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


def render_convocation_pdf(
    eleve: Eleve,
    *,
    establishment_name: str = "Établissement",
    motif: str,
    when_label: str | None = None,
    parent_nom: str | None = None,
) -> bytes:
    buffer = io.BytesIO()
    doc = SimpleDocTemplate(buffer, pagesize=A4, leftMargin=2.2 * cm, rightMargin=2.2 * cm, topMargin=2 * cm)
    story, body, center = _letterhead(establishment_name, "CONVOCATION DES PARENTS")
    dest = parent_nom or "Madame, Monsieur"
    story.extend([
        Paragraph(f"À l'attention de {dest},", body),
        Spacer(1, 0.4 * cm),
        Paragraph(
            f"Vous êtes cordialement convoqué(e) concernant l'élève <b>{_full_name(eleve)}</b> "
            f"(matricule {eleve.matricule}).",
            body,
        ),
        Spacer(1, 0.4 * cm),
        Paragraph(f"Motif : <b>{motif}</b>.", body),
    ])
    if when_label:
        story.append(Spacer(1, 0.3 * cm))
        story.append(Paragraph(f"Date / heure : <b>{when_label}</b>.", body))
    story.extend([
        Spacer(1, 0.8 * cm),
        Paragraph("Merci de vous présenter au secrétariat de l'établissement.", body),
        Spacer(1, 2 * cm),
        Paragraph("Le chef d'établissement / Surveillant général", center),
        Spacer(1, 1.2 * cm),
        Paragraph("Document généré par BloomSchool.", center),
    ])
    doc.build(story)
    return buffer.getvalue()


def render_conseil_pv_pdf(
    *,
    establishment_name: str,
    classe_nom: str,
    trimestre: int,
    held_on: str | None,
    notes: str | None,
    rows: list[dict],
) -> bytes:
    """rows: [{nom, matricule, rang, moyenne, mention, decision, observation}]"""
    buffer = io.BytesIO()
    doc = SimpleDocTemplate(buffer, pagesize=A4, leftMargin=1.5 * cm, rightMargin=1.5 * cm, topMargin=1.5 * cm)
    styles = getSampleStyleSheet()
    title = ParagraphStyle(
        "pv_title", parent=styles["Heading1"], alignment=TA_CENTER,
        textColor=colors.HexColor("#101F3C"), fontSize=14,
    )
    center = ParagraphStyle("pv_center", parent=styles["Normal"], alignment=TA_CENTER, fontSize=9, textColor=colors.HexColor("#64748b"))
    body = styles["Normal"]
    story = [
        Paragraph(establishment_name, title),
        Spacer(1, 0.2 * cm),
        Paragraph("PROCÈS-VERBAL — CONSEIL DE CLASSE", title),
        Spacer(1, 0.3 * cm),
        Paragraph(f"Classe : <b>{classe_nom}</b> — Trimestre {trimestre}" + (f" — {held_on}" if held_on else ""), body),
        Spacer(1, 0.4 * cm),
    ]
    if notes:
        story.append(Paragraph(f"Notes de séance : {notes}", body))
        story.append(Spacer(1, 0.3 * cm))

    table_data = [["N°", "Élève", "Matricule", "Rang", "Moy.", "Mention", "Décision", "Observation"]]
    for i, r in enumerate(rows, start=1):
        table_data.append([
            str(i),
            r.get("nom") or "—",
            r.get("matricule") or "—",
            str(r.get("rang") or "—"),
            str(r.get("moyenne") or "—"),
            r.get("mention") or "—",
            r.get("decision") or "—",
            (r.get("observation") or "—")[:40],
        ])
    table = Table(table_data, colWidths=[1 * cm, 4 * cm, 2.4 * cm, 1.2 * cm, 1.4 * cm, 2.2 * cm, 2.6 * cm, 3.2 * cm])
    table.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#101F3C")),
        ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
        ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
        ("FONTSIZE", (0, 0), (-1, -1), 7),
        ("GRID", (0, 0), (-1, -1), 0.25, colors.HexColor("#cbd5e1")),
        ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
        ("TOPPADDING", (0, 0), (-1, -1), 4),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 4),
    ]))
    story.extend([
        table,
        Spacer(1, 1.2 * cm),
        Paragraph("Signatures : Professeur principal _____________  Proviseur _____________", center),
        Spacer(1, 0.6 * cm),
        Paragraph("Document généré par BloomSchool.", center),
    ])
    doc.build(story)
    return buffer.getvalue()


def render_exam_list_pdf(
    *,
    establishment_name: str,
    exam_code: str,
    session_label: str,
    rows: list[dict],
) -> bytes:
    buffer = io.BytesIO()
    doc = SimpleDocTemplate(buffer, pagesize=A4, leftMargin=1.5 * cm, rightMargin=1.5 * cm, topMargin=1.5 * cm)
    styles = getSampleStyleSheet()
    title = ParagraphStyle(
        "ex_title", parent=styles["Heading1"], alignment=TA_CENTER,
        textColor=colors.HexColor("#101F3C"), fontSize=14,
    )
    center = ParagraphStyle("ex_center", parent=styles["Normal"], alignment=TA_CENTER, fontSize=9, textColor=colors.HexColor("#64748b"))
    story = [
        Paragraph(establishment_name, title),
        Spacer(1, 0.2 * cm),
        Paragraph(f"LISTE DES CANDIDATS — {exam_code}", title),
        Spacer(1, 0.2 * cm),
        Paragraph(f"Session {session_label}", center),
        Spacer(1, 0.5 * cm),
    ]
    table_data = [["N°", "Nom", "Matricule", "N° table", "Centre", "Résultat"]]
    for i, r in enumerate(rows, start=1):
        table_data.append([
            str(i),
            r.get("nom") or "—",
            r.get("matricule") or "—",
            r.get("numero_table") or "—",
            r.get("centre") or "—",
            r.get("resultat") or "—",
        ])
    table = Table(table_data, colWidths=[1.2 * cm, 5.5 * cm, 3 * cm, 2.5 * cm, 4 * cm, 2.3 * cm])
    table.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#101F3C")),
        ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
        ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
        ("FONTSIZE", (0, 0), (-1, -1), 8),
        ("GRID", (0, 0), (-1, -1), 0.25, colors.HexColor("#cbd5e1")),
        ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
        ("TOPPADDING", (0, 0), (-1, -1), 5),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 5),
    ]))
    story.extend([table, Spacer(1, 1 * cm), Paragraph("Document généré par BloomSchool.", center)])
    doc.build(story)
    return buffer.getvalue()
