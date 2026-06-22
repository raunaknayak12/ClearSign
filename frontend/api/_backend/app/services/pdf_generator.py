"""ClearSign — PDF Report Generator

Produces a clean, minimal analysis report from clause data.
"""

from datetime import datetime

from reportlab.lib import colors
from reportlab.lib.enums import TA_CENTER, TA_RIGHT
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.lib.units import mm
from reportlab.platypus import Flowable, KeepTogether, Paragraph, SimpleDocTemplate, Spacer, Table, TableStyle

# ─── Color palette (matches ClearSign UI) ────────────────────────────────────
TEAL        = colors.HexColor("#1D9E75")
TEAL_LIGHT  = colors.HexColor("#E1F5EE")
TEAL_BORDER = colors.HexColor("#5DCAA5")

AMBER       = colors.HexColor("#854F0B")
AMBER_LIGHT = colors.HexColor("#FAEEDA")
AMBER_BDR   = colors.HexColor("#EF9F27")

RED         = colors.HexColor("#A32D2D")
RED_LIGHT   = colors.HexColor("#FCEBEB")
RED_BDR     = colors.HexColor("#F09595")

GRAY        = colors.HexColor("#5F5E5A")
GRAY_LIGHT  = colors.HexColor("#F1EFE8")
GRAY_BDR    = colors.HexColor("#B4B2A9")

PURPLE      = colors.HexColor("#3C3489")
PURPLE_LT   = colors.HexColor("#EEEDFE")
PURPLE_BDR  = colors.HexColor("#AFA9EC")

BLUE        = colors.HexColor("#2563EB")
BLUE_LIGHT  = colors.HexColor("#DBEAFE")
BLUE_BORDER = colors.HexColor("#93C5FD")

INDIGO      = colors.HexColor("#4F46E5")
INDIGO_LT   = colors.HexColor("#E0E7FF")
INDIGO_BDR  = colors.HexColor("#A5B4FC")

ORANGE      = colors.HexColor("#EA580C")
ORANGE_LT   = colors.HexColor("#FFEDD5")
ORANGE_BDR  = colors.HexColor("#FDBA74")

TEXT_PRI    = colors.HexColor("#1A1A18")
TEXT_SEC    = colors.HexColor("#4A4A47")
TEXT_TER    = colors.HexColor("#888780")
BORDER      = colors.HexColor("#E5E4DF")
BG          = colors.HexColor("#FAFAF8")
WHITE       = colors.white

# ─── Category color map ──────────────────────────────────────────
CATEGORY_COLORS = {
    "payment": {"primary": BLUE, "bg": BLUE_LIGHT, "border": BLUE_BORDER, "label": "Payment / Rent"},
    "termination": {"primary": RED, "bg": RED_LIGHT, "border": RED_BDR, "label": "Termination"},
    "penalty_liability": {"primary": AMBER, "bg": AMBER_LIGHT, "border": AMBER_BDR, "label": "Penalty / Liability"},
    "notice_period": {"primary": PURPLE, "bg": PURPLE_LT, "border": PURPLE_BDR, "label": "Notice Period"},
    "confidentiality": {"primary": TEAL, "bg": TEAL_LIGHT, "border": TEAL_BORDER, "label": "Confidentiality"},
    "jurisdiction": {"primary": INDIGO, "bg": INDIGO_LT, "border": INDIGO_BDR, "label": "Jurisdiction"},
    "non_standard": {"primary": ORANGE, "bg": ORANGE_LT, "border": ORANGE_BDR, "label": "Non-Standard"},
    "standard": {"primary": GRAY, "bg": GRAY_LIGHT, "border": GRAY_BDR, "label": "Standard"},
}


class ThinRule(Flowable):
    """Custom Flowable to draw a horizontal rule with variable color and thickness."""
    def __init__(self, width, thickness=1, color=BORDER):
        super().__init__()
        self.width = width
        self.thickness = thickness
        self.color = color

    def wrap(self, availWidth, availHeight):
        return self.width, self.thickness

    def draw(self):
        self.canv.saveState()
        self.canv.setStrokeColor(self.color)
        self.canv.setLineWidth(self.thickness)
        self.canv.line(0, 0, self.width, 0)
        self.canv.restoreState()


def add_footer(canvas, doc):
    """Canvas callback to add headers and footers to every page."""
    canvas.saveState()
    canvas.setFont('Helvetica', 8)
    canvas.setFillColor(TEXT_TER)
    # Right-aligned page number
    page_num = canvas.getPageNumber()
    canvas.drawRightString(210 * mm - 15 * mm, 10 * mm, f"Page {page_num}")
    # Left-aligned brand note
    canvas.drawString(15 * mm, 10 * mm, "ClearSign Report — Understand Before You Sign.")
    canvas.restoreState()


