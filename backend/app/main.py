from fastapi import FastAPI, HTTPException
from pydantic import BaseModel

from app.braille.decoder import decode
from app.braille.encoder import encode
from app.braille.validator import validate_braille, validate_text

app = FastAPI(
    title="Text-to-Braille Converter API",
    version="0.1.0",
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


@app.get("/api/health", response_model=HealthResponse)
def health_check() -> HealthResponse:
    return HealthResponse(status="ok")


@app.post("/api/encode", response_model=EncodeResponse)
def encode_text(payload: EncodeRequest) -> EncodeResponse:
    if not validate_text(payload.text):
        raise HTTPException(
            status_code=400,
            detail="Text contains unsupported characters. Only English letters, numbers, punctuation, and spaces are supported.",
        )
    braille_output = encode(payload.text)
    return EncodeResponse(input=payload.text, braille=braille_output)


@app.post("/api/decode", response_model=DecodeResponse)
def decode_braille(payload: DecodeRequest) -> DecodeResponse:
    if not validate_braille(payload.braille):
        raise HTTPException(
            status_code=400,
            detail="Braille contains unsupported symbols. Only standard alphabet Braille symbols, numbers, punctuation, and spaces are supported.",
        )
    text_output = decode(payload.braille)
    return DecodeResponse(braille=payload.braille, text=text_output)
