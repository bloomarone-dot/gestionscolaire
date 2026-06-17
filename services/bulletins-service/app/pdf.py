"""PDF bulletin — modèle Royal Priesthood (sections Franco / Anglo).

Reproduction fidèle des bulletins de référence Doc_RoyalPriestHood :
- en-tête bilingue vert + logo centré ;
- bandeau titre bleu ;
- grille identité, notes, synthèse pêche, signatures vertes ;
- colonnes alignées sur toute la largeur (19 cm utiles).
"""
from __future__ import annotations

import io

from reportlab.lib import colors
from reportlab.lib.enums import TA_CENTER, TA_LEFT
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle
from reportlab.lib.units import cm
from reportlab.platypus import Image as RLImage, Paragraph, SimpleDocTemplate, Spacer, Table, TableStyle

from app.labels import ordinal, seq_labels
from app.logo_util import resolve_logo_path

try:
    from common.bulletin_theme import parse_theme
except ImportError:
    def parse_theme(_raw):  # type: ignore
        return {
            "national_header": "#d9ead3", "title_bar": "#6fa8dc",
            "identity_label": "#cfe2f3", "identity_row": "#eeeeee",
            "grades_header": "#6fa8dc", "group_row": "#9fc5e8",
            "grade_row": "#ffffff", "summary": "#fce5cd",
            "signatures": "#d9ead3", "border": "#000000", "text": "#000000",
        }

BLACK = colors.black
WHITE = colors.white

PAGE_W = 19.0 * cm  # largeur utile A4 (marges 0.8 cm)

EN_HEAD = [
    "REPUBLIC OF CAMEROON",
    "Peace-Work-Fatherland",
    "MINISTRY OF SECONDARY EDUCATION",
]
FR_HEAD = [
    "REPUBLIQUE DU CAMEROUN",
    "Paix-Travail-Patrie",
    "MINISTERE DE L'ENSEIGNEMENT SECONDAIRE",
]


def _theme(header) -> dict:
    raw = (header or {}).get("bulletin_theme")
    t = parse_theme(raw)
    return {k: colors.HexColor(v) for k, v in t.items()}


def _span_parts(n: int, parts: int) -> list[int]:
    base = n // parts
    rem = n % parts
    return [base + (1 if i < rem else 0) for i in range(parts)]


def _row_from_spans(items: list[tuple], n_cols: int) -> list:
    row: list = []
    for content, span in items:
        row.append(content)
        row.extend([""] * (span - 1))
    if len(row) != n_cols:
        raise ValueError(f"Ligne invalide ({len(row)} vs {n_cols})")
    return row


def _apply_spans(style_cmds: list, row_idx: int, spans: list[int]) -> None:
    col = 0
    for span in spans:
        if span > 1:
            style_cmds.append(("SPAN", (col, row_idx), (col + span - 1, row_idx)))
        col += span


def _col_widths(n_seq: int) -> list[float]:
    """Largeurs en cm — somme exacte 19.0 pour n séquences."""
    w_subj, w_seq = 4.0, 1.25
    tail = [1.45, 0.95, 1.45, 1.05, 1.55]  # moy, coef, notes, rang, appr
    used = w_subj + w_seq * n_seq + sum(tail)
    w_prof = max(2.8, 19.0 - used)
    if w_prof > 5.5:
        w_prof = 19.0 - used
    total = w_subj + w_seq * n_seq + sum(tail) + w_prof
    if abs(total - 19.0) > 0.01:
        w_prof += 19.0 - total
    return [w_subj] + [w_seq] * n_seq + tail + [w_prof]


def _fmt(v) -> str:
    if v is None or v == "":
        return ""
    if isinstance(v, float):
        return f"{v:.2f}".rstrip("0").rstrip(".")
    return str(v)


def _p(text, size=6.5, bold=False, align=TA_LEFT, color=None):
    style = ParagraphStyle(
        "p", fontName="Helvetica-Bold" if bold else "Helvetica",
        fontSize=size, leading=size + 1.5, alignment=align, textColor=color or BLACK,
    )
    return Paragraph(str(text or ""), style)


