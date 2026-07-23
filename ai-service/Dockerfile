FROM python:3.10

WORKDIR /app

# Install system dependencies required for OpenCV and dlib
RUN apt-get update && apt-get install -y \
    cmake \
    libgl1 \
    libglib2.0-0 \
    && rm -rf /var/lib/apt/lists/*

# Install python packages
COPY requirements.txt .

# CRITICAL FIX: Limit CMake to 1 core so it doesn't run out of memory compiling dlib!
ENV CMAKE_BUILD_PARALLEL_LEVEL=1
# Also restrict pip from caching massive build files
RUN pip install --no-cache-dir -r requirements.txt

# Copy the rest of the application
COPY . .

# Expose the port (Render sets the PORT environment variable)
EXPOSE 8000

# Start the application
CMD uvicorn app:app --host 0.0.0.0 --port ${PORT:-8000}
