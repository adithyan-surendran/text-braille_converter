"""Braille to text decoder."""

from app.braille.mappings import (
    BRAILLE_TO_DIGIT,
    BRAILLE_TO_PUNCTUATION,
    BRAILLE_TO_TEXT,
    NUMBER_SIGN,
)


def decode(braille: str) -> str:
    """Decode Braille into lowercase English text, numbers, and punctuation.

    Preserves spaces and raises ValueError for unsupported Braille symbols.
    Handles number mode initiated by the Braille number sign.
    """
    result = []
    in_number_mode = False

    for char in braille:
        if char == NUMBER_SIGN:
            in_number_mode = True
        elif char == " ":
            in_number_mode = False
            result.append(" ")
        elif in_number_mode:
            if char in BRAILLE_TO_DIGIT:
                result.append(BRAILLE_TO_DIGIT[char])
            elif char in BRAILLE_TO_PUNCTUATION:
                in_number_mode = False
                result.append(BRAILLE_TO_PUNCTUATION[char])
            elif char in BRAILLE_TO_TEXT:
                in_number_mode = False
                result.append(BRAILLE_TO_TEXT[char])
            else:
                raise ValueError(f"Unsupported Braille symbol: '{char}'")
        else:
            if char in BRAILLE_TO_TEXT:
                result.append(BRAILLE_TO_TEXT[char])
            elif char in BRAILLE_TO_PUNCTUATION:
                result.append(BRAILLE_TO_PUNCTUATION[char])
            else:
                raise ValueError(f"Unsupported Braille symbol: '{char}'")

    return "".join(result)