def build_clause_card(clause, styles, content_width, index):
    """Constructs a structured visual representation of a clause card."""
    card_elements = []

    # 1. Header with title and badge(s)
    title_text = f"<b>{index}. {clause.get('clause_title', 'Untitled Clause')}</b>"

    c_type = clause.get("clause_type", "standard")
    c_colors = CATEGORY_COLORS.get(c_type, CATEGORY_COLORS["standard"])
    badge_label = c_colors["label"]

    badge_style = ParagraphStyle(
        "BadgeText",
        fontName="Helvetica-Bold",
        fontSize=8,
        textColor=c_colors["primary"],
        alignment=TA_CENTER
    )

    badge_t = Table(
        [[Paragraph(badge_label.upper(), badge_style)]],
        colWidths=[35 * mm]
    )
    badge_t.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,-1), c_colors["bg"]),
        ('ALIGN', (0,0), (-1,-1), 'CENTER'),
        ('VALIGN', (0,0), (-1,-1), 'MIDDLE'),
        ('BOTTOMPADDING', (0,0), (-1,-1), 3),
        ('TOPPADDING', (0,0), (-1,-1), 3),
        ('LEFTPADDING', (0,0), (-1,-1), 4),
        ('RIGHTPADDING', (0,0), (-1,-1), 4),
        ('BOX', (0,0), (-1,-1), 0.5, c_colors["border"]),
    ]))

    # Handle risk/non-standard tag
    if clause.get("is_non_standard", False):
        risk_style = ParagraphStyle(
            "RiskBadgeText",
            fontName="Helvetica-Bold",
            fontSize=8,
            textColor=RED,
            alignment=TA_CENTER
        )
        risk_t = Table(
            [[Paragraph("FLAGGED", risk_style)]],
            colWidths=[20 * mm]
        )
        risk_t.setStyle(TableStyle([
            ('BACKGROUND', (0,0), (-1,-1), RED_LIGHT),
            ('ALIGN', (0,0), (-1,-1), 'CENTER'),
            ('VALIGN', (0,0), (-1,-1), 'MIDDLE'),
            ('BOTTOMPADDING', (0,0), (-1,-1), 3),
            ('TOPPADDING', (0,0), (-1,-1), 3),
            ('LEFTPADDING', (0,0), (-1,-1), 4),
            ('RIGHTPADDING', (0,0), (-1,-1), 4),
            ('BOX', (0,0), (-1,-1), 0.5, RED_BDR),
        ]))

        badges_t = Table([[badge_t, Spacer(1, 1), risk_t]], colWidths=[35 * mm, 2 * mm, 20 * mm])
        badges_t.setStyle(TableStyle([
            ('VALIGN', (0,0), (-1,-1), 'MIDDLE'),
            ('LEFTPADDING', (0,0), (-1,-1), 0),
            ('RIGHTPADDING', (0,0), (-1,-1), 0),
            ('TOPPADDING', (0,0), (-1,-1), 0),
            ('BOTTOMPADDING', (0,0), (-1,-1), 0),
        ]))
    else:
        badges_t = badge_t

    header_title_style = ParagraphStyle(
        "HeaderTitle",
        parent=styles["Normal"],
        fontName="Helvetica-Bold",
        fontSize=11,
        textColor=TEXT_PRI,
        leading=14
    )

    header_t = Table(
        [[Paragraph(title_text, header_title_style), badges_t]],
        colWidths=[content_width - 60 * mm, 60 * mm]
    )
    header_t.setStyle(TableStyle([
        ('VALIGN', (0,0), (-1,-1), 'MIDDLE'),
        ('ALIGN', (1,0), (1,0), 'RIGHT'),
        ('LEFTPADDING', (0,0), (-1,-1), 0),
        ('RIGHTPADDING', (0,0), (-1,-1), 0),
        ('TOPPADDING', (0,0), (-1,-1), 0),
        ('BOTTOMPADDING', (0,0), (-1,-1), 0),
    ]))

    card_elements.append(header_t)
    card_elements.append(Spacer(1, 8))

    # 2. Explanation
    explanation_style = ParagraphStyle(
        "Explanation",
        parent=styles["Normal"],
        fontName="Helvetica",
        fontSize=10,
        textColor=TEXT_SEC,
        leading=14
    )
    card_elements.append(Paragraph(f"<b>Explanation:</b> {clause.get('explanation', '')}", explanation_style))
    card_elements.append(Spacer(1, 8))

    # 3. Original verbatim text in a grey callout box
    orig_text = clause.get('original_text', '').strip()
    if orig_text:
        orig_style = ParagraphStyle(
            "OriginalText",
            parent=styles["Normal"],
            fontName="Helvetica-Oblique",
            fontSize=9,
            textColor=TEXT_SEC,
            leading=13
        )
        orig_t = Table(
            [[Paragraph(f'"{orig_text}"', orig_style)]],
            colWidths=[content_width - 8 * mm]
        )
        orig_t.setStyle(TableStyle([
            ('BACKGROUND', (0,0), (-1,-1), GRAY_LIGHT),
            ('BOX', (0,0), (-1,-1), 0.5, BORDER),
            ('TOPPADDING', (0,0), (-1,-1), 6),
            ('BOTTOMPADDING', (0,0), (-1,-1), 6),
            ('LEFTPADDING', (0,0), (-1,-1), 8),
            ('RIGHTPADDING', (0,0), (-1,-1), 8),
        ]))
        card_elements.append(orig_t)
        card_elements.append(Spacer(1, 8))

    # 4. Grounding statement
    grounding = clause.get('grounding_statement', '')
    if grounding:
        grounding_style = ParagraphStyle(
            "Grounding",
            parent=styles["Normal"],
            fontName="Helvetica",
            fontSize=8,
            textColor=TEXT_TER,
            leading=11
        )
        card_elements.append(Paragraph(f"<b>Grounding:</b> {grounding}", grounding_style))

    card_container = Table([[card_elements]], colWidths=[content_width])
    card_container.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,-1), BG),
        ('BOX', (0,0), (-1,-1), 0.75, BORDER),
        ('TOPPADDING', (0,0), (-1,-1), 10),
        ('BOTTOMPADDING', (0,0), (-1,-1), 10),
        ('LEFTPADDING', (0,0), (-1,-1), 12),
        ('RIGHTPADDING', (0,0), (-1,-1), 12),
    ]))

    return KeepTogether([card_container, Spacer(1, 10)])


