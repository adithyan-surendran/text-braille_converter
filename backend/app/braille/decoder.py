"""Braille to text decoder."""

from app.braille.mappings import BRAILLE_TO_TEXT


def decode(braille: str) -> str:
    """Decode Braille into lowercase English text.

    Preserves spaces and raises ValueError for unsupported Braille symbols.
    """
    result = []
    for char in braille:
        if char == " ":
            result.append(" ")
        elif char in BRAILLE_TO_TEXT:
            result.append(BRAILLE_TO_TEXT[char])
        else:
            raise ValueError(f"Unsupported Braille symbol: '{char}'")
    return "".join(result)
