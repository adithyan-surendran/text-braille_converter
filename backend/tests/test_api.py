import json
import pytest
from fastapi import HTTPException
from pydantic import ValidationError

from app.main import (
    DecodeRequest,
    EncodeRequest,
    app,
    decode_braille,
    encode_file,
    encode_text,
    health_check,
)


async def call_asgi(
    method: str,
    path: str,
    data: dict | None = None,
    headers: dict[str, str] | None = None,
    raw_body: bytes | None = None,
) -> tuple[int, dict, dict[str, str]]:
    """Helper to dispatch ASGI requests directly to the FastAPI app without extra dependencies."""
    headers_list: list[tuple[bytes, bytes]] = []
    if headers:
        for k, v in headers.items():
            headers_list.append((k.lower().encode(), v.encode()))

    if raw_body is not None:
        body_bytes = raw_body
    else:
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


def test_api_encode_and_decode_multiline():
    text = "Line 1: Hello\nLine 2: 123!\n\nLine 4"
    enc_res = encode_text(EncodeRequest(text=text))
    assert enc_res.input == text
    assert "\n" in enc_res.braille
    dec_res = decode_braille(DecodeRequest(braille=enc_res.braille))
    assert dec_res.text == text


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


# --- V4.7 POST /api/encode-file Tests ---


def make_multipart_body(
    filename: str, file_bytes: bytes, content_type: str = "application/pdf"
) -> tuple[bytes, dict[str, str]]:
    """Construct a multipart/form-data payload with a boundary."""
    boundary = "----WebKitFormBoundaryV47TestingBoundary"
    body = (
        f"--{boundary}\r\n"
        f'Content-Disposition: form-data; name="file"; filename="{filename}"\r\n'
        f"Content-Type: {content_type}\r\n\r\n"
    ).encode() + file_bytes + f"\r\n--{boundary}--\r\n".encode()
    headers = {"Content-Type": f"multipart/form-data; boundary={boundary}"}
    return body, headers


def create_test_pdf(text: str) -> bytes:
    """Generate a minimal valid PDF containing selectable text."""
    escaped_text = text.replace("\\", "\\\\").replace("(", "\\(").replace(")", "\\)")
    stream_content = f"BT\n/F1 24 Tf\n100 700 Td\n({escaped_text}) Tj\nET\n".encode()
    stream_len = len(stream_content)
    return (
        b"%PDF-1.4\n"
        b"1 0 obj <</Type /Catalog /Pages 2 0 R>> endobj\n"
        b"2 0 obj <</Type /Pages /Kids [3 0 R] /Count 1>> endobj\n"
        b"3 0 obj <</Type /Page /Parent 2 0 R /Resources <</Font <</F1 4 0 R>>>> /MediaBox [0 0 612 792] /Contents 5 0 R>> endobj\n"
        b"4 0 obj <</Type /Font /Subtype /Type1 /BaseFont /Helvetica>> endobj\n"
        b"5 0 obj <</Length " + str(stream_len).encode() + b">> stream\n"
        + stream_content
        + b"endstream\nendobj\n"
        b"xref\n0 6\n0000000000 65535 f \n"
        b"trailer <</Size 6 /Root 1 0 R>>\nstartxref\n999\n%%EOF\n"
    )


def create_blank_pdf() -> bytes:
    """Generate a valid PDF with a blank page and no text (simulates scanned/image-only)."""
    import io
    from pypdf import PdfWriter

    writer = PdfWriter()
    writer.add_blank_page(width=100, height=100)
    buf = io.BytesIO()
    writer.write(buf)
    return buf.getvalue()


@pytest.mark.anyio
async def test_contract_encode_file_valid_pdf():
    pdf_bytes = create_test_pdf("Hello 123!")
    body, headers = make_multipart_body("sample.pdf", pdf_bytes)
    status, data, _ = await call_asgi("POST", "/api/encode-file", headers=headers, raw_body=body)

    assert status == 200
    assert data["input"] == "Hello 123!"
    assert data["braille"] == "⠠⠓⠑⠇⠇⠕ ⠼⠁⠃⠉⠖"


@pytest.mark.anyio
async def test_contract_encode_file_capitals_and_punctuation():
    pdf_bytes = create_test_pdf("Braille Test: Year 2026.")
    body, headers = make_multipart_body("test.pdf", pdf_bytes)
    status, data, _ = await call_asgi("POST", "/api/encode-file", headers=headers, raw_body=body)

    assert status == 200
    assert data["input"] == "Braille Test: Year 2026."
    assert "⠠⠃⠗⠁⠊⠇⠇⠑" in data["braille"]
    assert "⠼" in data["braille"]


@pytest.mark.anyio
async def test_contract_encode_file_unsupported_file_extension():
    txt_bytes = b"Hello world"
    body, headers = make_multipart_body("document.txt", txt_bytes, content_type="text/plain")
    status, data, _ = await call_asgi("POST", "/api/encode-file", headers=headers, raw_body=body)

    assert status == 400
    assert "detail" in data
    assert "unsupported file type" in data["detail"].lower()


@pytest.mark.anyio
async def test_contract_encode_file_exceeds_size_limit():
    # 101 KB dummy payload
    oversized_bytes = b"A" * (101 * 1024)
    body, headers = make_multipart_body("large.pdf", oversized_bytes)
    status, data, _ = await call_asgi("POST", "/api/encode-file", headers=headers, raw_body=body)

    assert status == 400
    assert "detail" in data
    assert "100 kb" in data["detail"].lower()


@pytest.mark.anyio
async def test_contract_encode_file_corrupted_pdf():
    corrupt_bytes = b"%PDF-1.4 completely invalid corrupt binary data that ends abruptly"
    body, headers = make_multipart_body("corrupt.pdf", corrupt_bytes)
    status, data, _ = await call_asgi("POST", "/api/encode-file", headers=headers, raw_body=body)

    assert status == 400
    assert "detail" in data
    assert "corrupted" in data["detail"].lower()


@pytest.mark.anyio
async def test_contract_encode_file_empty_bytes():
    body, headers = make_multipart_body("empty.pdf", b"")
    status, data, _ = await call_asgi("POST", "/api/encode-file", headers=headers, raw_body=body)

    assert status == 400
    assert "detail" in data
    assert "corrupted" in data["detail"].lower()


@pytest.mark.anyio
async def test_contract_encode_file_scanned_or_no_text():
    blank_pdf = create_blank_pdf()
    body, headers = make_multipart_body("scanned.pdf", blank_pdf)
    status, data, _ = await call_asgi("POST", "/api/encode-file", headers=headers, raw_body=body)

    assert status == 400
    assert "detail" in data
    assert "scanned/image-only" in data["detail"].lower()


@pytest.mark.anyio
async def test_contract_encode_file_unsupported_characters():
    pdf_bytes = create_test_pdf("Hello @ World #1")
    body, headers = make_multipart_body("special.pdf", pdf_bytes)
    status, data, _ = await call_asgi("POST", "/api/encode-file", headers=headers, raw_body=body)

    assert status == 400
    assert "detail" in data
    assert "unsupported characters" in data["detail"].lower()


@pytest.mark.anyio
async def test_unit_encode_file_direct():
    import io
    from fastapi import UploadFile

    pdf_bytes = create_test_pdf("Direct Unit Test")
    upload_file = UploadFile(filename="unit.pdf", file=io.BytesIO(pdf_bytes))
    response = await encode_file(upload_file)
    assert response.input == "Direct Unit Test"
    assert "⠠⠙" in response.braille


