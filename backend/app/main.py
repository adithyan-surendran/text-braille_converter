from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

from app.braille.decoder import decode
from app.braille.encoder import encode
from app.braille.validator import validate_braille, validate_text

app = FastAPI(
    title="Text-to-Braille Converter API",
    description="A simple and reliable REST API for converting English text to Grade 1 Braille and decoding Braille back to text.",
    version="1.3.0",
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
            detail="Text contains unsupported characters. Supported characters are English letters (a-z, A-Z), digits (0-9), punctuation (. , ? ! ' - :), and spaces.",
        )
    braille_output = encode(payload.text)
    return EncodeResponse(input=payload.text, braille=braille_output)


@app.post("/api/decode", response_model=DecodeResponse, summary="Decode Braille to text")
def decode_braille(payload: DecodeRequest) -> DecodeResponse:
    """Decode Braille symbols back to English text."""
    if not validate_braille(payload.braille):
        raise HTTPException(
            status_code=400,
            detail="Braille contains unsupported symbols. Supported symbols are standard Grade 1 Braille cells, number signs, capital indicators, punctuation, and spaces.",
        )
    text_output = decode(payload.braille)
    return DecodeResponse(braille=payload.braille, text=text_output)
