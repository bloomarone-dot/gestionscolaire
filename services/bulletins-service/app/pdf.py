"""Génération PDF du bulletin — reproduction fidèle du « STUDENT'S PROGRESS
REPORT CARD » officiel (modèle Cameroun, ex. Royal Priesthood).

Portrait A4, en-tête bilingue MINESEC (fond vert), bandeau titre, bloc identité,
tableau des matières en 3 groupes (colonnes : 2 séquences du trimestre, Average,
Coef, Total marks, Rank, Appre., Teacher's sign.), puis pied (TOTAL, CLASS/TERM
AVERAGE, POSITION/OUT OF, REMARK, OBSERVATION) et zone signatures.
"""
import io

from reportlab.lib import colors
from reportlab.lib.enums import TA_CENTER, TA_LEFT
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle
from reportlab.lib.units import cm
from reportlab.platypus import Paragraph, SimpleDocTemplate, Spacer, Table, TableStyle

from app.labels import ordinal, seq_labels

GREEN = colors.HexColor("#d9ead3")
BLUE = colors.HexColor("#9fc5e8")
BLUE_DK = colors.HexColor("#6fa8dc")
PEACH = colors.HexColor("#fce5cd")
BLACK = colors.black

EN_HEAD = ["REPUBLIC OF CAMEROON", "Peace-Work-Fatherland", "MINISTRY OF SECONDARY EDUCATION"]
FR_HEAD = ["REPUBLIQUE DU CAMEROUN", "Paix-Travail-Patrie", "MINISTERE DE L'ENSEIGNEMENT SECONDAIRE"]

# 9 colonnes (largeurs en cm) sur ~19 cm utiles (A4 portrait).
COLS = [4.4, 1.35, 1.35, 1.6, 1.0, 1.6, 1.2, 1.9, 4.6]


def _fmt(v) -> str:
    if v is None or v == "":
        return ""
    if isinstance(v, float):
        return f"{v:.2f}".rstrip("0").rstrip(".")
    return str(v)


def render_bulletin_pdf(data: dict) -> bytes:
    header = data["header"]
    L = header["labels"]
    b = data.get("bulletin") or {}
    lang = data.get("lang", "fr")
    trimestre = header.get("trimestre", 1)
    sa, sb = seq_labels(trimestre, lang)

    buf = io.BytesIO()
    doc = SimpleDocTemplate(
        buf, pagesize=A4, topMargin=0.7 * cm, bottomMargin=0.7 * cm,
        leftMargin=0.8 * cm, rightMargin=0.8 * cm,
    )
    story = [
        _national_header(header),
        _title_bar(L),
        _identity(header, b, L),
        _subjects(b, L, sa, sb),
        _footer(b, data, header, L),
        _signatures(L),
        _next_term(header, L),
    ]
    doc.build(story)
    return buf.getvalue()


def _p(text, size=6.5, bold=False, align=TA_LEFT, color=BLACK):
    style = ParagraphStyle(
        "p", fontName="Helvetica-Bold" if bold else "Helvetica",
        fontSize=size, leading=size + 1.5, alignment=align, textColor=color,
    )
    return Paragraph(text, style)


def _national_header(header) -> Table:
    school = (header.get("school_name") or "").upper()
    reg = header.get("delegation_regional") or "REGIONAL DELEGATION"
    dep = header.get("delegation_departementale") or "DIVISIONAL DELEGATION"
    motto = header.get("motto") or ""
    pobox = header.get("po_box") or ""

    en = "<br/>".join(EN_HEAD + [reg, dep, f"<b>{school}</b>", motto, f"PO BOX: {pobox}"])
    fr = "<br/>".join(FR_HEAD + [reg, dep, f"<b>{school}</b>", motto, f"BP: {pobox}"])
    center = _p(f"<b>{school}</b><br/>{motto}", size=8, align=TA_CENTER)

    t = Table([[_p(en, align=TA_LEFT), center, _p(fr, align=TA_LEFT)]],
              colWidths=[7.5 * cm, 4 * cm, 7.5 * cm])
    t.setStyle(TableStyle([
        ("BOX", (0, 0), (-1, -1), 0.8, BLACK),
        ("INNERGRID", (0, 0), (-1, -1), 0.6, BLACK),
        ("BACKGROUND", (0, 0), (-1, -1), GREEN),
        ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
        ("TOPPADDING", (0, 0), (-1, -1), 2),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 2),
    ]))
    return t


