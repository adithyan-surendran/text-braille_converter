"""Braille and text input validators."""

from app.braille.mappings import (
    BRAILLE_TO_PUNCTUATION,
    BRAILLE_TO_TEXT,
    CAPITAL_SIGN,
    DIGIT_TO_BRAILLE,
    NUMBER_SIGN,
    PUNCTUATION_TO_BRAILLE,
    TEXT_TO_BRAILLE,
)


def validate_text(text: str) -> bool:
    """Check if all characters in text are supported English letters, digits, punctuation, or spaces."""
    return all(
        char == " "
        or char.lower() in TEXT_TO_BRAILLE
        or char in DIGIT_TO_BRAILLE
        or char in PUNCTUATION_TO_BRAILLE
        for char in text
    )


def validate_braille(braille: str) -> bool:
    """Check if all characters in braille are supported Braille symbols or spaces."""
    return all(
        char == " "
        or char in BRAILLE_TO_TEXT
        or char == NUMBER_SIGN
        or char == CAPITAL_SIGN
        or char in BRAILLE_TO_PUNCTUATION
        for char in braille
    )
