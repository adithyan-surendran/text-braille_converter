import pytest
from fastapi import HTTPException

from app.main import (
    DecodeRequest,
    EncodeRequest,
    decode_braille,
    encode_text,
    health_check,
)


def test_api_health():
    response = health_check()
    assert response.status == "ok"


def test_api_encode_numbers_and_punctuation():
    response = encode_text(EncodeRequest(text="hello 123!"))
    assert response.input == "hello 123!"
    assert response.braille == "⠓⠑⠇⠇⠕ ⠼⠁⠃⠉⠖"


def test_api_decode_numbers_and_punctuation():
    response = decode_braille(DecodeRequest(braille="⠓⠑⠇⠇⠕ ⠼⠁⠃⠉⠖"))
    assert response.braille == "⠓⠑⠇⠇⠕ ⠼⠁⠃⠉⠖"
    assert response.text == "hello 123!"


def test_api_encode_invalid_text():
    with pytest.raises(HTTPException) as exc_info:
        encode_text(EncodeRequest(text="hello @ world"))
    assert exc_info.value.status_code == 400


def test_api_decode_invalid_braille():
    with pytest.raises(HTTPException) as exc_info:
        decode_braille(DecodeRequest(braille="⠁⠃1"))
    assert exc_info.value.status_code == 400