def _title_bar(L) -> Table:
    t = Table([[_p(L["report_title"], size=9, bold=True, align=TA_CENTER, color=colors.white)]],
              colWidths=[19 * cm])
    t.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, -1), BLUE_DK),
        ("BOX", (0, 0), (-1, -1), 0.8, BLACK),
        ("TOPPADDING", (0, 0), (-1, -1), 3), ("BOTTOMPADDING", (0, 0), (-1, -1), 3),
    ]))
    return t


def _identity(header, b, L) -> Table:
    name = f"{b.get('nom') or ''} {b.get('prenom') or ''}".strip()
    rows = [
        [_p(f"{L['name']}:", bold=True), _p(f"<b>{name}</b>", size=9), _p(f"{L['class']}:", bold=True),
         _p(header.get("classe") or "", bold=True), _p(b.get("sexe") or "", bold=True, align=TA_CENTER)],
        [_p(f"{L['class_enrollment']}: {header.get('effectif') or ''}", bold=True), "",
         _p(f"{L['repeater']}: {b.get('redoublant') or 'NON'}", bold=True), "", ""],
        [_p(f"{L['unique_id']}: {b.get('matricule') or ''}", bold=True), "",
         _p(header.get("term") or "", bold=True, align=TA_CENTER), "",
         _p(f"{L['year']}: {header.get('school_year') or ''}", bold=True)],
    ]
    t = Table(rows, colWidths=[6 * cm, 5 * cm, 4 * cm, 2 * cm, 2 * cm])
    t.setStyle(TableStyle([
        ("BOX", (0, 0), (-1, -1), 0.8, BLACK),
        ("INNERGRID", (0, 0), (-1, -1), 0.5, BLACK),
        ("BACKGROUND", (0, 1), (-1, 1), GREEN),
        ("SPAN", (0, 1), (1, 1)), ("SPAN", (2, 1), (4, 1)),
        ("SPAN", (0, 2), (1, 2)), ("SPAN", (2, 2), (3, 2)),
        ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
        ("TOPPADDING", (0, 0), (-1, -1), 2), ("BOTTOMPADDING", (0, 0), (-1, -1), 2),
    ]))
    return t


def _subjects(b, L, sa, sb) -> Table:
    head = [L["subjects"], sa, sb, L["average"], L["coefficient"], L["total_marks"],
            L["rank"], L["appreciation"], L["teacher_sign"]]
    rows = [[_p(h, bold=True, align=TA_CENTER, color=colors.white) for h in head]]
    style = [
        ("GRID", (0, 0), (-1, -1), 0.5, BLACK),
        ("BACKGROUND", (0, 0), (-1, 0), BLUE_DK),
        ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
        ("ALIGN", (1, 0), (7, -1), "CENTER"),
        ("TOPPADDING", (0, 0), (-1, -1), 1.5), ("BOTTOMPADDING", (0, 0), (-1, -1), 1.5),
    ]

    groups: dict[int, list] = {}
    for s in b.get("subjects", []):
        groups.setdefault(s.get("groupe") or 1, []).append(s)

    for g in sorted(groups):
        rows.append([_p(L.get(f"group_{g}", f"GROUP {g}"), bold=True, align=TA_CENTER)] + [""] * 8)
        gi = len(rows) - 1
        style += [("SPAN", (0, gi), (-1, gi)), ("BACKGROUND", (0, gi), (-1, gi), BLUE)]
        for s in groups[g]:
            rows.append([
                _p(s["nom"], bold=True),
                _p(_fmt(s.get("seq1")), align=TA_CENTER), _p(_fmt(s.get("seq2")), align=TA_CENTER),
                _p(_fmt(s.get("moyenne")), align=TA_CENTER), _p(_fmt(s.get("coefficient")), align=TA_CENTER),
                _p(_fmt(s.get("points")), align=TA_CENTER), _p(ordinal(s.get("rang_matiere"), "en"), align=TA_CENTER),
                _p(s.get("appreciation", ""), align=TA_CENTER), _p((s.get("enseignant_nom") or "").upper(), align=TA_CENTER),
            ])

    t = Table(rows, colWidths=[c * cm for c in COLS], repeatRows=1)
    t.setStyle(TableStyle(style))
    return t


