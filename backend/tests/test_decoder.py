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

    with pytest.raises(ValueError):
        decode("⠁@")


def test_decode_numbers():
    assert decode("⠼⠁") == "1"
    assert decode("⠼⠃") == "2"
    assert decode("⠼⠉") == "3"
    assert decode("⠼⠙") == "4"
    assert decode("⠼⠑") == "5"
    assert decode("⠼⠋") == "6"
    assert decode("⠼⠛") == "7"
    assert decode("⠼⠓") == "8"
    assert decode("⠼⠊") == "9"
    assert decode("⠼⠚") == "0"
    assert decode("⠼⠁⠃⠉") == "123"


def test_decode_number_sequences():
    assert decode("⠼⠁⠃⠉⠙⠑") == "12345"
    assert decode("⠓⠑⠇⠇⠕ ⠼⠁⠃⠉") == "hello 123"
    assert decode("⠼⠃⠚⠃⠋") == "2026"


def test_decode_punctuation():
    assert decode("⠲") == "."
    assert decode("⠂") == ","
    assert decode("⠦") == "?"
    assert decode("⠖") == "!"
    assert decode("⠄") == "'"
    assert decode("⠤") == "-"
    assert decode("⠒") == ":"
    assert decode("⠲⠂⠦⠖⠄⠤⠒") == ".,?!'-:"


def test_decode_mixed_text():
    assert decode("⠓⠑⠇⠇⠕⠂ ⠺⠕⠗⠇⠙⠖") == "hello, world!"
    assert decode("⠊ ⠓⠁⠧⠑ ⠼⠁⠃⠉ ⠃⠕⠕⠅⠎⠲") == "i have 123 books."
    assert decode("⠼⠃⠚⠃⠋") == "2026"


def test_decode_round_trip_mixed():
    assert decode(encode("hello 123")) == "hello 123"
    assert decode(encode("hello, world!")) == "hello, world!"
    assert decode(encode("i have 123 books.")) == "i have 123 books."
    assert decode(encode("2026")) == "2026"
    assert decode(encode("what's that? 42 - 10: 32!")) == "what's that? 42 - 10: 32!"
