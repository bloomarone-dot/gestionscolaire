"""
Génération PDF — bulletin officiel Cameroun (FR / EN).
Grille unique 9 colonnes pour aligner toutes les sections verticalement.
"""
import base64
import io
import re

from reportlab.lib import colors
from reportlab.lib.pagesizes import A4, landscape
from reportlab.lib.styles import ParagraphStyle
from reportlab.lib.units import cm, mm
from reportlab.platypus import (
    Image, Paragraph, SimpleDocTemplate, Table, TableStyle,
)

PAGE_W = 22 * cm
N_COLS = 9
GRADES_COL_WIDTHS = [6.2, 1.7, 1.7, 1.7, 1.4, 1.7, 1.4, 1.4, 3.8]
COL_WIDTHS = [w * cm for w in GRADES_COL_WIDTHS]


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


def _row_from_spans(cells: list[tuple], n_cols: int) -> list:
    """Construit une ligne tableau : [(contenu, colspan), ...]."""
    row: list = []
    for content, span in cells:
        row.append(content)
        row.extend([""] * (span - 1))
    if len(row) != n_cols:
        raise ValueError(f"Ligne invalide ({len(row)} colonnes au lieu de {n_cols})")
    return row


def _distribute_spans(n_cols: int, parts: int) -> list[int]:
    base = n_cols // parts
    rem = n_cols % parts
    return [base + (1 if i < rem else 0) for i in range(parts)]


def _apply_spans(styles: list, row_idx: int, spans: list[int]) -> None:
    col = 0
    for span in spans:
        if span > 1:
            styles.append(("SPAN", (col, row_idx), (col + span - 1, row_idx)))
        col += span


