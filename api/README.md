# Eye Tracker API 👁️

Flask API for eye tracking and lazy eye detection using MediaPipe and OpenCV.

## Quick Start

### 1. Activate Virtual Environment
```bash
source venv/bin/activate
```

### 2. Start Server

**Development Mode** (with auto-reload):
```bash
./start-dev.sh
```

**Production Mode** (with Gunicorn):
```bash
./start-prod.sh
```

**Background Mode** (runs in background):
```bash
./start-background.sh
```

### 3. Test the API
```bash
./test-api.sh
```

## API Endpoints

- `GET /` - API info
- `GET /health` - Health check
- `GET /test` - Component test
- `POST /upload` - Upload video for analysis

## Usage

```bash
# Test upload (replace with actual video file)
curl -X POST -F "video=@test_video.webm" http://localhost:5000/upload
```

## Files

- `app.py` - Main Flask application
- `wsgi.py` - WSGI entry point for Gunicorn
- `gunicorn.conf.py` - Gunicorn configuration
- `start-*.sh` - Startup scripts
- `test-api.sh` - API testing script

## Stopping the Server

- **Development**: Press `Ctrl+C`
- **Production**: Press `Ctrl+C`
- **Background**: Run `pkill -f gunicorn`
