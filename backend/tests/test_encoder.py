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
    assert encode("HELLO") == "⠓⠑⠇⠇⠕"
    assert encode("AbC") == "⠁⠃⠉"


def test_encode_with_spaces():
    assert encode("hello world") == "⠓⠑⠇⠇⠕ ⠺⠕⠗⠇⠙"


def test_encode_unsupported_characters():
    with pytest.raises(ValueError):
        encode("hello 123")

    with pytest.raises(ValueError):
        encode("hello!")

    with pytest.raises(ValueError):
        encode("¿")
