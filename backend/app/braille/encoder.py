"""Text to Braille encoder."""

from app.braille.mappings import (
    CAPITAL_SIGN,
    DIGIT_TO_BRAILLE,
    NUMBER_SIGN,
    PUNCTUATION_TO_BRAILLE,
    TEXT_TO_BRAILLE,
)


def encode(text: str) -> str:
    """Encode English text to Braille.

    Preserves uppercase characters using the Braille capital indicator,
    preserves spaces, prefixes number sequences with the Braille number sign,
    maps supported punctuation, and raises ValueError for unsupported characters.
    """
    result: list[str] = []
    in_number_mode: bool = False

    for char in text:
        if char in DIGIT_TO_BRAILLE:
            if not in_number_mode:
                result.append(NUMBER_SIGN)
                in_number_mode = True
            result.append(DIGIT_TO_BRAILLE[char])
        else:
            in_number_mode = False
            if char == " ":
                result.append(" ")
            elif char in PUNCTUATION_TO_BRAILLE:
                result.append(PUNCTUATION_TO_BRAILLE[char])
            elif char.isupper() and char.lower() in TEXT_TO_BRAILLE:
                result.append(CAPITAL_SIGN)
                result.append(TEXT_TO_BRAILLE[char.lower()])
            elif char in TEXT_TO_BRAILLE:
                result.append(TEXT_TO_BRAILLE[char])
            else:
                raise ValueError(f"Unsupported character: '{char}'")

    return "".join(result)
