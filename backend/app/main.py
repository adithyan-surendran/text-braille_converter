import io

from fastapi import FastAPI, File, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import pypdf

from app.braille.decoder import decode
from app.braille.encoder import encode
from app.braille.validator import validate_braille, validate_text

MAX_FILE_SIZE_BYTES = 100 * 1024  # 100 KB limit for uploaded files


def normalize_extracted_text(text: str) -> str:
    """Normalize extracted text line endings and strip UTF-8 BOM."""
    cleaned = text.lstrip("\ufeff")
    return cleaned.replace("\r\n", "\n").replace("\r", "\n").replace("\x0c", "\n")


app = FastAPI(
    title="Text-to-Braille Converter API",
    description="A simple and reliable REST API for converting English text to Grade 1 Braille and decoding Braille back to text.",
    version="1.4.0",
)

origins: list[str] = [
    "http://localhost:5173",
    "http://127.0.0.1:5173",
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


class HealthResponse(BaseModel):
    status: str


class EncodeRequest(BaseModel):
    text: str


class EncodeResponse(BaseModel):
    input: str
    braille: str


class DecodeRequest(BaseModel):
    braille: str


class DecodeResponse(BaseModel):
    braille: str
    text: str


@app.get("/api/health", response_model=HealthResponse, summary="Health Check")
def health_check() -> HealthResponse:
    """Return health status of the API."""
    return HealthResponse(status="ok")


@app.post("/api/encode", response_model=EncodeResponse, summary="Encode text to Braille")
def encode_text(payload: EncodeRequest) -> EncodeResponse:
    """Encode English text to Braille (Grade 1 with numbers, punctuation, and capitalization)."""
    if not validate_text(payload.text):
        raise HTTPException(
            status_code=400,
            detail="Text contains unsupported characters. Supported characters are English letters (a-z, A-Z), digits (0-9), punctuation (. , ? ! ' - :), spaces, and line breaks.",
        )
    braille_output = encode(payload.text)
    return EncodeResponse(input=payload.text, braille=braille_output)


@app.post("/api/decode", response_model=DecodeResponse, summary="Decode Braille to text")
def decode_braille(payload: DecodeRequest) -> DecodeResponse:
    """Decode Braille symbols back to English text."""
    if not validate_braille(payload.braille):
        raise HTTPException(
            status_code=400,
            detail="Braille contains unsupported symbols. Supported symbols are standard Grade 1 Braille cells, number signs, capital indicators, punctuation, spaces, and line breaks.",
        )
    text_output = decode(payload.braille)
    return DecodeResponse(braille=payload.braille, text=text_output)


@app.post(
    "/api/encode-file",
    response_model=EncodeResponse,
    summary="Extract selectable text from PDF and encode to Braille",
)
async def encode_file(file: UploadFile = File(...)) -> EncodeResponse:
    """Extract selectable text from an uploaded PDF and encode it to Braille."""
    filename = file.filename or ""
    if not filename.lower().endswith(".pdf"):
        raise HTTPException(
            status_code=400,
            detail="Unsupported file type. Only .pdf files are supported for file conversion.",
        )

    try:
        content = await file.read()
    except Exception:
        raise HTTPException(
            status_code=400,
            detail="Failed to read uploaded file.",
        )

    if len(content) > MAX_FILE_SIZE_BYTES:
        raise HTTPException(
            status_code=400,
            detail="File size exceeds the 100 KB limit. Please choose a smaller .pdf file.",
        )

    if len(content) == 0:
        raise HTTPException(
            status_code=400,
            detail="Invalid or corrupted PDF file.",
        )

    try:
        reader = pypdf.PdfReader(io.BytesIO(content))
        if len(reader.pages) == 0:
            raise HTTPException(
                status_code=400,
                detail="Could not extract text from this PDF. Scanned/image-only PDFs are not supported yet.",
            )
        extracted_parts = []
        for page in reader.pages:
            page_text = page.extract_text() or ""
            if page_text:
                extracted_parts.append(page_text)
        raw_text = "\n".join(extracted_parts)
    except HTTPException:
        raise
    except Exception:
        raise HTTPException(
            status_code=400,
            detail="Invalid or corrupted PDF file.",
        )

    normalized_text = normalize_extracted_text(raw_text)

    if not normalized_text.strip():
        raise HTTPException(
            status_code=400,
            detail="Could not extract text from this PDF. Scanned/image-only PDFs are not supported yet.",
        )

    if not validate_text(normalized_text):
        raise HTTPException(
            status_code=400,
            detail="Extracted text contains unsupported characters. Supported characters are English letters (a-z, A-Z), digits (0-9), punctuation (. , ? ! ' - :), spaces, and line breaks.",
        )

    braille_output = encode(normalized_text)
    return EncodeResponse(input=normalized_text, braille=braille_output)

