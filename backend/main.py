from fastapi import FastAPI, UploadFile, File, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel
from verification_service import verify_certificate
import time
import sqlite3
import json
import hashlib
import jwt
import os
import uuid
from datetime import datetime, timedelta

# Create uploads directory
os.makedirs("uploads", exist_ok=True)

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.mount("/uploads", StaticFiles(directory="uploads"), name="uploads")

# JWT Configuration
SECRET_KEY = "super_secret_hackathon_key"
ALGORITHM = "HS256"

def create_access_token(data: dict, expires_delta: timedelta = timedelta(hours=24)):
    to_encode = data.copy()
    expire = datetime.utcnow() + expires_delta
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)

# Initialize SQLite Database
def init_db():
    conn = sqlite3.connect("history.db")
    c = conn.cursor()
    c.execute('''CREATE TABLE IF NOT EXISTS verifications
                 (id INTEGER PRIMARY KEY AUTOINCREMENT,
                  filename TEXT,
                  file_path TEXT,
                  status TEXT,
                  platform TEXT,
                  confidence_score INTEGER,
                  method TEXT,
                  timestamp DATETIME DEFAULT CURRENT_TIMESTAMP)''')
    
    # Migration: Add file_path if it doesn't exist (for existing databases)
    try:
        c.execute("SELECT file_path FROM verifications LIMIT 1")
    except sqlite3.OperationalError:
        print("Migrating database: Adding file_path column")
        c.execute("ALTER TABLE verifications ADD COLUMN file_path TEXT")
        
    c.execute('''CREATE TABLE IF NOT EXISTS users
                 (id INTEGER PRIMARY KEY AUTOINCREMENT,
                  username TEXT UNIQUE,
                  password_hash TEXT,
                  created_at DATETIME DEFAULT CURRENT_TIMESTAMP)''')
    conn.commit()
    conn.close()

init_db()

class UserAuth(BaseModel):
    username: str
    password: str

def hash_password(password: str) -> str:
    return hashlib.sha256(password.encode()).hexdigest()

@app.post("/register")
def register_user(user: UserAuth):
    conn = sqlite3.connect("history.db")
    c = conn.cursor()
    try:
        c.execute("INSERT INTO users (username, password_hash) VALUES (?, ?)", (user.username, hash_password(user.password)))
        conn.commit()
    except sqlite3.IntegrityError:
        conn.close()
        raise HTTPException(status_code=400, detail="Username already exists")
    conn.close()
    return {"message": "User created successfully"}

@app.post("/login")
def login_user(user: UserAuth):
    conn = sqlite3.connect("history.db")
    c = conn.cursor()
    c.execute("SELECT id, username FROM users WHERE username = ? AND password_hash = ?", (user.username, hash_password(user.password)))
    row = c.fetchone()
    conn.close()
    if row:
        access_token = create_access_token(data={"sub": row[1]})
        return {"message": "Login successful", "username": row[1], "token": access_token}
    raise HTTPException(status_code=401, detail="Invalid credentials")

# Live stats
_stats = {"total_processed": 0, "genuine": 0, "suspicious": 0, "unverified": 0, "start_time": time.time()}

@app.get("/")
def read_root():
    return {"message": "Certificate Verifier API is running"}

@app.get("/health")
def health_check():
    return {"status": "ok", "uptime_seconds": round(time.time() - _stats["start_time"], 1)}

@app.get("/stats")
def get_stats():
    return _stats

@app.get("/history")
def get_history():
    conn = sqlite3.connect("history.db")
    conn.row_factory = sqlite3.Row
    c = conn.cursor()
    c.execute("SELECT * FROM verifications ORDER BY timestamp DESC LIMIT 100")
    rows = c.fetchall()
    conn.close()
    return [dict(ix) for ix in rows]

@app.post("/verify")
async def verify_cert(file: UploadFile = File(...)):
    contents = await file.read()
    
    # Save file locally
    file_ext = os.path.splitext(file.filename)[1]
    safe_filename = f"{uuid.uuid4().hex}{file_ext}"
    file_path = os.path.join("uploads", safe_filename)
    with open(file_path, "wb") as f:
        f.write(contents)
        
    result = verify_certificate(contents, file.filename)
    _stats["total_processed"] += 1
    status = result.get("status", "")
    if status in ["Genuine", "Likely Genuine", "Found", "Verified"]:
        _stats["genuine"] += 1
    elif status in ["TAMPERED", "SUSPICIOUS"]:
        _stats["suspicious"] += 1
    else:
        _stats["unverified"] += 1

    # Save to history DB
    try:
        conn = sqlite3.connect("history.db")
        c = conn.cursor()
        c.execute("INSERT INTO verifications (filename, file_path, status, platform, confidence_score, method) VALUES (?, ?, ?, ?, ?, ?)",
                  (file.filename, f"/uploads/{safe_filename}", status, result.get("platform", "Unknown"), result.get("confidence_score", 0), result.get("method", "Standard Analysis")))
        conn.commit()
        conn.close()
    except Exception as e:
        print(f"DB Error: {e}")

    return result

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
