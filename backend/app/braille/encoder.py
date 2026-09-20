"""Text to Braille encoder."""

from app.braille.mappings import TEXT_TO_BRAILLE


def encode(text: str) -> str:
    """Encode English text to Braille.

    Converts uppercase characters to lowercase, preserves spaces,
    and raises ValueError for unsupported characters.
    """
    result = []
    for char in text:
        if char == " ":
            result.append(" ")
        else:
            lower_char = char.lower()
            if lower_char in TEXT_TO_BRAILLE:
                result.append(TEXT_TO_BRAILLE[lower_char])
            else:
                raise ValueError(f"Unsupported character: '{char}'")
    return "".join(result)
