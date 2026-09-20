"""Text to Braille encoder."""

from app.braille.mappings import (
    DIGIT_TO_BRAILLE,
    NUMBER_SIGN,
    PUNCTUATION_TO_BRAILLE,
    TEXT_TO_BRAILLE,
)


def encode(text: str) -> str:
    """Encode English text to Braille.

    Converts uppercase characters to lowercase, preserves spaces,
    prefixes number sequences with the Braille number sign,
    maps supported punctuation, and raises ValueError for unsupported characters.
    """
    result = []
    in_number_mode = False

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
            else:
                lower_char = char.lower()
                if lower_char in TEXT_TO_BRAILLE:
                    result.append(TEXT_TO_BRAILLE[lower_char])
                else:
                    raise ValueError(f"Unsupported character: '{char}'")

    return "".join(result)
