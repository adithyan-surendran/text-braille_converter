"""Braille and text input validators."""

from app.braille.mappings import BRAILLE_TO_TEXT, TEXT_TO_BRAILLE


def validate_text(text: str) -> bool:
    """Check if all non-space characters in text are supported English letters."""
    return all(char == " " or char.lower() in TEXT_TO_BRAILLE for char in text)


def validate_braille(braille: str) -> bool:
    """Check if all non-space characters are supported Braille symbols."""
    return all(char == " " or char in BRAILLE_TO_TEXT for char in braille)
