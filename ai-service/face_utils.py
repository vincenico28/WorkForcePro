import cv2
import face_recognition
import numpy as np

def extract_face_encoding(image_bytes: bytes) -> list[float]:
    """
    Extracts the face encoding from an image.
    Returns a list of 128 floats representing the face, or None if no face is found.
    """
    # Convert image bytes to numpy array
    nparr = np.frombuffer(image_bytes, np.uint8)
    # Decode image using OpenCV
    img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
    
    if img is None:
        raise ValueError("Could not decode image")
        
    # Convert BGR (OpenCV) to RGB (face_recognition)
    rgb_img = cv2.cvtColor(img, cv2.COLOR_BGR2RGB)
    
    # Find faces and encodings
    face_locations = face_recognition.face_locations(rgb_img)
    if not face_locations:
        return None
        
    # We only take the first face found
    encodings = face_recognition.face_encodings(rgb_img, face_locations)
    if not encodings:
        return None
        
    return encodings[0].tolist()

def compare_faces(known_encoding: list[float], unknown_encoding: list[float], tolerance: float = 0.6) -> bool:
    """
    Compares two face encodings to see if they match.
    """
    if not known_encoding or not unknown_encoding:
        return False
        
    known_arr = np.array(known_encoding)
    unknown_arr = np.array(unknown_encoding)
    
    # Calculate Euclidean distance
    distance = np.linalg.norm(known_arr - unknown_arr)
    return bool(distance <= tolerance)
