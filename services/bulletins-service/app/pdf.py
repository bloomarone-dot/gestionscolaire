"""Génération PDF du bulletin — format officiel bilingue Cameroun (§11.2/§11.3).

Mise en page identique FR/EN ; seuls les libellés et la liste des matières
changent. En-tête bilingue MINESEC, colonnes 1e/2e évaluation, regroupement par
« groupe » (second cycle francophone), section « Matières complémentaires »,
pied (décision, observation) et zone signatures.
"""
import io

from reportlab.lib import colors
from reportlab.lib.enums import TA_CENTER
from reportlab.lib.pagesizes import A4, landscape
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.lib.units import cm
from reportlab.platypus import Paragraph, SimpleDocTemplate, Spacer, Table, TableStyle

PRIMARY = colors.HexColor("#3b4cca")
LIGHT = colors.HexColor("#e8eaf6")
GREY = colors.HexColor("#9e9e9e")

EN_HEAD = ["REPUBLIC OF CAMEROON", "Peace – Work – Fatherland",
           "MINISTRY OF SECONDARY EDUCATION"]
FR_HEAD = ["RÉPUBLIQUE DU CAMEROUN", "Paix – Travail – Patrie",
           "MINISTÈRE DES ENSEIGNEMENTS SECONDAIRES"]


def _fmt(v) -> str:
    if v is None or v == "":
        return "—"
    if isinstance(v, float):
        return f"{v:.2f}".rstrip("0").rstrip(".")
    return str(v)


def render_bulletin_pdf(data: dict) -> bytes:
    """`data` = sortie de service.build_eleve_bulletin."""
    header = data["header"]
    L = header["labels"]
    b = data.get("bulletin") or {}

    buf = io.BytesIO()
    doc = SimpleDocTemplate(
        buf, pagesize=landscape(A4),
        topMargin=0.8 * cm, bottomMargin=0.8 * cm,
        leftMargin=1 * cm, rightMargin=1 * cm,
    )
    base = getSampleStyleSheet()["Normal"]
    base.fontSize = 8
    cell = ParagraphStyle("cell", parent=base, fontSize=7.5, leading=9)
    cellc = ParagraphStyle("cellc", parent=cell, alignment=TA_CENTER)
    title = ParagraphStyle("title", parent=base, fontSize=14, alignment=TA_CENTER, spaceAfter=2)

    story = [_national_header(header, cell, cellc), Spacer(1, 0.15 * cm),
             Paragraph(f"<b>{L['report_title']}</b>", title),
             _identity(header, b, L, cell), Spacer(1, 0.15 * cm),
             _subjects_table(b, L, data, cellc),
             Spacer(1, 0.15 * cm), _summary(b, data, L),
             Spacer(1, 0.5 * cm), _signatures(L)]
    doc.build(story)
    return buf.getvalue()


def _national_header(header, cell, cellc) -> Table:
    school = header.get("school_name") or ""
    extra = " — ".join(x for x in [header.get("po_box"), header.get("motto")] if x)
    en = "<br/>".join(EN_HEAD + [f"<b>{school}</b>"])
    fr = "<br/>".join(FR_HEAD + [f"<b>{school}</b>"])
    center = Paragraph(
        f"<b>{school}</b><br/>{extra}" if extra else f"<b>{school}</b>", cellc
    )
    t = Table([[Paragraph(en, cell), center, Paragraph(fr, cell)]],
              colWidths=[9.5 * cm, 8 * cm, 9.5 * cm])
    t.setStyle(TableStyle([
        ("BOX", (0, 0), (-1, -1), 0.5, GREY),
        ("INNERGRID", (0, 0), (-1, -1), 0.5, GREY),
        ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
        ("ALIGN", (1, 0), (1, 0), "CENTER"),
    ]))
    return t


def _identity(header, b, L, cell) -> Table:
    profile = " – ".join(x for x in [
        header.get("subsystem_code"), header.get("type_code"),
        header.get("level_code"), header.get("series_code"),
    ] if x)
    nom = f"{b.get('nom') or ''} {b.get('prenom') or ''}".strip()
    rows = [
        [f"{L['name_field']}: {nom}", f"Classe: {header.get('classe') or ''}",
         f"{L['effectif']}: {header.get('effectif') or ''}",
         f"{L['redoublant']}: {b.get('redoublant') or 'NON'}"],
        [f"{L['serie']}: {header.get('series_code') or '—'}",
         f"{L['matricule']}: {b.get('matricule') or '—'}",
         header.get("term") or "", f"{L['school_year']}: {header.get('school_year') or '—'}"],
        [f"{profile}", "", "", ""],
    ]
    t = Table(rows, colWidths=[9 * cm, 7 * cm, 5.5 * cm, 5.5 * cm])
    t.setStyle(TableStyle([
        ("BOX", (0, 0), (-1, -1), 0.5, GREY),
        ("INNERGRID", (0, 0), (-1, -1), 0.5, GREY),
        ("SPAN", (0, 2), (-1, 2)),
        ("FONTSIZE", (0, 0), (-1, -1), 8),
        ("BACKGROUND", (0, 2), (-1, 2), LIGHT),
    ]))
    return t


