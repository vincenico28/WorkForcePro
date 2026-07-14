from fastapi import FastAPI, File, UploadFile, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import face_utils
import json

app = FastAPI(title="Smart Workforce AI Service")

# Allow requests from the React frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], # In production, restrict to frontend URL
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/")
def read_root():
    return {"status": "AI Service is running"}

@app.post("/api/register_face")
async def register_face(file: UploadFile = File(...)):
    """
    Receives an image and returns its face encoding.
    """
    contents = await file.read()
    try:
        encoding = face_utils.extract_face_encoding(contents)
        if encoding is None:
            raise HTTPException(status_code=400, detail="No face detected in the image")
        return {"encoding": encoding}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error processing image: {str(e)}")

@app.post("/api/verify_face")
async def verify_face(known_encoding: str, file: UploadFile = File(...)):
    """
    Receives an image and a known encoding string (JSON list), and compares them.
    Note: known_encoding is passed as a string because of multipart/form-data.
    """
    try:
        known_enc_list = json.loads(known_encoding)
    except:
        raise HTTPException(status_code=400, detail="Invalid known_encoding format")

    contents = await file.read()
    try:
        unknown_encoding = face_utils.extract_face_encoding(contents)
        if unknown_encoding is None:
            raise HTTPException(status_code=400, detail="No face detected in the image")
            
        is_match = face_utils.compare_faces(known_enc_list, unknown_encoding)
        return {"match": is_match, "confidence": "high" if is_match else "low"} # Simplification
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error processing image: {str(e)}")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
