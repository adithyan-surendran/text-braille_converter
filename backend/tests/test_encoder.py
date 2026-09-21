import pytest

from app.braille.encoder import encode


def test_encode_single_characters():
    assert encode("a") == "⠁"
    assert encode("b") == "⠃"
    assert encode("c") == "⠉"


def test_encode_words():
    assert encode("abc") == "⠁⠃⠉"
    assert encode("hello") == "⠓⠑⠇⠇⠕"


def test_encode_uppercase():
    assert encode("HELLO") == "⠠⠓⠠⠑⠠⠇⠠⠇⠠⠕"
    assert encode("AbC") == "⠠⠁⠃⠠⠉"


def test_encode_with_spaces():
    assert encode("hello world") == "⠓⠑⠇⠇⠕ ⠺⠕⠗⠇⠙"


def test_encode_unsupported_characters():
    with pytest.raises(ValueError):
        encode("hello @")

    with pytest.raises(ValueError):
        encode("hello #")

    with pytest.raises(ValueError):
        encode("¿")


def test_encode_numbers():
    assert encode("1") == "⠼⠁"
    assert encode("2") == "⠼⠃"
    assert encode("3") == "⠼⠉"
    assert encode("4") == "⠼⠙"
    assert encode("5") == "⠼⠑"
    assert encode("6") == "⠼⠋"
    assert encode("7") == "⠼⠛"
    assert encode("8") == "⠼⠓"
    assert encode("9") == "⠼⠊"
    assert encode("0") == "⠼⠚"
    assert encode("123") == "⠼⠁⠃⠉"


def test_encode_number_sequences():
    assert encode("12345") == "⠼⠁⠃⠉⠙⠑"
    assert encode("hello 123") == "⠓⠑⠇⠇⠕ ⠼⠁⠃⠉"
    assert encode("2026") == "⠼⠃⠚⠃⠋"
    assert encode("123a") == "⠼⠁⠃⠉⠁"
    assert encode("123 456") == "⠼⠁⠃⠉ ⠼⠙⠑⠋"


def test_encode_punctuation():
    assert encode(".") == "⠲"
    assert encode(",") == "⠂"
    assert encode("?") == "⠦"
    assert encode("!") == "⠖"
    assert encode("'") == "⠄"
    assert encode("-") == "⠤"
    assert encode(":") == "⠒"
    assert encode(".,?!'-:") == "⠲⠂⠦⠖⠄⠤⠒"


def test_encode_mixed_text():
    assert encode("hello, world!") == "⠓⠑⠇⠇⠕⠂ ⠺⠕⠗⠇⠙⠖"
    assert encode("I have 123 books.") == "⠠⠊ ⠓⠁⠧⠑ ⠼⠁⠃⠉ ⠃⠕⠕⠅⠎⠲"
    assert encode("2026") == "⠼⠃⠚⠃⠋"


def test_encode_individual_uppercase_letters():
    assert encode("A") == "⠠⠁"
    assert encode("B") == "⠠⠃"
    assert encode("Z") == "⠠⠵"


def test_encode_capitalized_words():
    assert encode("Hello") == "⠠⠓⠑⠇⠇⠕"
    assert encode("World") == "⠠⠺⠕⠗⠇⠙"
    assert encode("Adithyan") == "⠠⠁⠙⠊⠞⠓⠽⠁⠝"


def test_encode_mixed_case():
    assert encode("Hello World") == "⠠⠓⠑⠇⠇⠕ ⠠⠺⠕⠗⠇⠙"
    assert encode("Python") == "⠠⠏⠽⠞⠓⠕⠝"
    assert encode("Text-to-Braille") == "⠠⠞⠑⠭⠞⠤⠞⠕⠤⠠⠃⠗⠁⠊⠇⠇⠑"


def test_encode_numbers_with_capitals():
    assert encode("Year 2026") == "⠠⠽⠑⠁⠗ ⠼⠃⠚⠃⠋"
    assert encode("ABC 123") == "⠠⠁⠠⠃⠠⠉ ⠼⠁⠃⠉"


def test_encode_punctuation_with_capitals():
    assert encode("Hello!") == "⠠⠓⠑⠇⠇⠕⠖"
    assert encode("What?") == "⠠⠺⠓⠁⠞⠦"
    assert encode("Hello, World!") == "⠠⠓⠑⠇⠇⠕⠂ ⠠⠺⠕⠗⠇⠙⠖"


def test_encode_with_newlines():
    assert encode("hello\nworld") == "⠓⠑⠇⠇⠕\n⠺⠕⠗⠇⠙"
    assert encode("Hello\nWorld\n") == "⠠⠓⠑⠇⠇⠕\n⠠⠺⠕⠗⠇⠙\n"
    assert encode("123\n456") == "⠼⠁⠃⠉\n⠼⠙⠑⠋"
    assert encode("Line 1\n\nLine 2") == "⠠⠇⠊⠝⠑ ⠼⠁\n\n⠠⠇⠊⠝⠑ ⠼⠃"
