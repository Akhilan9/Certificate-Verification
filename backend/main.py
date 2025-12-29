from fastapi import FastAPI, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
from verification_service import verify_certificate

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/")
def read_root():
    return {"message": "Certificate Verifier API is running"}

@app.post("/verify")
async def verify_cert(file: UploadFile = File(...)):
    contents = await file.read()
    # Pass filename to detect PDF
    result = verify_certificate(contents, file.filename)
    return result

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
