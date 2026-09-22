import html
import io
import os
from pathlib import Path

from reportlab.lib.colors import HexColor
from reportlab.lib.pagesizes import letter
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.platypus import HRFlowable, Paragraph, SimpleDocTemplate, Spacer

FONT_NAME = "DejaVuSans"


def resolve_braille_font_path() -> str:
    """Resolve the path to a Unicode TrueType font that supports Braille Patterns (U+2800..U+28FF)."""
    # 1. Bundled font in backend/app/fonts/DejaVuSans.ttf
    bundled_path = Path(__file__).resolve().parent / "fonts" / "DejaVuSans.ttf"
    if bundled_path.exists():
        return str(bundled_path)

    # 2. Common Linux font paths
    system_candidates = [
        "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf",
        "/usr/share/fonts/dejavu/DejaVuSans.ttf",
        "/usr/share/fonts/TTF/DejaVuSans.ttf",
        "/usr/local/share/fonts/DejaVuSans.ttf",
    ]
    for candidate in system_candidates:
        if os.path.exists(candidate):
            return candidate

    raise FileNotFoundError(
        "Unicode Braille font (DejaVuSans.ttf) not found. "
        "Please ensure the font is installed or placed in backend/app/fonts/."
    )


def ensure_font_registered() -> str:
    """Ensure the Unicode Braille font is registered in ReportLab's font registry."""
    if FONT_NAME not in pdfmetrics.getRegisteredFontNames():
        font_path = resolve_braille_font_path()
        pdfmetrics.registerFont(TTFont(FONT_NAME, font_path))
    return FONT_NAME


def generate_conversion_pdf(input_text: str, braille_text: str) -> bytes:
    """Generate a valid PDF containing the Original Text and Braille Output sections."""
    font = ensure_font_registered()

    buf = io.BytesIO()
    doc = SimpleDocTemplate(
        buf,
        pagesize=letter,
        leftMargin=54,
        rightMargin=54,
        topMargin=54,
        bottomMargin=54,
    )

    styles = getSampleStyleSheet()

    title_style = ParagraphStyle(
        "DocTitle",
        parent=styles["Heading1"],
        fontName=font,
        fontSize=20,
        leading=24,
        textColor=HexColor("#1e293b"),
        spaceAfter=6,
    )

    heading_style = ParagraphStyle(
        "SectionHeading",
        parent=styles["Heading2"],
        fontName=font,
        fontSize=13,
        leading=18,
        textColor=HexColor("#334155"),
        spaceBefore=10,
        spaceAfter=6,
    )

    body_style = ParagraphStyle(
        "BodyContent",
        parent=styles["Normal"],
        fontName=font,
        fontSize=11,
        leading=16,
        textColor=HexColor("#0f172a"),
        wordWrap="CJK",
    )

    braille_style = ParagraphStyle(
        "BrailleContent",
        parent=styles["Normal"],
        fontName=font,
        fontSize=14,
        leading=20,
        textColor=HexColor("#0f172a"),
        wordWrap="CJK",
    )

    escaped_input = html.escape(input_text).replace("\n", "<br/>")
    escaped_braille = html.escape(braille_text).replace("\n", "<br/>")

    story = [
        Paragraph("Text-to-Braille Conversion", title_style),
        HRFlowable(
            width="100%",
            thickness=1,
            color=HexColor("#cbd5e1"),
            spaceBefore=4,
            spaceAfter=14,
        ),
        Paragraph("Original Text", heading_style),
        Paragraph(escaped_input, body_style),
        Spacer(1, 16),
        Paragraph("Braille Output", heading_style),
        Paragraph(escaped_braille, braille_style),
    ]

    doc.build(story)
    return buf.getvalue()
