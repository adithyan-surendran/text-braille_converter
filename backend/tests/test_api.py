import json
import pytest
from fastapi import HTTPException
from pydantic import ValidationError

from app.main import (
    DecodeRequest,
    EncodeRequest,
    app,
    decode_braille,
    encode_text,
    health_check,
)


async def call_asgi(
    method: str,
    path: str,
    data: dict | None = None,
    headers: dict[str, str] | None = None,
) -> tuple[int, dict, dict[str, str]]:
    """Helper to dispatch ASGI requests directly to the FastAPI app without extra dependencies."""
    headers_list: list[tuple[bytes, bytes]] = []
    if headers:
        for k, v in headers.items():
            headers_list.append((k.lower().encode(), v.encode()))

    body_bytes = json.dumps(data).encode() if data is not None else b""
    if data is not None and not any(h[0] == b"content-type" for h in headers_list):
        headers_list.append((b"content-type", b"application/json"))

    scope = {
        "type": "http",
        "asgi": {"version": "3.0"},
        "http_version": "1.1",
        "method": method,
        "path": path,
        "raw_path": path.encode(),
        "query_string": b"",
        "headers": headers_list,
    }

    response_started: dict = {}
    response_body: list[bytes] = []

    async def receive():
        return {"type": "http.request", "body": body_bytes, "more_body": False}

    async def send(message):
        if message["type"] == "http.response.start":
            response_started.update(message)
        elif message["type"] == "http.response.body":
            response_body.append(message.get("body", b""))

    await app(scope, receive, send)

    resp_headers = {
        k.decode(): v.decode() for k, v in response_started.get("headers", [])
    }
    resp_status = response_started.get("status", 500)
    raw_body = b"".join(response_body).decode()
    try:
        resp_data = json.loads(raw_body) if raw_body else {}
    except Exception:
        resp_data = raw_body
    return resp_status, resp_data, resp_headers


# --- Existing Unit-Level Handler Tests ---


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


def test_api_encode_capitals():
    response = encode_text(EncodeRequest(text="Hello World!"))
    assert response.input == "Hello World!"
    assert response.braille == "⠠⠓⠑⠇⠇⠕ ⠠⠺⠕⠗⠇⠙⠖"


def test_api_decode_capitals():
    response = decode_braille(DecodeRequest(braille="⠠⠓⠑⠇⠇⠕ ⠠⠺⠕⠗⠇⠙⠖"))
    assert response.braille == "⠠⠓⠑⠇⠇⠕ ⠠⠺⠕⠗⠇⠙⠖"
    assert response.text == "Hello World!"


def test_api_round_trip_numbers_and_capitals():
    encode_res = encode_text(EncodeRequest(text="Year 2026"))
    decode_res = decode_braille(DecodeRequest(braille=encode_res.braille))
    assert decode_res.text == "Year 2026"


def test_api_encode_invalid_text():
    with pytest.raises(HTTPException) as exc_info:
        encode_text(EncodeRequest(text="hello @ world"))
    assert exc_info.value.status_code == 400


def test_api_decode_invalid_braille():
    with pytest.raises(HTTPException) as exc_info:
        decode_braille(DecodeRequest(braille="⠁⠃1"))
    assert exc_info.value.status_code == 400


# --- V1.3 HTTP API Contract Tests ---


@pytest.mark.anyio
async def test_contract_get_health():
    status, body, _ = await call_asgi("GET", "/api/health")
    assert status == 200
    assert body == {"status": "ok"}


@pytest.mark.anyio
async def test_contract_post_encode():
    status, body, _ = await call_asgi("POST", "/api/encode", {"text": "Hello 123!"})
    assert status == 200
    assert set(body.keys()) == {"input", "braille"}
    assert body["input"] == "Hello 123!"
    assert body["braille"] == "⠠⠓⠑⠇⠇⠕ ⠼⠁⠃⠉⠖"


@pytest.mark.anyio
async def test_contract_post_decode():
    status, body, _ = await call_asgi(
        "POST", "/api/decode", {"braille": "⠠⠓⠑⠇⠇⠕ ⠼⠁⠃⠉⠖"}
    )
    assert status == 200
    assert set(body.keys()) == {"braille", "text"}
    assert body["braille"] == "⠠⠓⠑⠇⠇⠕ ⠼⠁⠃⠉⠖"
    assert body["text"] == "Hello 123!"


@pytest.mark.anyio
async def test_contract_encode_invalid_character():
    status, body, _ = await call_asgi(
        "POST", "/api/encode", {"text": "hello @ world"}
    )
    assert status == 400
    assert "detail" in body
    assert "unsupported characters" in body["detail"].lower()


@pytest.mark.anyio
async def test_contract_decode_invalid_symbol():
    status, body, _ = await call_asgi("POST", "/api/decode", {"braille": "⠁⠃1"})
    assert status == 400
    assert "detail" in body
    assert "unsupported symbols" in body["detail"].lower()


@pytest.mark.anyio
async def test_contract_encode_missing_text_field():
    status, body, _ = await call_asgi("POST", "/api/encode", {})
    assert status == 422
    assert "detail" in body


@pytest.mark.anyio
async def test_contract_decode_missing_braille_field():
    status, body, _ = await call_asgi("POST", "/api/decode", {})
    assert status == 422
    assert "detail" in body


@pytest.mark.anyio
async def test_contract_empty_input_handling():
    # Empty text encode
    status_enc, body_enc, _ = await call_asgi("POST", "/api/encode", {"text": ""})
    assert status_enc == 200
    assert body_enc == {"input": "", "braille": ""}

    # Empty braille decode
    status_dec, body_dec, _ = await call_asgi("POST", "/api/decode", {"braille": ""})
    assert status_dec == 200
    assert body_dec == {"braille": "", "text": ""}


@pytest.mark.anyio
async def test_contract_cors_headers():
    # Preflight OPTIONS request from localhost:5173
    status, _, headers = await call_asgi(
        "OPTIONS",
        "/api/encode",
        headers={
            "Origin": "http://localhost:5173",
            "Access-Control-Request-Method": "POST",
            "Access-Control-Request-Headers": "content-type",
        },
    )
    assert status == 200
    assert headers.get("access-control-allow-origin") == "http://localhost:5173"

    # Actual request with Origin
    status, _, headers = await call_asgi(
        "GET",
        "/api/health",
        headers={"Origin": "http://127.0.0.1:5173"},
    )
    assert status == 200
    assert headers.get("access-control-allow-origin") == "http://127.0.0.1:5173"
