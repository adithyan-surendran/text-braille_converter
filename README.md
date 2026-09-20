# Text-to-Braille Converter

A full-stack, accessible bidirectional text-to-Braille translation system featuring a React frontend and a FastAPI backend.

---

## Architecture Overview

The system maintains a clean layered architecture with separation of concerns:

```text
React Frontend (Vite + TypeScript + Tailwind CSS)
      │
      │ HTTP (fetch) JSON API
      ▼
FastAPI Backend (REST API + Pydantic v2)
      │
      ▼
Input Validation (validator.py)
      │
      ▼
Braille Engine (encoder.py / decoder.py)
      │
      ▼
Character & Braille Mappings (mappings.py)
```

Directory structure:
```text
Text-Braille_converter/
├── frontend/                 # React frontend application
│   ├── src/
│   │   ├── components/       # Converter, InputPanel, OutputPanel, ModeToggle
│   │   ├── services/         # API client service (fetch)
│   │   ├── types/            # TypeScript API contract definitions
│   │   ├── App.tsx           # Main application shell
│   │   ├── main.tsx          # Application root
│   │   └── index.css         # Tailwind CSS styling
│   └── tests/                # Vitest + Testing Library test suite
├── backend/                  # FastAPI backend application
│   ├── app/
│   │   ├── braille/          # mappings, encoder, decoder, validator
│   │   └── main.py           # FastAPI application and route handlers
│   └── tests/                # Pytest test suite
└── README.md
```

---

## Technology Stack

### Frontend
* **Framework**: React 19 + TypeScript
* **Build Tool**: Vite 8
* **Styling**: Tailwind CSS v4
* **Testing**: Vitest + React Testing Library + jsdom
* **Linting**: oxlint

### Backend
* **Language**: Python 3.10+
* **Framework**: FastAPI
* **Data Validation**: Pydantic v2
* **ASGI Server**: Uvicorn
* **Testing**: Pytest

---

## Implemented Features (Current V2 State)

* **Bidirectional Conversion**:
  * **Text → Braille**: Converts English text to Grade 1 Braille using standard Unicode Braille patterns (`U+2800`–`U+28FF`).
  * **Braille → Text**: Decodes Braille Unicode cells back into English text.
* **Capitalization Support**: Standard English Braille capital indicator (`⠠`, dot 6) prepends capitalized letters.
* **Number Support**: Numeric sequences `0-9` prefixed by the Braille number sign (`⠼`, dots 3-4-5-6).
* **Punctuation Support**:
  * Period (`.`) → `⠲`
  * Comma (`,`) → `⠂`
  * Question Mark (`?`) → `⠦`
  * Exclamation Point (`!`) → `⠖`
  * Apostrophe (`'`) → `⠄`
  * Hyphen (`-`) → `⠤`
  * Colon (`:`) → `⠒`
* **Spaces**: Spaces are preserved in both directions and reset numeric and capital state.
* **Interactive UI**:
  * Mode switcher (`Text → Braille` & `Braille → Text`)
  * Auto-expanding responsive textarea with live character counter
  * High-visibility Braille typography for readable cells
  * One-click **Copy to Clipboard** with visual confirmation
  * **Clear** button resetting inputs, outputs, and errors
  * **Swap** button flipping modes and moving output into input
  * User-friendly error banners on invalid input or server disconnection
  * Keyboard navigable and screen-reader accessible (ARIA labels and roles)

*(Note: Features such as OCR, file uploads, image recognition, hardware Braille displays, and Grade 2 contracted Braille are part of future roadmap phases and are not yet implemented.)*

---

## Getting Started

### 1. Backend Setup

From the project root:

```bash
cd backend
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
```

*(On Windows: `.venv\Scripts\activate`)*

Start the backend server:

```bash
uvicorn app.main:app --reload --host 127.0.0.1 --port 8000
```

The backend will run at `http://127.0.0.1:8000`.

### 2. Frontend Setup

In a new terminal, navigate to `frontend`:

```bash
cd frontend
npm install
```

Start the frontend development server:

```bash
npm run dev
```

The frontend will run at `http://localhost:5173`.

---

## Environment Configuration

The frontend connects to the backend using the `VITE_API_BASE_URL` environment variable.

Create `frontend/.env` (optional, defaults to `http://127.0.0.1:8000`):

```env
VITE_API_BASE_URL=http://127.0.0.1:8000
```

---

## Running Tests

### Backend Tests (Pytest)

```bash
cd backend
.venv/bin/pytest -v
```

Expected: **56 passed**.

### Frontend Tests (Vitest)

```bash
cd frontend
npm test
```

Expected: **18 passed**.

---

## API Endpoints

### 1. Health Check
* **Method**: `GET /api/health`
* **Response**: `{"status": "ok"}`

### 2. Encode Text to Braille
* **Method**: `POST /api/encode`
* **Request**: `{"text": "Hello 123!"}`
* **Response**: `{"input": "Hello 123!", "braille": "⠠⠓⠑⠇⠇⠕ ⠼⠁⠃⠉⠖"}`

### 3. Decode Braille to Text
* **Method**: `POST /api/decode`
* **Request**: `{"braille": "⠠⠓⠑⠇⠇⠕ ⠼⠁⠃⠉⠖"}`
* **Response**: `{"braille": "⠠⠓⠑⠇⠇⠕ ⠼⠁⠃⠉⠖", "text": "Hello 123!"}`

### Swagger Documentation
* Interactive Swagger UI: `http://127.0.0.1:8000/docs`
* OpenAPI Schema: `http://127.0.0.1:8000/openapi.json`