def _subjects_table(b, L, data, cellc) -> Table:
    col_widths = [5.6 * cm, 1.6 * cm, 1.6 * cm, 1.8 * cm, 1.3 * cm,
                  1.7 * cm, 1.3 * cm, 3.0 * cm, 5.1 * cm]
    head = [L["subject"], L["eval1"], L["eval2"], L["average"], L["coefficient"],
            L["mark"], L["rank"], L["appreciation"], L["teacher"]]
    rows = [head]
    style = [
        ("GRID", (0, 0), (-1, -1), 0.4, GREY),
        ("BACKGROUND", (0, 0), (-1, 0), PRIMARY),
        ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
        ("FONTSIZE", (0, 0), (-1, -1), 7.5),
        ("ALIGN", (1, 0), (6, -1), "CENTER"),
        ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
    ]

    def subj_row(s):
        return [s["nom"],
                _fmt(s.get("seq1")), _fmt(s.get("seq2")), _fmt(s.get("moyenne")),
                _fmt(s.get("coefficient")), _fmt(s.get("points")),
                _fmt(s.get("rang_matiere")), s.get("appreciation", ""),
                s.get("enseignant_nom") or ""]

    # Matières officielles regroupées (groupe défaut = 1 tant que non affecté).
    official = b.get("subjects", [])
    groups: dict[int, list] = {}
    for s in official:
        groups.setdefault(s.get("groupe") or 1, []).append(s)
    for g in sorted(groups):
        rows.append([L.get(f"group_{g}", f"Groupe {g}")] + [""] * 8)
        gi = len(rows) - 1
        style += [("SPAN", (0, gi), (-1, gi)), ("BACKGROUND", (0, gi), (-1, gi), LIGHT),
                  ("FONTNAME", (0, gi), (0, gi), "Helvetica-Bold")]
        for s in groups[g]:
            rows.append(subj_row(s))

    # Section matières complémentaires (spéciales) — §11.3
    special = b.get("special_subjects", [])
    if special:
        rows.append([L["complementary"]] + [""] * 8)
        si = len(rows) - 1
        style += [("SPAN", (0, si), (-1, si)), ("BACKGROUND", (0, si), (-1, si), LIGHT),
                  ("FONTNAME", (0, si), (0, si), "Helvetica-Bold")]
        for s in special:
            rows.append([s["nom"], _fmt(s.get("seq1")), _fmt(s.get("seq2")),
                         _fmt(s.get("moyenne")), _fmt(s.get("coefficient")),
                         _fmt(s.get("points")), "—", s.get("appreciation", ""), ""])

    # Ligne TOTAL
    rows.append([f"{L['total_coeff']}", "", "", "", _fmt(b.get("total_coefficient")),
                 _fmt(b.get("total_points")), "", "", ""])
    ti = len(rows) - 1
    style += [("BACKGROUND", (0, ti), (-1, ti), LIGHT),
              ("FONTNAME", (0, ti), (-1, ti), "Helvetica-Bold")]

    t = Table(rows, colWidths=col_widths, repeatRows=1)
    t.setStyle(TableStyle(style))
    return t


def _summary(b, data, L) -> Table:
    rows = [[
        f"{L['general_average']}: {_fmt(b.get('moyenne_generale'))}",
        f"{L['class_average']}: {_fmt(data.get('moyenne_classe'))}",
        f"{L['general_rank']}: {_fmt(b.get('rang_general'))}",
        f"{L['absences']}: {b.get('absences') or 0}",
        f"{L['decision']}: {b.get('decision') or ''}",
    ], [f"{L['observation']}: {b.get('observation') or ''}", "", "", "", ""]]
    t = Table(rows, colWidths=[6.5 * cm, 6.5 * cm, 5 * cm, 3.5 * cm, 5.5 * cm])
    t.setStyle(TableStyle([
        ("GRID", (0, 0), (-1, -1), 0.4, GREY),
        ("FONTSIZE", (0, 0), (-1, -1), 8.5),
        ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
        ("SPAN", (0, 1), (-1, 1)),
        ("BACKGROUND", (0, 0), (-1, 0), LIGHT),
    ]))
    return t


def _signatures(L) -> Table:
    rows = [[L["parent"], L["teacher_principal"], L["head"], L["date"]], ["", "", "", ""]]
    t = Table(rows, colWidths=[6.75 * cm] * 4, rowHeights=[0.7 * cm, 2 * cm])
    t.setStyle(TableStyle([
        ("GRID", (0, 0), (-1, -1), 0.4, GREY),
        ("FONTSIZE", (0, 0), (-1, 0), 8.5),
        ("ALIGN", (0, 0), (-1, 0), "CENTER"),
        ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
        ("BACKGROUND", (0, 0), (-1, 0), LIGHT),
    ]))
    return t
