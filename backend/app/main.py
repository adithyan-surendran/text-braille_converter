from fastapi import FastAPI
from pydantic import BaseModel

app = FastAPI(
    title="Text-to-Braille Converter API",
    version="0.1.0",
)


class HealthResponse(BaseModel):
    status: str


@app.get("/api/health", response_model=HealthResponse)
def health_check() -> HealthResponse:
    return HealthResponse(status="ok")