def _footer(b, data, header, L) -> Table:
    lang = data.get("lang", "fr")
    moy = b.get("moyenne_generale")
    rows = [
        [_p(L["total"], bold=True, align=TA_CENTER), "", _p(_fmt(b.get("total_coefficient")), bold=True, align=TA_CENTER),
         _p(_fmt(b.get("total_points")), bold=True, align=TA_CENTER), _p(L["class_average"], bold=True, align=TA_CENTER),
         _p(_fmt(data.get("moyenne_classe")), bold=True, align=TA_CENTER), _p(L["sanctions"], bold=True, align=TA_CENTER)],
        [_p(L["term_average"], bold=True), _p(_fmt(moy), bold=True, align=TA_CENTER),
         _p(b.get("appreciation_generale") or "", bold=True, align=TA_CENTER), _p(L["absences"], bold=True, align=TA_CENTER),
         _p("0", align=TA_CENTER), _p("0", align=TA_CENTER), ""],
        [_p(L["position"], bold=True), _p(ordinal(b.get("rang_general"), lang), bold=True, align=TA_CENTER),
         _p(L["out_of"], bold=True, align=TA_CENTER), _p(str(header.get("effectif") or ""), bold=True, align=TA_CENTER),
         _p(L["remark"], bold=True, align=TA_CENTER), _p(b.get("decision") or "", bold=True, align=TA_CENTER), ""],
        [_p(L["observation"], bold=True), "", "", "", "", "", ""],
    ]
    t = Table(rows, colWidths=[3.5 * cm, 2.5 * cm, 2.5 * cm, 3 * cm, 3 * cm, 2.5 * cm, 2 * cm])
    t.setStyle(TableStyle([
        ("BOX", (0, 0), (-1, -1), 0.8, BLACK),
        ("INNERGRID", (0, 0), (-1, -1), 0.5, BLACK),
        ("BACKGROUND", (0, 0), (-1, -1), PEACH),
        ("SPAN", (0, 0), (1, 0)),       # TOTAL
        ("SPAN", (1, 3), (6, 3)),       # OBSERVATION zone
        ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
        ("TOPPADDING", (0, 0), (-1, -1), 3), ("BOTTOMPADDING", (0, 0), (-1, 2), 3),
        ("BOTTOMPADDING", (0, 3), (-1, 3), 14),
    ]))
    return t


def _signatures(L) -> Table:
    rows = [[_p(L["parents"], bold=True, align=TA_CENTER), _p(L["sdm"], bold=True, align=TA_CENTER),
             _p(L["principal"], bold=True, align=TA_CENTER), _p(L["date"], bold=True, align=TA_CENTER)],
            ["", "", "", ""]]
    t = Table(rows, colWidths=[4.75 * cm] * 4, rowHeights=[0.55 * cm, 1.7 * cm])
    t.setStyle(TableStyle([
        ("BOX", (0, 0), (-1, -1), 0.8, BLACK),
        ("INNERGRID", (0, 0), (-1, -1), 0.5, BLACK),
        ("VALIGN", (0, 0), (-1, 0), "MIDDLE"),
    ]))
    return t


def _next_term(header, L) -> Table:
    note = header.get("next_term")
    if not note:
        return Spacer(1, 0.1 * cm)
    t = Table([[_p(f"{L['next_term']}: {note}", bold=True)]], colWidths=[19 * cm])
    t.setStyle(TableStyle([
        ("BOX", (0, 0), (-1, -1), 0.8, BLACK),
        ("TOPPADDING", (0, 0), (-1, -1), 2), ("BOTTOMPADDING", (0, 0), (-1, -1), 2),
    ]))
    return t
