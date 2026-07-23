FROM python:3.10-slim

WORKDIR /app

# Install system dependencies required for OpenCV and dlib (used by face_recognition)
RUN apt-get update && apt-get install -y \
    build-essential \
    cmake \
    pkg-config \
    libgl1-mesa-glx \
    libglib2.0-0 \
    libsm6 \
    libxext6 \
    libxrender-dev \
    && rm -rf /var/lib/apt/lists/*

# Install python packages
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy the rest of the application
COPY . .

# Expose the port (Render sets the PORT environment variable)
EXPOSE 8000

# Start the application
CMD uvicorn app:app --host 0.0.0.0 --port ${PORT:-8000}
