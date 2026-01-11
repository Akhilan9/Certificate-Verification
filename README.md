# Certificate Verification Project

This project consists of a React frontend and a FastAPI (Python) backend for certificate verification.

## Prerequisites

1.  **Node.js**: [Download & Install](https://nodejs.org/)
2.  **Python**: [Download & Install](https://www.python.org/)
3.  **Tesseract OCR**: Required for OCR functionality.
    *   An installer is located at `backend/tesseract_installer.exe`.
    *   Please install it and ensure it's added to your system PATH.

## Installation

### 1. Backend Setup

Open a terminal in the `backend` directory:

```bash
cd backend
# Create a virtual environment (optional but recommended)
python -m venv venv
# Activate it:
# Windows: venv\Scripts\activate
# Mac/Linux: source venv/bin/activate

# Install dependencies
pip install -r requirements.txt
```

### 2. Frontend Setup

Open a terminal in the `frontend` directory:

```bash
cd frontend
npm install
```

## Running the Application

### Option A: One-Click Start (Windows)

Simply double-click the `start_app.bat` file in the root directory. This will launch both servers in separate command windows.

### Option B: Manual Start

**Backend:**
```bash
cd backend
uvicorn main:app --reload --port 8001
```

**Frontend:**
```bash
cd frontend
npm run dev
```

## Access

-   **Frontend**: http://localhost:5173 (usually)
-   **Backend API**: http://localhost:8001
-   **API Docs**: http://localhost:8001/docs