def _grid(*style_cmds) -> TableStyle:
    base = [
        ("BOX", (0, 0), (-1, -1), 0.8, BLACK),
        ("INNERGRID", (0, 0), (-1, -1), 0.5, BLACK),
        ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
        ("TOPPADDING", (0, 0), (-1, -1), 2),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 2),
    ]
    return TableStyle(base + list(style_cmds))


def render_bulletin_pdf(data: dict) -> bytes:
    header = data["header"]
    th = _theme(header)
    b = data.get("bulletin") or {}
    lang = data.get("lang", "fr")
    L = header["labels"]
    trimestre = header.get("trimestre", 1)
    seq_lbls = header.get("seq_labels") or list(seq_labels(trimestre, lang))

    buf = io.BytesIO()
    doc = SimpleDocTemplate(
        buf, pagesize=A4, topMargin=0.65 * cm, bottomMargin=0.65 * cm,
        leftMargin=0.8 * cm, rightMargin=0.8 * cm,
    )
    story = [
        _national_header(header, th),
        _title_bar(header.get("report_title") or L["report_title"], th),
        _identity(header, b, L, lang, len(seq_lbls), th),
        _grades_table(b, L, seq_lbls, lang, th),
    ]
    if b.get("special_subjects"):
        story.append(_special_table(b, L, seq_lbls, th))
    story += [
        _footer(b, data, header, L, lang, len(seq_lbls), th),
        _signatures(header, L, lang, th),
        _next_term(header, L),
    ]
    doc.build(story)
    return buf.getvalue()


def _national_header(header, th) -> Table:
    school_en = (header.get("school_name") or "").upper()
    school_fr = (header.get("school_name_fr") or school_en).upper()
    reg_en = header.get("delegation_regional") or "REGIONAL DELEGATION FOR CENTER"
    dep_en = header.get("delegation_departementale") or "DIVISIONAL DELEGATION FOR MEFOU AND AFAMBA"
    reg_fr = header.get("delegation_regional_fr") or "DELEGATION REGIONAL DU CENTRE"
    dep_fr = header.get("delegation_departementale_fr") or "DELEGATION DEPARTEMENTALE DE LA MEFOU ET AFAMBA"
    motto = header.get("motto") or "a chosen generation"
    pobox = header.get("po_box") or ""

    en_lines = EN_HEAD + [reg_en, dep_en, f"<b>{school_en}</b>", f"<i>{motto}</i>", f"PO BOX: {pobox}"]
    fr_lines = FR_HEAD + [reg_fr, dep_fr, f"<b>{school_fr}</b>", f"<i>{motto}</i>", f"BP: {pobox}"]

    logo_path = resolve_logo_path(header.get("logo_url"))
    logo_w = 3.4 * cm
    if logo_path:
        logo = RLImage(logo_path, width=logo_w, height=4.0 * cm)
        logo.hAlign = "CENTER"
        center = logo
    else:
        center = _p(f"<b>{school_en}</b><br/><i>{motto}</i>", size=7, align=TA_CENTER)

    side_w = (PAGE_W - logo_w) / 2
    t = Table(
        [[_p("<br/>".join(en_lines), size=5.5, align=TA_CENTER),
          center,
          _p("<br/>".join(fr_lines), size=5.5, align=TA_CENTER)]],
        colWidths=[side_w, logo_w, side_w],
        hAlign="CENTER",
    )
    t.setStyle(_grid(
        ("BACKGROUND", (0, 0), (-1, -1), th["national_header"]),
        ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
    ))
    return t


def _title_bar(title: str, th) -> Table:
    t = Table([[_p(title, size=9, bold=True, align=TA_CENTER, color=th["text"])]], colWidths=[PAGE_W])
    t.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, -1), th["title_bar"]),
        ("BOX", (0, 0), (-1, -1), 0.8, th["border"]),
        ("TOPPADDING", (0, 0), (-1, -1), 4),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 4),
    ]))
    return t


