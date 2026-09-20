"""Braille and text character mappings."""

# Standard Unicode Braille mappings for lowercase English alphabet (Grade 1 Braille)
TEXT_TO_BRAILLE = {
    "a": "⠁",
    "b": "⠃",
    "c": "⠉",
    "d": "⠙",
    "e": "⠑",
    "f": "⠋",
    "g": "⠛",
    "h": "⠓",
    "i": "⠊",
    "j": "⠚",
    "k": "⠅",
    "l": "⠇",
    "m": "⠍",
    "n": "⠝",
    "o": "⠕",
    "p": "⠏",
    "q": "⠟",
    "r": "⠗",
    "s": "⠎",
    "t": "⠞",
    "u": "⠥",
    "v": "⠧",
    "w": "⠺",
    "x": "⠭",
    "y": "⠽",
    "z": "⠵",
}

# Reverse mapping for decoding Braille back to text
BRAILLE_TO_TEXT = {braille: char for char, braille in TEXT_TO_BRAILLE.items()}

# Standard Braille number indicator (dots 3-4-5-6)
NUMBER_SIGN = "⠼"

# Standard Braille representation for digits (uses letters a-j following number sign)
DIGIT_TO_BRAILLE = {
    "1": "⠁",
    "2": "⠃",
    "3": "⠉",
    "4": "⠙",
    "5": "⠑",
    "6": "⠋",
    "7": "⠛",
    "8": "⠓",
    "9": "⠊",
    "0": "⠚",
}

# Reverse mapping for decoding Braille digits in number mode
BRAILLE_TO_DIGIT = {braille: digit for digit, braille in DIGIT_TO_BRAILLE.items()}

# Standard Unicode English Braille representations for basic punctuation
PUNCTUATION_TO_BRAILLE = {
    ".": "⠲",
    ",": "⠂",
    "?": "⠦",
    "!": "⠖",
    "'": "⠄",
    "-": "⠤",
    ":": "⠒",
}

# Reverse mapping for decoding Braille punctuation back to text
BRAILLE_TO_PUNCTUATION = {
    braille: punct for punct, braille in PUNCTUATION_TO_BRAILLE.items()
}

# Standard Braille capital indicator (dot 6)
CAPITAL_SIGN = "⠠"
