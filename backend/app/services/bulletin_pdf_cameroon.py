"""
Génération PDF — bulletin officiel Cameroun (FR / EN).
"""
import base64
import io
import re

from reportlab.lib import colors
from reportlab.lib.pagesizes import A4, landscape
from reportlab.lib.styles import ParagraphStyle
from reportlab.lib.units import cm, mm
from reportlab.platypus import (
    Image, Paragraph, SimpleDocTemplate, Spacer, Table, TableStyle,
)


def _logo_cell(logo_url: str | None, max_w=2.6 * cm, max_h=2.2 * cm):
    """Affiche le logo école (base64) ou un placeholder."""
    if not logo_url:
        return _p("LOGO", 8, True, "CENTER")
    if logo_url.startswith("data:image"):
        match = re.match(r"data:image/[\w+.-]+;base64,(.+)", logo_url, re.I)
        if match:
            try:
                raw = base64.b64decode(match.group(1))
                img = Image(io.BytesIO(raw))
                ratio = min(max_w / img.imageWidth, max_h / img.imageHeight, 1.0)
                img.drawWidth = img.imageWidth * ratio
                img.drawHeight = img.imageHeight * ratio
                img.hAlign = "CENTER"
                return img
            except Exception:
                pass
    return _p("LOGO", 8, True, "CENTER")


def _p(text: str, size=7, bold=False, align="LEFT"):
    style = ParagraphStyle(
        "cell",
        fontSize=size,
        leading=size + 2,
        alignment={"LEFT": 0, "CENTER": 1, "RIGHT": 2}.get(align, 0),
        fontName="Helvetica-Bold" if bold else "Helvetica",
    )
    return Paragraph(str(text).replace("\n", "<br/>"), style)