def _identity(header, b, L, lang, n_seq: int, th) -> Table:
    name = f"{b.get('nom') or ''} {b.get('prenom') or ''}".strip().upper()
    sexe = (b.get("sexe") or "—").upper()
    red = b.get("redoublant") or ("NON" if lang == "fr" else "NO")
    serie = header.get("series_code") or header.get("series") or "—"
    col_w = _col_widths(n_seq)
    n = len(col_w)
    info_sp = _span_parts(n, 4)
    row2 = [
        info_sp[0],
        info_sp[1] + info_sp[2],
        max(1, info_sp[3] // 2),
        info_sp[3] - max(1, info_sp[3] // 2),
    ]
    rows: list[list] = []
    spans: list = []

    if lang == "en":
        rows.append(_row_from_spans([
            (_p(f"{L['name']}: <b>{name}</b>", size=8), info_sp[0]),
            (_p(f"{L['class']}: {header.get('classe') or ''}", bold=True), info_sp[1]),
            (_p(f"Sex: {sexe}", bold=True), info_sp[2]),
            (_p(f"{L['class_enrollment']}: {header.get('effectif') or ''}", bold=True), info_sp[3]),
        ], n))
        _apply_spans(spans, 0, info_sp)
        rows.append(_row_from_spans([
            (_p(f"{L['repeater']}: {red}", bold=True), row2[0]),
            (_p(f"{L['unique_id']}: {b.get('matricule') or ''}", bold=True), row2[1]),
            (_p(f"{L['year']}: {header.get('school_year') or ''}", bold=True), row2[2]),
            (_p(header.get("term") or "", bold=True, align=TA_CENTER), row2[3]),
        ], n))
        _apply_spans(spans, 1, row2)
        spans += [
            ("BACKGROUND", (0, 0), (0, 0), th["identity_label"]),
            ("BACKGROUND", (2, 0), (2, 0), th["identity_label"]),
            ("BACKGROUND", (0, 1), (-1, 1), th["identity_row"]),
        ]
    else:
        rows.append(_row_from_spans([
            (_p(f"{L['name']}: <b>{name}</b>", size=8), info_sp[0]),
            (_p(f"{L['class']}: {header.get('classe') or ''}", bold=True), info_sp[1]),
            (_p(f"SEXE: {sexe}", bold=True), info_sp[2]),
            (_p("", ), info_sp[3]),
        ], n))
        _apply_spans(spans, 0, info_sp)
        rows.append(_row_from_spans([
            (_p(f"{L['class_enrollment']}: {header.get('effectif') or ''}", bold=True), row2[0]),
            (_p(f"{L['repeater']}: {red}", bold=True), row2[1]),
            (_p(f"{L.get('series', 'Serie')}: {serie}", bold=True), row2[2] + row2[3]),
        ], n))
        _apply_spans(spans, 1, [row2[0], row2[1], row2[2] + row2[3]])
        rows.append(_row_from_spans([
            (_p(f"{L['unique_id']}: {b.get('matricule') or ''}", bold=True), row2[0]),
            (_p(header.get("term") or "", bold=True, align=TA_CENTER), row2[1]),
            (_p(f"{L['year']}: {header.get('school_year') or ''}", bold=True), row2[2] + row2[3]),
        ], n))
        _apply_spans(spans, 2, [row2[0], row2[1], row2[2] + row2[3]])
        spans += [
            ("BACKGROUND", (0, 0), (0, 0), th["identity_label"]),
            ("BACKGROUND", (2, 0), (2, 0), th["identity_label"]),
            ("BACKGROUND", (0, 1), (-1, 1), th["identity_row"]),
        ]

    t = Table(rows, colWidths=[w * cm for w in col_w])
    t.setStyle(_grid(*spans))
    return t


def _grades_table(b, L, seq_lbls, lang, th) -> Table:
    n = len(seq_lbls)
    head = [L["subjects"], *seq_lbls, L["average"], L["coefficient"], L["total_marks"],
            L["rank"], L["appreciation"], L["teacher_sign"]]
    rows = [[_p(h, bold=True, align=TA_CENTER, color=th["text"]) for h in head]]
    style_cmds = [
        ("BACKGROUND", (0, 0), (0, 0), th["grade_row"]),
        ("BACKGROUND", (1, 0), (-1, 0), th["grades_header"]),
        ("ALIGN", (1, 0), (-2, -1), "CENTER"),
    ]

    groups: dict[int, list] = {}
    for s in b.get("subjects", []):
        groups.setdefault(s.get("groupe") or 1, []).append(s)

    for g in sorted(groups):
        label = L.get(f"group_{g}", f"GROUP {g}")
        rows.append([_p(label, bold=True, align=TA_CENTER, color=th["text"])] + [""] * (n + 6))
        gi = len(rows) - 1
        style_cmds += [
            ("SPAN", (0, gi), (-1, gi)),
            ("BACKGROUND", (0, gi), (-1, gi), th["group_row"]),
        ]
        for s in groups[g]:
            seqs = s.get("seqs") or []
            seq_cells = [_p(_fmt(seqs[i] if i < len(seqs) else None), align=TA_CENTER) for i in range(n)]
            prof = (s.get("enseignant_nom") or "").upper()
            rows.append([
                _p(s["nom"], bold=True),
                *seq_cells,
                _p(_fmt(s.get("moyenne")), align=TA_CENTER),
                _p(_fmt(s.get("coefficient")), align=TA_CENTER),
                _p(_fmt(s.get("points")), align=TA_CENTER),
                _p(ordinal(s.get("rang_matiere"), lang), align=TA_CENTER),
                _p(s.get("appreciation", ""), align=TA_CENTER),
                _p(prof, align=TA_CENTER, size=5.5),
            ])
            gi = len(rows) - 1
            style_cmds.append(("BACKGROUND", (0, gi), (0, gi), th["grade_row"]))
            style_cmds.append(("BACKGROUND", (1, gi), (-1, gi), th["grade_row"]))

    col_w = _col_widths(n)
    t = Table(rows, colWidths=[w * cm for w in col_w], repeatRows=1)
    t.setStyle(_grid(*style_cmds))
    return t


def _special_table(b, L, seq_lbls, th) -> Table:
    n = len(seq_lbls)
    title = [_p(L["complementary"], bold=True, align=TA_CENTER, color=th["text"])] + [""] * (n + 5)
    head = [L["subjects"], *seq_lbls, L["average"], L["coefficient"], L["total_marks"], L["appreciation"]]
    rows = [title, [_p(h, bold=True, align=TA_CENTER, color=th["text"]) for h in head]]
    for s in b.get("special_subjects", []):
        seqs = s.get("seqs") or []
        seq_cells = [_p(_fmt(seqs[i] if i < len(seqs) else None), align=TA_CENTER) for i in range(n)]
        rows.append([
            _p(s["nom"], bold=True), *seq_cells,
            _p(_fmt(s.get("moyenne")), align=TA_CENTER),
            _p(_fmt(s.get("coefficient")), align=TA_CENTER),
            _p(_fmt(s.get("points")), align=TA_CENTER),
            _p(s.get("appreciation", ""), align=TA_CENTER), "", "",
        ])
    base = _col_widths(n)
    w = base[: n + 5] + [sum(base[n + 5:])]
    t = Table(rows, colWidths=[x * cm for x in w], repeatRows=2)
    t.setStyle(_grid(
        ("SPAN", (0, 0), (-1, 0)),
        ("BACKGROUND", (0, 0), (-1, 0), th["group_row"]),
        ("BACKGROUND", (0, 1), (0, 1), th["grade_row"]),
        ("BACKGROUND", (1, 1), (-1, 1), th["grades_header"]),
    ))
    return t


def _footer(b, data, header, L, lang, n_seq: int, th) -> Table:
    moy = b.get("moyenne_generale")
    appr = b.get("appreciation_generale") or ""
    effectif = header.get("effectif") or data.get("effectif") or ""
    moy_cls = data.get("moyenne_classe")
    decision = b.get("decision") or ""

    col_w = _col_widths(n_seq)
    n_cols = len(col_w)
    pad = lambda *cells: list(cells) + [""] * max(0, n_cols - len(cells))

    if lang == "en":
        rows = [
            pad(
                _p(L["total"], bold=True, align=TA_CENTER),
                _p(_fmt(b.get("total_coefficient")), bold=True, align=TA_CENTER),
                _p(_fmt(b.get("total_points")), bold=True, align=TA_CENTER),
                _p(L["class_average"], bold=True, align=TA_CENTER),
                _p(_fmt(moy_cls), bold=True, align=TA_CENTER),
                _p(L["sanctions"], bold=True, align=TA_CENTER), _p("0", align=TA_CENTER), _p("0", align=TA_CENTER),
            ),
            pad(
                _p(L["term_average"], bold=True), _p(_fmt(moy), bold=True, align=TA_CENTER),
                _p(appr, bold=True, align=TA_CENTER), _p(L["absences"], bold=True, align=TA_CENTER),
                _p("0", align=TA_CENTER), _p("0", align=TA_CENTER),
            ),
            pad(
                _p(L["position"], bold=True), _p(ordinal(b.get("rang_general"), lang), bold=True, align=TA_CENTER),
                _p(L["out_of"], bold=True, align=TA_CENTER), _p(str(effectif), bold=True, align=TA_CENTER),
                _p(L["remark"], bold=True, align=TA_CENTER), _p(decision, bold=True, align=TA_CENTER),
            ),
            pad(_p(L["observation"], bold=True)),
        ]
    else:
        term_lbl = L["annual_average"] if header.get("scope") == "annual" else L["term_average"]
        rows = [
            pad(
                _p(L["total"], bold=True, align=TA_CENTER),
                _p(_fmt(b.get("total_coefficient")), bold=True, align=TA_CENTER),
                _p(_fmt(b.get("total_points")), bold=True, align=TA_CENTER),
                _p(L["class_average"], bold=True, align=TA_CENTER),
                _p(_fmt(moy_cls), bold=True, align=TA_CENTER),
                _p(L["sanctions"], bold=True, align=TA_CENTER), _p("0", align=TA_CENTER), _p("0", align=TA_CENTER),
            ),
            pad(
                _p(term_lbl, bold=True), _p(_fmt(moy), bold=True, align=TA_CENTER),
                _p(appr, bold=True, align=TA_CENTER), _p(L["absences"], bold=True, align=TA_CENTER),
                _p("0", align=TA_CENTER),
            ),
            pad(
                _p(L["position"], bold=True), _p(ordinal(b.get("rang_general"), lang), bold=True, align=TA_CENTER),
                _p(L["class_enrollment"], bold=True, align=TA_CENTER), _p(str(effectif), bold=True, align=TA_CENTER),
                _p(L["remark"], bold=True, align=TA_CENTER), _p(decision, bold=True, align=TA_CENTER),
            ),
            pad(_p(L["observation"], bold=True)),
        ]
    spans = [
        ("SPAN", (0, len(rows) - 1), (-1, len(rows) - 1)),
        ("BOTTOMPADDING", (0, len(rows) - 1), (-1, len(rows) - 1), 14),
    ]

    t = Table(rows, colWidths=[w * cm for w in col_w])
    t.setStyle(_grid(
        ("BACKGROUND", (0, 0), (-1, -1), th["summary"]),
        *spans,
    ))
    return t


def _signatures(header, L, lang, th) -> Table:
    prof = (header.get("prof_principal") or "").upper()
    if lang == "en":
        heads = [L["parents"], L["sdm"], L["principal"], L["date"]]
    else:
        heads = [L["parents"], L.get("principal_col", "PROF PRINCIPAL"), L["principal"], L["date"]]
    sig_cells = ["", _p(prof, bold=True, align=TA_CENTER, size=6) if prof else "", "", ""]
    rows = [
        [_p(h, bold=True, align=TA_CENTER, color=th["text"]) for h in heads],
        sig_cells,
    ]
    t = Table(rows, colWidths=[PAGE_W / 4] * 4, rowHeights=[0.55 * cm, 1.5 * cm])
    t.setStyle(_grid(("BACKGROUND", (0, 0), (-1, -1), th["signatures"])))
    return t


def _next_term(header, L) -> Table:
    note = header.get("next_term")
    if not note:
        return Spacer(1, 0.05 * cm)
    prefix = L["next_term"]
    t = Table([[_p(f"{prefix}: {note}", size=6, bold=True)]], colWidths=[PAGE_W])
    t.setStyle(TableStyle([
        ("TOPPADDING", (0, 0), (-1, -1), 2),
        ("LEFTPADDING", (0, 0), (-1, -1), 0),
    ]))
    return t