def build_cameroon_bulletin_pdf(bulletin: dict) -> bytes:
    lang = bulletin.get("lang", "fr")
    school = bulletin.get("school", {})
    is_annual = bulletin.get("bulletin_scope") == "annual"
    n_cols = 14 if is_annual else N_COLS
    page_w = 27.7 * cm if is_annual else PAGE_W
    col_widths = [page_w / n_cols] * n_cols
    info_spans = _distribute_spans(n_cols, 4)
    summary_spans = _distribute_spans(n_cols, 6)
    sig_spans = _distribute_spans(n_cols, 4)
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
    grey_title = colors.HexColor("#e8e8e8")

    elements = []

    # ── En-tête bilingue (3 colonnes, pleine largeur) ──
    header_en = school.get("bulletin_delegation_en", "")
    header_fr = school.get("bulletin_delegation_fr", "")
    school_name = school.get("name", "ÉTABLISSEMENT")
    motto = school.get("bulletin_motto", "")
    po_box = school.get("bulletin_po_box", "")
    logo_url = school.get("logo_url")

    header_table = Table(
        [[
            _p(
                header_en
                + (f"\n{school_name}" if school_name else "")
                + (f"\n{motto}" if motto else "")
                + (f"\n{po_box}" if po_box else ""),
                6,
            ),
            _logo_cell(logo_url),
            _p(
                header_fr
                + (f"\n{school_name}" if school_name else "")
                + (f"\n{motto}" if motto else "")
                + (f"\n{po_box}" if po_box else ""),
                6,
                align="RIGHT",
            ),
        ]],
        colWidths=[8.5 * cm, 5 * cm, 8.5 * cm],
    )
    header_table.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, -1), green),
        ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
        ("BOX", (0, 0), (-1, -1), 0.5, colors.black),
        ("INNERGRID", (0, 0), (-1, -1), 0.25, colors.grey),
    ]))
    elements.append(header_table)

    # ── Corps du bulletin — une seule table 9 colonnes ──
    eleve_nom = bulletin.get("eleve_nom", "")
    eleve_prenom = bulletin.get("eleve_prenom", "")
    eleve_full = f"<b>{eleve_nom} {eleve_prenom}</b>".strip()

    title = "STUDENT'S PROGRESS REPORT CARD" if lang == "en" else "BULLETIN"
    body_rows: list[list] = []
    span_specs: list[tuple[int, list[int]]] = []
    row_styles: list[tuple] = []

    def add_row(cells: list[tuple], spans: list[int], style_key: str | None = None):
        row_idx = len(body_rows)
        body_rows.append(_row_from_spans(cells, n_cols))
        span_specs.append((row_idx, spans))
        if style_key:
            row_styles.append((row_idx, style_key))

    add_row([(_p(title, 11, True, "CENTER"), n_cols)], [n_cols], "title")

    if lang == "en":
        add_row([
            (_p(f"<b>Name:</b> {eleve_full}", 7), info_spans[0]),
            (_p(f"<b>Class:</b> {bulletin.get('classe', '—')}", 7), info_spans[1]),
            (_p(f"<b>Sex:</b> {bulletin.get('eleve_sexe', '—')}", 7), info_spans[2]),
            (_p(f"<b>Class Enrollment:</b> {bulletin.get('effectif', '—')}", 7), info_spans[3]),
        ], info_spans, "info")
        row2_right = info_spans[3]
        row2_half = row2_right // 2 or 1
        info_row2 = [info_spans[0], info_spans[1] + info_spans[2], row2_half, row2_right - row2_half]
        add_row([
            (_p(f"<b>Repeater:</b> {bulletin.get('redoublant', 'NO')}", 7), info_row2[0]),
            (_p(f"<b>Unique ID:</b> {bulletin.get('matricule', '—')}", 7), info_row2[1]),
            (_p(f"<b>Term:</b> {bulletin.get('term_label', '')}", 7, True), info_row2[2]),
            (_p(f"<b>Year:</b> {bulletin.get('annee_scolaire', '—')}", 7, True), info_row2[3]),
        ], info_row2, "info")
    else:
        add_row([
            (_p(f"<b>NOM:</b> {eleve_full}", 7), info_spans[0]),
            (_p(f"<b>Classe:</b> {bulletin.get('classe', '—')}", 7), info_spans[1]),
            (_p(f"<b>Effectif:</b> {bulletin.get('effectif', '—')}", 7), info_spans[2]),
            (_p(f"<b>Redoublant:</b> {bulletin.get('redoublant', 'NON')}", 7), info_spans[3]),
        ], info_spans, "info")
        row2_right = info_spans[3]
        row2_half = row2_right // 2 or 1
        info_row2 = [info_spans[0], info_spans[1] + info_spans[2], row2_half, row2_right - row2_half]
        add_row([
            (_p(f"<b>Serie:</b> {bulletin.get('classe_serie', '—')}", 7), info_row2[0]),
            (_p(f"<b>Matricule:</b> {bulletin.get('matricule', '—')}", 7), info_row2[1]),
            (_p(f"<b>{bulletin.get('term_label', '')}</b>", 7, True), info_row2[2]),
            (_p(f"<b>Annee</b> {bulletin.get('annee_scolaire', '—')}", 7, True), info_row2[3]),
        ], info_row2, "info")
    seq_labels = bulletin.get("sequence_labels") or [
        bulletin.get("seq1_label", "1st SEQ."),
        bulletin.get("seq2_label", "2nd SEQ."),
    ]
    tail_headers_en = ["Average", "Coef", "Total marks", "Rank", "Appre.", "Teacher's sign."]
    tail_headers_fr = ["Moyenne", "Coef", "Notes", "Rang", "Appre.", "Professeur M. \\ Mme."]
    if lang == "en":
        col_headers = ["SUBJECTS", *seq_labels, *tail_headers_en]
    else:
        col_headers = ["MATIERE", *seq_labels, *tail_headers_fr]

    add_row([(h, 1) for h in col_headers], [1] * n_cols, "grades_header")

    for group in bulletin.get("groupes_matieres", []):
        add_row([(_p(f"<b>{group['label']}</b>", 7, True, "CENTER"), n_cols)], [n_cols], "group")
        for row in group.get("matieres", []):
            seq_cells = []
            if is_annual:
                for i in range(1, 7):
                    seq_cells.append((str(row.get(f"seq{i}") if row.get(f"seq{i}") is not None else "—"), 1))
            else:
                seq_cells = [
                    (str(row.get("seq1") if row.get("seq1") is not None else "—"), 1),
                    (str(row.get("seq2") if row.get("seq2") is not None else "—"), 1),
                ]
            add_row([
                (row.get("matiere", "—"), 1),
                *seq_cells,
                (str(row.get("moyenne") if row.get("moyenne") is not None else "—"), 1),
                (str(row.get("coef", "—")), 1),
                (str(row.get("points") if row.get("points") is not None else "—"), 1),
                (str(row.get("rang_matiere") or "—"), 1),
                (row.get("appreciation", "—"), 1),
                (row.get("professeur", "—"), 1),
            ], [1] * n_cols, "grade")

    if not bulletin.get("groupes_matieres"):
        add_row([("—", 1)] * n_cols, [1] * n_cols, "grade")

    if lang == "en":
        add_row([
            (_p(f"<b>TOTAL</b><br/>{bulletin.get('total_coef', 0)}", 7, True, "CENTER"), summary_spans[0]),
            (_p(f"<b>Total marks</b><br/>{bulletin.get('total_points', 0)}", 7, True, "CENTER"), summary_spans[1]),
            (_p(f"<b>Class Average</b><br/>{bulletin.get('moyenne_classe', '—')}", 7, True, "CENTER"), summary_spans[2]),
            (_p(f"<b>Term Average</b><br/>{bulletin.get('moyenne_generale', '—')}", 7, True, "CENTER"), summary_spans[3]),
            (_p(f"<b>Position</b><br/>{bulletin.get('rang_label', '—')}", 7, True, "CENTER"), summary_spans[4]),
            (_p(f"<b>Remark</b><br/>{bulletin.get('decision', '—')}", 7, True, "CENTER"), summary_spans[5]),
        ], summary_spans, "summary")
        add_row([
            (_p("<b>Absences (hours)</b>", 7), summary_spans[0] + summary_spans[1]),
            (_p(str(bulletin.get("absences", 0)), 7, align="CENTER"), summary_spans[2]),
            ("", summary_spans[3]),
            (_p(f"<b>Sanctions</b><br/>{bulletin.get('sanctions', '')}", 7), summary_spans[4]),
            (_p(f"<b>Observation</b><br/>{bulletin.get('observation', '')}", 7), summary_spans[5]),
        ], summary_spans, "summary")
        sig_labels = ["PARENTS/GUARDIANS", "S.D.M", "PRINCIPAL", "DATE"]
    else:
        add_row([
            (_p(f"<b>TOTAL</b><br/>Coef: {bulletin.get('total_coef', 0)}", 7, True, "CENTER"), summary_spans[0]),
            (_p(f"Notes: {bulletin.get('total_points', 0)}", 7, True, "CENTER"), summary_spans[1]),
            (_p(f"<b>Moyenne de la classe</b><br/>{bulletin.get('moyenne_classe', '—')}", 7, True, "CENTER"), summary_spans[2]),
            (_p(f"<b>Moyenne</b><br/>{bulletin.get('moyenne_generale', '—')}", 7, True, "CENTER"), summary_spans[3]),
            (_p(f"<b>Absences</b><br/>{bulletin.get('absences', 0)}", 7, True, "CENTER"), summary_spans[4]),
            (_p(f"<b>Rang</b><br/>{bulletin.get('rang_label', '—')}", 7, True, "CENTER"), summary_spans[5]),
        ], summary_spans, "summary")
        add_row([
            (_p(f"<b>Decision</b><br/>{bulletin.get('decision', '—')}", 7, True, "CENTER"), summary_spans[0] + summary_spans[1]),
            (_p(f"<b>OBSERVATION</b><br/>{bulletin.get('observation', '')}", 7), summary_spans[2] + summary_spans[3] + summary_spans[4]),
            ("", summary_spans[5]),
        ], summary_spans, "summary")
        sig_labels = ["PARENTS/TUTEURS", "PROF PRINCIPAL", "PRINCIPAL", "DATE"]

    add_row([
        (sig_labels[0], sig_spans[0]),
        (sig_labels[1], sig_spans[1]),
        (sig_labels[2], sig_spans[2]),
        (sig_labels[3], sig_spans[3]),
    ], sig_spans, "sig_header")
    add_row([("", sig_spans[0]), ("", sig_spans[1]), ("", sig_spans[2]), ("", sig_spans[3])], sig_spans, "sig_body")

    body_table = Table(body_rows, colWidths=col_widths, repeatRows=0)
    styles = [
        ("BOX", (0, 0), (-1, -1), 0.5, colors.black),
        ("GRID", (0, 0), (-1, -1), 0.25, colors.black),
        ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
        ("TOPPADDING", (0, 0), (-1, -1), 3),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 3),
        ("FONTSIZE", (0, 0), (-1, -1), 6.5),
        ("ALIGN", (1, 0), (-1, -1), "CENTER"),
    ]

    for row_idx, spans in span_specs:
        _apply_spans(styles, row_idx, spans)

    style_keys = {idx: key for idx, key in row_styles}

    for row_idx, key in style_keys.items():
        if key == "title":
            styles.append(("BACKGROUND", (0, row_idx), (-1, row_idx), grey_title))
            styles.append(("ALIGN", (0, row_idx), (-1, row_idx), "CENTER"))
            styles.append(("FONTNAME", (0, row_idx), (-1, row_idx), "Helvetica-Bold"))
        elif key == "info":
            styles.append(("BACKGROUND", (0, row_idx), (-1, row_idx), blue))
            styles.append(("ALIGN", (0, row_idx), (0, row_idx), "LEFT"))
        elif key == "grades_header":
            styles.append(("BACKGROUND", (0, row_idx), (-1, row_idx), blue))
            styles.append(("FONTNAME", (0, row_idx), (-1, row_idx), "Helvetica-Bold"))
            styles.append(("ALIGN", (0, row_idx), (0, row_idx), "LEFT"))
        elif key == "group":
            styles.append(("BACKGROUND", (0, row_idx), (-1, row_idx), dark_blue))
            styles.append(("TEXTCOLOR", (0, row_idx), (-1, row_idx), colors.white))
            styles.append(("FONTNAME", (0, row_idx), (-1, row_idx), "Helvetica-Bold"))
            styles.append(("ALIGN", (0, row_idx), (-1, row_idx), "CENTER"))
        elif key == "grade":
            styles.append(("ALIGN", (0, row_idx), (0, row_idx), "LEFT"))
        elif key == "summary":
            styles.append(("BACKGROUND", (0, row_idx), (-1, row_idx), peach))
            styles.append(("ALIGN", (0, row_idx), (0, row_idx), "LEFT"))
        elif key == "sig_header":
            styles.append(("BACKGROUND", (0, row_idx), (-1, row_idx), green))
            styles.append(("FONTNAME", (0, row_idx), (-1, row_idx), "Helvetica-Bold"))
            styles.append(("ALIGN", (0, row_idx), (-1, row_idx), "CENTER"))
        elif key == "sig_body":
            styles.append(("BACKGROUND", (0, row_idx), (-1, row_idx), green))
            styles.append(("TOPPADDING", (0, row_idx), (-1, row_idx), 18))

    body_table.setStyle(TableStyle(styles))
    elements.append(body_table)

    footer_note = school.get("bulletin_next_term_note", "")
    if footer_note:
        elements.append(_p(footer_note, 6))

    doc.build(elements)
    buffer.seek(0)
    return buffer.getvalue()