def build_cameroon_bulletin_pdf(bulletin: dict) -> bytes:
    lang = bulletin.get("lang", "fr")
    school = bulletin.get("school", {})
    buffer = io.BytesIO()
    doc = SimpleDocTemplate(
        buffer,
        pagesize=landscape(A4),
        leftMargin=8 * mm,
        rightMargin=8 * mm,
        topMargin=6 * mm,
        bottomMargin=6 * mm,
    )

    green = colors.HexColor("#d4edda")
    blue = colors.HexColor("#cce5ff")
    peach = colors.HexColor("#ffe5cc")
    dark_blue = colors.HexColor("#4a7ab8")

    elements = []

    # ── En-tête bilingue ──
    header_en = school.get("bulletin_delegation_en", "")
    header_fr = school.get("bulletin_delegation_fr", "")
    school_name = school.get("name", "ÉTABLISSEMENT")
    motto = school.get("bulletin_motto", "")
    po_box = school.get("bulletin_po_box", "")

    logo_url = school.get("logo_url")
    header_data = [
        [
            _p(header_en + (f"\n{school_name}" if school_name else "") + (f"\n{motto}" if motto else "") + (f"\n{po_box}" if po_box else ""), 6),
            _logo_cell(logo_url),
            _p(header_fr + (f"\n{school_name}" if school_name else "") + (f"\n{motto}" if motto else "") + (f"\n{po_box}" if po_box else ""), 6, align="RIGHT"),
        ],
    ]
    header_table = Table(header_data, colWidths=[9.5 * cm, 3 * cm, 9.5 * cm])
    header_table.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, -1), green),
        ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
        ("BOX", (0, 0), (-1, -1), 0.5, colors.black),
        ("INNERGRID", (0, 0), (-1, -1), 0.25, colors.grey),
    ]))
    elements.append(header_table)

    title = "STUDENT'S PROGRESS REPORT CARD" if lang == "en" else "BULLETIN"
    title_row = Table([[_p(title, 11, True, "CENTER")]], colWidths=[22 * cm])
    title_row.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, -1), colors.HexColor("#e8e8e8")),
        ("BOX", (0, 0), (-1, -1), 0.5, colors.black),
        ("TOPPADDING", (0, 0), (-1, -1), 4),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 4),
    ]))
    elements.append(title_row)

    # ── Infos élève ──
    if lang == "en":
        info_rows = [
            [
                _p(f"<b>Name:</b> {bulletin.get('eleve_nom', '')} {bulletin.get('eleve_prenom', '')}", 7),
                _p(f"<b>Class:</b> {bulletin.get('classe', '—')}", 7),
                _p(f"<b>Sex:</b> {bulletin.get('eleve_sexe', '—')}", 7),
                _p(f"<b>Class Enrollment:</b> {bulletin.get('effectif', '—')}", 7),
            ],
            [
                _p(f"<b>Repeater:</b> {bulletin.get('redoublant', 'NO')}", 7),
                _p(f"<b>Unique ID:</b> {bulletin.get('matricule', '—')}", 7),
                _p(f"<b>Term:</b> {bulletin.get('term_label', '')}", 7, True),
                _p(f"<b>Year:</b> {bulletin.get('annee_scolaire', '—')}", 7, True),
            ],
        ]
    else:
        info_rows = [
            [
                _p(f"<b>NOM:</b> {bulletin.get('eleve_nom', '')} {bulletin.get('eleve_prenom', '')}", 7),
                _p(f"<b>Classe:</b> {bulletin.get('classe', '—')}", 7),
                _p(f"<b>Effectif:</b> {bulletin.get('effectif', '—')}", 7),
                _p(f"<b>Redoublant:</b> {bulletin.get('redoublant', 'NON')}", 7),
            ],
            [
                _p(f"<b>Serie:</b> {bulletin.get('classe_serie', '—')}", 7),
                _p(f"<b>Matricule:</b> {bulletin.get('matricule', '—')}", 7),
                _p(f"<b>{bulletin.get('term_label', '')}</b>", 7, True),
                _p(f"<b>Annee</b> {bulletin.get('annee_scolaire', '—')}", 7, True),
            ],
        ]

    info_table = Table(info_rows, colWidths=[5.5 * cm, 5.5 * cm, 5.5 * cm, 5.5 * cm])
    info_table.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, -1), blue),
        ("BOX", (0, 0), (-1, -1), 0.5, colors.black),
        ("INNERGRID", (0, 0), (-1, -1), 0.25, colors.grey),
        ("TOPPADDING", (0, 0), (-1, -1), 3),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 3),
    ]))
    elements.append(info_table)
    elements.append(Spacer(1, 2 * mm))

    # ── Tableau des notes ──
    if lang == "en":
        col_headers = [
            "SUBJECTS", bulletin.get("seq1_label", "1st SEQ."),
            bulletin.get("seq2_label", "2nd SEQ."), "Average", "Coef",
            "Total marks", "Rank", "Appre.", "Teacher's sign.",
        ]
        prof_header = "Teacher's sign."
    else:
        col_headers = [
            "MATIERE", bulletin.get("seq1_label", "1e eva"),
            bulletin.get("seq2_label", "2e eva"), "Moyenne", "Coef",
            "Notes", "Rang", "Appre.", "Professeur M. \\ Mme.",
        ]
        prof_header = "Professeur"

    table_data = [col_headers]

    for group in bulletin.get("groupes_matieres", []):
        table_data.append([group["label"]] + [""] * (len(col_headers) - 1))
        for row in group.get("matieres", []):
            table_data.append([
                row.get("matiere", "—"),
                str(row.get("seq1") if row.get("seq1") is not None else "—"),
                str(row.get("seq2") if row.get("seq2") is not None else "—"),
                str(row.get("moyenne") if row.get("moyenne") is not None else "—"),
                str(row.get("coef", "—")),
                str(row.get("points") if row.get("points") is not None else "—"),
                str(row.get("rang_matiere") or "—"),
                row.get("appreciation", "—"),
                row.get("professeur", "—"),
            ])

    if len(table_data) == 1:
        table_data.append(["—"] * len(col_headers))

    col_widths = [4.2 * cm, 1.5 * cm, 1.5 * cm, 1.5 * cm, 1.2 * cm, 1.5 * cm, 1.2 * cm, 1.2 * cm, 3.2 * cm]
    grades_table = Table(table_data, colWidths=col_widths, repeatRows=1)
    styles = [
        ("BACKGROUND", (0, 0), (-1, 0), blue),
        ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
        ("FONTSIZE", (0, 0), (-1, -1), 6.5),
        ("ALIGN", (1, 0), (-1, -1), "CENTER"),
        ("ALIGN", (0, 0), (0, -1), "LEFT"),
        ("GRID", (0, 0), (-1, -1), 0.25, colors.black),
        ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
        ("TOPPADDING", (0, 0), (-1, -1), 2),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 2),
    ]
    row_idx = 1
    for group in bulletin.get("groupes_matieres", []):
        styles.append(("BACKGROUND", (0, row_idx), (-1, row_idx), dark_blue))
        styles.append(("TEXTCOLOR", (0, row_idx), (-1, row_idx), colors.white))
        styles.append(("FONTNAME", (0, row_idx), (-1, row_idx), "Helvetica-Bold"))
        styles.append(("SPAN", (0, row_idx), (-1, row_idx)))
        row_idx += 1 + len(group.get("matieres", []))

    grades_table.setStyle(TableStyle(styles))
    elements.append(grades_table)

    # ── Résumé ──
    if lang == "en":
        summary_data = [
            [
                _p(f"<b>TOTAL</b><br/>{bulletin.get('total_coef', 0)}", 7, True, "CENTER"),
                _p(f"<b>Total marks</b><br/>{bulletin.get('total_points', 0)}", 7, True, "CENTER"),
                _p(f"<b>Class Average</b><br/>{bulletin.get('moyenne_classe', '—')}", 7, True, "CENTER"),
                _p(f"<b>Term Average</b><br/>{bulletin.get('moyenne_generale', '—')}", 7, True, "CENTER"),
                _p(f"<b>Position</b><br/>{bulletin.get('rang_label', '—')}", 7, True, "CENTER"),
                _p(f"<b>Remark</b><br/>{bulletin.get('decision', '—')}", 7, True, "CENTER"),
            ],
            [
                _p(f"<b>Absences (hours)</b>", 7),
                _p(str(bulletin.get("absences", 0)), 7, align="CENTER"),
                _p("", 7),
                _p(f"<b>Sanctions</b><br/>{bulletin.get('sanctions', '')}", 7),
                _p(f"<b>Observation</b><br/>{bulletin.get('observation', '')}", 7),
                _p("", 7),
            ],
        ]
    else:
        summary_data = [
            [
                _p(f"<b>TOTAL</b><br/>Coef: {bulletin.get('total_coef', 0)}", 7, True, "CENTER"),
                _p(f"Notes: {bulletin.get('total_points', 0)}", 7, True, "CENTER"),
                _p(f"<b>Moyenne de la classe</b><br/>{bulletin.get('moyenne_classe', '—')}", 7, True, "CENTER"),
                _p(f"<b>Moyenne</b><br/>{bulletin.get('moyenne_generale', '—')}", 7, True, "CENTER"),
                _p(f"<b>Absences</b><br/>{bulletin.get('absences', 0)}", 7, True, "CENTER"),
                _p(f"<b>Rang</b><br/>{bulletin.get('rang_label', '—')}", 7, True, "CENTER"),
            ],
            [
                _p(f"<b>Decision</b><br/>{bulletin.get('decision', '—')}", 7, True, "CENTER"),
                _p(f"<b>OBSERVATION</b><br/>{bulletin.get('observation', '')}", 7),
                _p("", 7),
                _p("", 7),
                _p("", 7),
                _p("", 7),
            ],
        ]

    summary_table = Table(summary_data, colWidths=[3.67 * cm] * 6)
    summary_table.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, -1), peach),
        ("BOX", (0, 0), (-1, -1), 0.5, colors.black),
        ("INNERGRID", (0, 0), (-1, -1), 0.25, colors.grey),
        ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
    ]))
    elements.append(summary_table)

    # ── Signatures ──
    if lang == "en":
        sig_labels = ["PARENTS/GUARDIANS", "S.D.M", "PRINCIPAL", "DATE"]
    else:
        sig_labels = ["PARENTS/TUTEURS", "PROF PRINCIPAL", "PRINCIPAL", "DATE"]

    sig_table = Table([sig_labels, ["", "", "", ""]], colWidths=[5.5 * cm] * 4)
    sig_table.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, 0), green),
        ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
        ("FONTSIZE", (0, 0), (-1, -1), 7),
        ("ALIGN", (0, 0), (-1, -1), "CENTER"),
        ("BOX", (0, 0), (-1, -1), 0.5, colors.black),
        ("INNERGRID", (0, 0), (-1, -1), 0.25, colors.grey),
        ("TOPPADDING", (0, 1), (-1, 1), 18),
    ]))
    elements.append(sig_table)

    footer_note = school.get("bulletin_next_term_note", "")
    if footer_note:
        elements.append(Spacer(1, 2 * mm))
        elements.append(_p(footer_note, 6))

    doc.build(elements)
    buffer.seek(0)
    return buffer.getvalue()
