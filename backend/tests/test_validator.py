from app.braille.validator import validate_braille, validate_text


def test_validate_text_valid():
    assert validate_text("hello") is True
    assert validate_text("Hello World") is True
    assert validate_text("abc xyz") is True


def test_validate_text_invalid():
    assert validate_text("hello 123") is False
    assert validate_text("hello!") is False


def test_validate_braille_valid():
    assert validate_braille("⠁⠃⠉") is True
    assert validate_braille("⠓⠑⠇⠇⠕ ⠺⠕⠗⠇⠙") is True


def test_validate_braille_invalid():
    assert validate_braille("⠁⠃1") is False
    assert validate_braille("hello") is False


def test_validate_spaces_accepted():
    assert validate_text("   ") is True
    assert validate_text("a b c") is True
    assert validate_braille("   ") is True
    assert validate_braille("⠁ ⠃ ⠉") is True
