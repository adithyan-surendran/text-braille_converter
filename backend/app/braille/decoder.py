"""Braille to text decoder."""

from app.braille.mappings import (
    BRAILLE_TO_DIGIT,
    BRAILLE_TO_PUNCTUATION,
    BRAILLE_TO_TEXT,
    CAPITAL_SIGN,
    NUMBER_SIGN,
)


def decode(braille: str) -> str:
    """Decode Braille into English text (preserving case), numbers, and punctuation.

    Preserves spaces and raises ValueError for unsupported Braille symbols.
    Handles number mode initiated by the Braille number sign and
    capitalization initiated by the Braille capital indicator.
    """
    result = []
    in_number_mode = False
    capitalize_next = False

    for char in braille:
        if char == CAPITAL_SIGN:
            capitalize_next = True
            in_number_mode = False
        elif char == NUMBER_SIGN:
            in_number_mode = True
            capitalize_next = False
        elif char == " ":
            in_number_mode = False
            capitalize_next = False
            result.append(" ")
        elif in_number_mode:
            if char in BRAILLE_TO_DIGIT:
                result.append(BRAILLE_TO_DIGIT[char])
            elif char in BRAILLE_TO_PUNCTUATION:
                in_number_mode = False
                result.append(BRAILLE_TO_PUNCTUATION[char])
            elif char in BRAILLE_TO_TEXT:
                in_number_mode = False
                letter = (
                    BRAILLE_TO_TEXT[char].upper()
                    if capitalize_next
                    else BRAILLE_TO_TEXT[char]
                )
                capitalize_next = False
                result.append(letter)
            else:
                raise ValueError(f"Unsupported Braille symbol: '{char}'")
        else:
            if char in BRAILLE_TO_TEXT:
                letter = (
                    BRAILLE_TO_TEXT[char].upper()
                    if capitalize_next
                    else BRAILLE_TO_TEXT[char]
                )
                capitalize_next = False
                result.append(letter)
            elif char in BRAILLE_TO_PUNCTUATION:
                capitalize_next = False
                result.append(BRAILLE_TO_PUNCTUATION[char])
            else:
                raise ValueError(f"Unsupported Braille symbol: '{char}'")

    return "".join(result)
