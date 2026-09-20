import pytest

from app.braille.decoder import decode
from app.braille.encoder import encode


def test_decode_single_characters():
    assert decode("⠁") == "a"
    assert decode("⠃") == "b"
    assert decode("⠉") == "c"


def test_decode_words():
    assert decode("⠁⠃⠉") == "abc"
    assert decode("⠓⠑⠇⠇⠕") == "hello"


def test_decode_with_spaces():
    assert decode("⠓⠑⠇⠇⠕ ⠺⠕⠗⠇⠙") == "hello world"


def test_decode_round_trip():
    assert decode(encode("hello world")) == "hello world"


def test_decode_unsupported_symbols():
    with pytest.raises(ValueError):
        decode("⠁⠃1")

    with pytest.raises(ValueError):
        decode("hello")