def generate_report_pdf(data: dict, stream):
    """Generates the full PDF report and writes it to the output stream."""
    # margins 15mm on A4 (210 x 297 mm) -> content_width = 180mm
    left_margin = 15 * mm
    right_margin = 15 * mm
    doc = SimpleDocTemplate(
        stream,
        pagesize=A4,
        leftMargin=left_margin,
        rightMargin=right_margin,
        topMargin=20 * mm,
        bottomMargin=20 * mm
    )

    content_width = A4[0] - left_margin - right_margin
    styles = getSampleStyleSheet()

    if "section_label" not in styles:
        styles.add(ParagraphStyle(
            "section_label",
            parent=styles["Normal"],
            fontName="Helvetica-Bold",
            fontSize=8,
            textColor=TEXT_TER,
            leading=10,
            spaceAfter=6
        ))

    story = []

    # ── App Header ──────────────────────────────────────────────────────────
    title_style = ParagraphStyle(
        "DocTitle",
        parent=styles["Normal"],
        fontName="Helvetica-Bold",
        fontSize=24,
        textColor=TEAL,
        leading=28
    )
    tagline_style = ParagraphStyle(
        "DocTagline",
        parent=styles["Normal"],
        fontName="Helvetica",
        fontSize=10,
        textColor=TEXT_SEC,
        leading=14
    )

    header_table = Table(
        [[Paragraph("ClearSign", title_style), Paragraph("Understand Before You Sign.", tagline_style)]],
        colWidths=[content_width * 0.5, content_width * 0.5]
    )
    header_table.setStyle(TableStyle([
        ('VALIGN', (0,0), (-1,-1), 'BOTTOM'),
        ('ALIGN', (1,0), (1,0), 'RIGHT'),
        ('LEFTPADDING', (0,0), (-1,-1), 0),
        ('RIGHTPADDING', (0,0), (-1,-1), 0),
        ('BOTTOMPADDING', (0,0), (-1,-1), 8),
    ]))
    story.append(header_table)
    story.append(ThinRule(content_width, thickness=2, color=TEAL))
    story.append(Spacer(1, 12))

    # ── Metadata ────────────────────────────────────────────────────────────
    meta_title_style = ParagraphStyle(
        "MetaTitleText",
        parent=styles["Normal"],
        fontName="Helvetica-Bold",
        fontSize=14,
        textColor=TEXT_PRI,
        leading=18
    )
    meta_style = ParagraphStyle(
        "MetaText",
        parent=styles["Normal"],
        fontName="Helvetica",
        fontSize=9,
        textColor=TEXT_SEC,
        leading=13
    )

    doc_type = data.get("document_type", "Document Analysis")
    generated_at_str = datetime.now().strftime("%B %d, %Y at %I:%M %p")

    meta_elements = [
        Paragraph(doc_type.upper(), meta_title_style),
        Spacer(1, 4),
        Paragraph(f"<b>Report Generated:</b> {generated_at_str}", meta_style),
    ]

    total_count = len(data.get("clauses", []))
    flagged_count = sum(1 for c in data.get("clauses", []) if c.get("is_non_standard"))

    stats_style = ParagraphStyle(
        "StatsText",
        parent=styles["Normal"],
        fontName="Helvetica",
        fontSize=9,
        textColor=TEXT_SEC,
        leading=14,
        alignment=TA_RIGHT
    )
    stats_p = Paragraph(
        f"<b>Total Clauses Analyzed:</b> {total_count}<br/>"
        f"<b>Flagged Non-Standard:</b> <font color='{RED.hexval()}'><b>{flagged_count}</b></font>",
        stats_style
    )

    meta_table = Table(
        [[meta_elements, stats_p]],
        colWidths=[content_width * 0.6, content_width * 0.4]
    )
    meta_table.setStyle(TableStyle([
        ('VALIGN', (0,0), (-1,-1), 'TOP'),
        ('LEFTPADDING', (0,0), (-1,-1), 0),
        ('RIGHTPADDING', (0,0), (-1,-1), 0),
        ('BOTTOMPADDING', (0,0), (-1,-1), 8),
    ]))
    story.append(meta_table)
    story.append(Spacer(1, 10))
    story.append(ThinRule(content_width, thickness=0.5, color=BORDER))
    story.append(Spacer(1, 12))

    # ── Legend ───────────────────────────────────────────────────────────────
    story.append(Paragraph("LEGEND", styles["section_label"]))

    row1 = []
    row2 = []
    # Make sure we iterate in a stable order
    ordered_keys = ["payment", "termination", "penalty_liability", "notice_period", "confidentiality", "jurisdiction", "non_standard", "standard"]
    for i, k in enumerate(ordered_keys):
        val = CATEGORY_COLORS[k]
        badge_p = Paragraph(
            f"<font color='{val['primary'].hexval()}'>■</font> {val['label']}",
            ParagraphStyle("LegendItem", fontName="Helvetica", fontSize=8, textColor=TEXT_SEC)
        )
        if i < 4:
            row1.append(badge_p)
        else:
            row2.append(badge_p)

    legend_t = Table([row1, row2], colWidths=[content_width / 4.0] * 4)
    legend_t.setStyle(TableStyle([
        ('VALIGN', (0,0), (-1,-1), 'MIDDLE'),
        ('ALIGN', (0,0), (-1,-1), 'LEFT'),
        ('TOPPADDING', (0,0), (-1,-1), 2),
        ('BOTTOMPADDING', (0,0), (-1,-1), 2),
        ('LEFTPADDING', (0,0), (-1,-1), 0),
        ('RIGHTPADDING', (0,0), (-1,-1), 0),
    ]))

    story.append(legend_t)
    story.append(Spacer(1, 12))
    story.append(ThinRule(content_width, thickness=0.5, color=BORDER))
    story.append(Spacer(1, 12))

    # ── Clause cards ─────────────────────────────────────────────────────────
    story.append(Paragraph("CLAUSES BREAKDOWN", styles["section_label"]))
    story.append(Spacer(1, 4))

    for idx, clause in enumerate(data.get("clauses", []), 1):
        story.append(build_clause_card(clause, styles, content_width, idx))

    # ── Closing note ─────────────────────────────────────────────────────────
    story.append(Spacer(1, 10))
    story.append(ThinRule(content_width, thickness=0.5, color=BORDER))
    story.append(Spacer(1, 8))
    note_style = ParagraphStyle("note", fontName="Helvetica", fontSize=8,
                                textColor=TEXT_TER, leading=13, alignment=TA_CENTER)
    story.append(Paragraph(
        "This report is generated by ClearSign for informational purposes only and does not constitute legal advice. "
        "Always consult a qualified legal professional before signing any agreement.",
        note_style))

    doc.build(story, onFirstPage=add_footer, onLaterPages=add_footer)
