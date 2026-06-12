"""Génération PDF du bulletin (reportlab) — mise en page identique FR/EN (§11.2)."""
import io

from reportlab.lib import colors
from reportlab.lib.pagesizes import A4
from reportlab.lib.units import cm
from reportlab.platypus import (
    SimpleDocTemplate,
    Paragraph,
    Spacer,
    Table,
    TableStyle,
)
from reportlab.lib.styles import getSampleStyleSheet


def render_bulletin_pdf(data: dict) -> bytes:
    """`data` = sortie de service.build_eleve_bulletin."""
    header = data["header"]
    labels = header["labels"]
    bulletin = data.get("bulletin") or {}

    buf = io.BytesIO()
    doc = SimpleDocTemplate(buf, pagesize=A4, topMargin=1.5 * cm, bottomMargin=1.5 * cm)
    styles = getSampleStyleSheet()
    story = []

    # En-tête
    story.append(Paragraph(f"<b>{header.get('school_name') or ''}</b>", styles["Title"]))
    story.append(Paragraph(labels["report_card"], styles["Heading2"]))
    profile = " – ".join(
        x for x in [header.get("subsystem_code"), header.get("type_code"),
                    header.get("level_code"), header.get("series_code")] if x
    )
    story.append(Paragraph(
        f"{header.get('classe') or ''} | {profile} | {header.get('term')}", styles["Normal"]
    ))
    story.append(Paragraph(
        f"{bulletin.get('nom') or ''} {bulletin.get('prenom') or ''} "
        f"({bulletin.get('matricule') or ''})", styles["Normal"]
    ))
    story.append(Spacer(1, 0.4 * cm))

    # Tableau principal — matières officielles, regroupées par « groupe » si défini
    # (second cycle francophone). Sinon, liste à plat.
    head = [labels["subject"], labels["average"], labels["coefficient"],
            labels["points"], labels["rank"], labels["appreciation"], labels["teacher"]]

    def _srow(s):
        return [s["nom"], _fmt(s["moyenne"]), _fmt(s["coefficient"]), _fmt(s["points"]),
                _fmt(s["rang_matiere"]), s.get("appreciation", ""), str(s.get("enseignant_id") or "")]

    subjects = bulletin.get("subjects", [])
    groups_present = sorted({s["groupe"] for s in subjects if s.get("groupe")})
    if groups_present:
        for g in groups_present:
            story.append(Paragraph(labels.get(f"group_{g}", f"Groupe {g}"), styles["Heading4"]))
            story.append(_styled_table([head] + [_srow(s) for s in subjects if s.get("groupe") == g]))
            story.append(Spacer(1, 0.2 * cm))
        ungrouped = [s for s in subjects if not s.get("groupe")]
        if ungrouped:
            story.append(_styled_table([head] + [_srow(s) for s in ungrouped]))
    else:
        story.append(_styled_table([head] + [_srow(s) for s in subjects]))

    story.append(Spacer(1, 0.2 * cm))
    story.append(Paragraph(
        f"<b>{labels['total_coeff']}:</b> {_fmt(bulletin.get('total_coefficient'))} | "
        f"<b>{labels['total_points']}:</b> {_fmt(bulletin.get('total_points'))}",
        styles["Normal"],
    ))
    story.append(Spacer(1, 0.2 * cm))
    story.append(Paragraph(
        f"<b>{labels['general_average']}:</b> {_fmt(bulletin.get('moyenne_generale'))} | "
        f"<b>{labels['general_rank']}:</b> {_fmt(bulletin.get('rang_general'))} | "
        f"<b>{labels['class_average']}:</b> {_fmt(data.get('moyenne_classe'))}",
        styles["Normal"],
    ))

    # Section matières complémentaires (spéciales) — §11.3
    special = bulletin.get("special_subjects") or []
    if special:
        story.append(Spacer(1, 0.4 * cm))
        story.append(Paragraph(f"<b>{labels['complementary']}</b>", styles["Heading3"]))
        srows = [[labels["subject"], labels["average"], labels["coefficient"], labels["appreciation"]]]
        for s in special:
            srows.append([s["nom"], _fmt(s["moyenne"]), _fmt(s["coefficient"]), s.get("appreciation", "")])
        story.append(_styled_table(srows))

    # Signatures
    story.append(Spacer(1, 1 * cm))
    story.append(_styled_table([[labels["teacher_principal"], labels["head"], labels["parent"]],
                                ["", "", ""]], signatures=True))

    doc.build(story)
    return buf.getvalue()


def _fmt(v) -> str:
    if v is None:
        return "—"
    if isinstance(v, float):
        return f"{v:.2f}".rstrip("0").rstrip(".")
    return str(v)


def _styled_table(rows: list[list], *, signatures: bool = False) -> Table:
    t = Table(rows, repeatRows=1)
    style = [
        ("GRID", (0, 0), (-1, -1), 0.5, colors.grey),
        ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#4f46e5")),
        ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
        ("FONTSIZE", (0, 0), (-1, -1), 8),
    ]
    if signatures:
        style = [("FONTSIZE", (0, 0), (-1, -1), 9), ("TOPPADDING", (0, 1), (-1, 1), 24)]
    t.setStyle(TableStyle(style))
    return t
