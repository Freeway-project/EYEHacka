# app.py - AWS EC2 Flask API with Real MediaPipe Analysis
import os
import cv2
import json
import numpy as np
import mediapipe as mp
from collections import deque
from flask import Flask, request, jsonify
from flask_cors import CORS
import tempfile
import time
import logging

# ================= CONFIGURATION FROM YOUR SOURCE =================
MOVE_PX_MIN = 30            # eye must move ≥ this to call it "tracking"
RATIO_THRESH = 0.30         # lazy‑eye ratio threshold (≤ → flag)
HIST_FRAMES = 60            # frames stored per sweep

# Flask configuration
MAX_FILE_SIZE = 100 * 1024 * 1024  # 100MB
ALLOWED_EXTENSIONS = {'webm', 'mp4', 'avi', 'mov'}

# --- Haar cascades for leukocoria detection ---
FACE_CASCADE = cv2.CascadeClassifier(
    cv2.data.haarcascades + "haarcascade_frontalface_default.xml"
)
EYE_CASCADE = cv2.CascadeClassifier(
    cv2.data.haarcascades + "haarcascade_eye.xml"
)

# ================= FLASK APP SETUP =================
app = Flask(__name__)
app.config['MAX_CONTENT_LENGTH'] = MAX_FILE_SIZE

# CORS configuration for cross-origin requests
CORS(app, origins=[
    "http://localhost:3000",          # Local development
    "https://*.vercel.app",           # Vercel frontend
    "https://*.amazonaws.com",        # AWS domains
    "*"                               # Allow all for demo
])

# Logging setup
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

print("🚀 AWS EC2 Eye Tracker API with Real MediaPipe Analysis")

# ================= YOUR ORIGINAL ALGORITHM =================
def detect_lazy_eye(hist, move_px=MOVE_PX_MIN, ratio=RATIO_THRESH):
    """
    Your original lazy eye detection algorithm
    """
    if len(hist) < 15: 
        return False, 0.0, 0.0
    
    l = np.array([p[0] for p in hist], dtype=float)
    r = np.array([p[1] for p in hist], dtype=float)
    disp_l = np.linalg.norm(l[-1] - l[0])
    disp_r = np.linalg.norm(r[-1] - r[0])
    fast, slow = max(disp_l, disp_r), min(disp_l, disp_r)
    
    is_lazy = fast > move_px and slow < fast * ratio
    return is_lazy, disp_l, disp_r

def analyze_video_with_mediapipe(video_path):
    """
    Real video analysis using your MediaPipe algorithm
    """
    try:
        logger.info(f"📹 Starting MediaPipe analysis on: {video_path}")
        
        # MediaPipe setup (same as your code)
        mesh = mp.solutions.face_mesh.FaceMesh(
            refine_landmarks=True, 
            max_num_faces=1,
            min_detection_confidence=0.5,
            min_tracking_confidence=0.5
        )
        LEFT_IRIS, RIGHT_IRIS = 468, 473
        
        # Open video
        cap = cv2.VideoCapture(video_path)
        if not cap.isOpened():
            raise Exception("Could not open video file")
        
        # Get video properties
        fps = cap.get(cv2.CAP_PROP_FPS) or 30.0
        frame_count = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
        duration = frame_count / fps if fps > 0 else 0
        width = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH))
        height = int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT))
        
        logger.info(f"📊 Video: {duration:.1f}s, {frame_count} frames, {fps:.1f}fps, {width}x{height}")
        
        # Analysis variables (same as your code)
        hist = deque(maxlen=HIST_FRAMES)
        frames_analyzed = 0
        frames_with_face = 0
        lazy_eye_detections = 0
        detection_events = []
        
        # Simulate car movement for analysis (based on your bounce logic)
        car_x = 0
        car_speed = 7  # pixels per frame from your code
        car_width = 100
        bounce_count = 0
        
        while True:
            ret, frame = cap.read()
            if not ret:
                break
                
            frames_analyzed += 1
            h, w = frame.shape[:2]
            
            # MediaPipe processing (exactly like your code)
            rgb = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
            results = mesh.process(rgb)

            if results.multi_face_landmarks:
                frames_with_face += 1
                
                # Extract iris positions (same as your code)
                pts = results.multi_face_landmarks[0].landmark
                li = pts[LEFT_IRIS]
                ri = pts[RIGHT_IRIS]
                li_px = np.array([li.x * w, li.y * h])
                ri_px = np.array([ri.x * w, ri.y * h])
                hist.append((li_px.copy(), ri_px.copy()))
            
            # Simulate car bounce logic from your code
            car_x += car_speed
            if car_x + car_width > w or car_x < 0:
                # Bounce detected - evaluate lazy eye (your original logic)
                car_speed = -car_speed
                bounce_count += 1
                
                # Apply your detection algorithm
                is_lazy, disp_l, disp_r = detect_lazy_eye(hist)
                
                if is_lazy:
                    lazy_eye_detections += 1
                    timestamp = frames_analyzed / fps
                    
                    detection_events.append({
                        "timestamp": round(timestamp, 1),
                        "left_displacement": round(float(disp_l), 1),
                        "right_displacement": round(float(disp_r), 1),
                        "message": f"Lazy eye detected at bounce #{bounce_count}",
                        "bounce_number": bounce_count
                    })
                    
                    logger.info(f"⚠️ Lazy eye detected at {timestamp:.1f}s - L:{disp_l:.1f}px, R:{disp_r:.1f}px")
                
                # Clear history after evaluation (your original logic)
                hist.clear()
                car_x = max(0, min(car_x, w - car_width))
        
        # Cleanup
        cap.release()
        mesh.close()
        
        # Calculate results
        face_detection_rate = (frames_with_face / frames_analyzed * 100) if frames_analyzed > 0 else 0
        
        # Risk assessment based on your algorithm results
        if lazy_eye_detections >= 3:
            risk_level = "HIGH"
            confidence = "High"
            recommendation = "Multiple detections found. Consult an eye care professional immediately."
        elif lazy_eye_detections >= 1:
            risk_level = "MEDIUM"
            confidence = "Medium"
            recommendation = "Asymmetric eye movement detected. Consider professional evaluation."
        else:
            risk_level = "LOW"
            confidence = "High" if face_detection_rate > 70 else "Medium"
            recommendation = "No significant asymmetric eye movements detected."
        
        results = {
            "video_info": {
                "duration": round(duration, 1),
                "fps": round(fps, 1),
                "total_frames": frame_count,
                "resolution": f"{width}x{height}",
                "bounces_analyzed": bounce_count
            },
            "analysis": {
                "frames_analyzed": frames_analyzed,
                "frames_with_face": frames_with_face,
                "face_detection_rate": round(face_detection_rate, 1),
                "lazy_eye_detections": lazy_eye_detections,
                "detection_events": detection_events,
                "algorithm": "mediapipe_with_bounce_detection"
            },
            "risk_assessment": {
                "level": risk_level,
                "confidence": confidence,
                "recommendation": recommendation
            }
        }
        
        logger.info(f"✅ Analysis complete: {lazy_eye_detections} detections in {bounce_count} bounces")
        return results
        
    except Exception as e:
        logger.error(f"❌ Analysis error: {str(e)}")
        return {"error": f"MediaPipe analysis failed: {str(e)}"}

def allowed_file(filename):
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS

# ================= FLASK ROUTES =================
@app.route('/', methods=['GET'])
def home():
    return jsonify({
        "service": "👁️ Real Eye Tracker API",
        "version": "2.0",
        "status": "operational",
        "deployment": "aws-ec2",
        "algorithm": "MediaPipe + Original Lazy Eye Detection",
        "parameters": {
            "move_threshold_px": MOVE_PX_MIN,
            "ratio_threshold": RATIO_THRESH,
            "history_frames": HIST_FRAMES
        },
        "endpoints": {
            "health": "GET /health",
            "test": "GET /test", 
            "upload": "POST /upload"
        }
    })

@app.route('/health', methods=['GET'])
def health():
    return jsonify({
        "status": "healthy",
        "timestamp": int(time.time()),
        "deployment": "aws-ec2",
        "service": "eye-tracker-api",
        "mediapipe": "available",
        "opencv": cv2.__version__,
        "analysis": "real"
    })

@app.route('/test', methods=['GET'])
def test():
    try:
        # Test MediaPipe
        mp_face_mesh = mp.solutions.face_mesh
        mesh = mp_face_mesh.FaceMesh(max_num_faces=1)
        mesh.close()
        
        # Test OpenCV
        test_frame = np.zeros((100, 100, 3), dtype=np.uint8)
        gray = cv2.cvtColor(test_frame, cv2.COLOR_BGR2GRAY)
        
        return jsonify({
            "status": "✅ ALL SYSTEMS OPERATIONAL",
            "deployment": "aws-ec2",
            "mediapipe": f"OK - Face detection ready",
            "opencv": f"OK - {cv2.__version__}",
            "numpy": f"OK - {np.__version__}",
            "algorithm": "Original lazy eye detection loaded",
            "message": "Ready for real video analysis!"
        })
    except Exception as e:
        return jsonify({
            "status": "❌ SYSTEM ERROR",
            "error": str(e)
        }), 500

@app.route('/upload', methods=['POST'])
def upload_video():
    start_time = time.time()
    temp_path = None
    
    try:
        # Validate request
        if 'video' not in request.files:
            return jsonify({'success': False, 'error': 'No video file provided'}), 400
        
        file = request.files['video']
        if file.filename == '' or not allowed_file(file.filename):
            return jsonify({'success': False, 'error': 'Invalid file type'}), 400
        
        # Save to temp file
        video_bytes = file.read()
        file_size_mb = len(video_bytes) / (1024 * 1024)
        
        logger.info(f"📤 Received: {file.filename} ({file_size_mb:.2f} MB)")
        
        if file_size_mb > 50:
            return jsonify({'success': False, 'error': f'File too large: {file_size_mb:.1f}MB'}), 413
        
        # Create temporary file
        with tempfile.NamedTemporaryFile(delete=False, suffix='.webm') as temp_file:
            temp_file.write(video_bytes)
            temp_path = temp_file.name
        
        # Perform real MediaPipe analysis
        logger.info("🔍 Starting real MediaPipe analysis...")
        analysis_results = analyze_video_with_mediapipe(temp_path)
        
        if "error" in analysis_results:
            return jsonify({'success': False, **analysis_results}), 500
        
        processing_time = time.time() - start_time
        logger.info(f"✅ Real analysis completed in {processing_time:.2f} seconds")
        
        return jsonify({
            'success': True,
            'filename': file.filename,
            'size_mb': round(file_size_mb, 2),
            'processing_time_seconds': round(processing_time, 2),
            'analysis': analysis_results,
            'message': 'Real MediaPipe analysis completed!',
            'deployment': 'aws-ec2',
            'algorithm': 'original-mediapipe-lazy-eye-detection'
        })
        
    except Exception as e:
        logger.error(f"❌ Upload error: {str(e)}")
        return jsonify({'success': False, 'error': f'Processing failed: {str(e)}'}), 500
    
    finally:
        # Clean up temp file
        if temp_path and os.path.exists(temp_path):
            try:
                os.unlink(temp_path)
                logger.info("🗑️ Temp file cleaned up")
            except:
                pass

@app.route('/ping', methods=['GET'])
def ping():
    return "pong", 200


def detect_leukocoria(img: np.ndarray) -> bool:
    """
    Returns True if *any* eye in the image shows a white/yellow reflex,
    otherwise False.
    """
    gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
    faces = FACE_CASCADE.detectMultiScale(gray, 1.3, 5)

    for (x, y, w, h) in faces:
        roi_gray  = gray[y : y + h, x : x + w]
        roi_color = img[y : y + h, x : x + w]

        for (ex, ey, ew, eh) in EYE_CASCADE.detectMultiScale(roi_gray):
            eye = roi_color[ey : ey + eh, ex : ex + ew]

            gray_eye = cv2.cvtColor(eye, cv2.COLOR_BGR2GRAY)
            _, thresh = cv2.threshold(
                cv2.GaussianBlur(gray_eye, (5, 5), 0), 50, 255, cv2.THRESH_BINARY_INV
            )
            cnts, _ = cv2.findContours(
                thresh, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE
            )
            if not cnts:
                continue

            pupil = max(cnts, key=cv2.contourArea)
            mask = np.zeros(eye.shape[:2], dtype="uint8")
            cv2.drawContours(mask, [pupil], -1, 255, -1)

            mean_bgr = cv2.mean(eye, mask=mask)[:3]
            h, s, v = cv2.cvtColor(
                np.uint8([[mean_bgr]]), cv2.COLOR_BGR2HSV
            )[0][0]

            if s < 50 and v > 120:          # white/yellow reflex
                return True
    return False

@app.route("/detect", methods=["POST"])
def detect_endpoint():
    """
    POST /detect
    form-data key 'photo' or 'file' -> image
    returns JSON {"leukocoria": true/false}
    """
    # Check for both 'photo' (from flashlight test) and 'file' (generic)
    file_obj = request.files.get('photo') or request.files.get('file')
    if not file_obj:
        return jsonify({"error": "No image file provided (expected 'photo' or 'file')"}), 400

    file_bytes = np.frombuffer(file_obj.read(), np.uint8)
    img = cv2.imdecode(file_bytes, cv2.IMREAD_COLOR)
    if img is None:
        return jsonify({"error": "Invalid image format"}), 400

    result = detect_leukocoria(img)
    return jsonify({
        "leukocoria": result,
        "success": True,
        "message": "Leukocoria detected" if result else "No leukocoria detected"
    })

# Error handlers
@app.errorhandler(413)
def too_large(e):
    return jsonify({'success': False, 'error': 'File too large (max 50MB)'}), 413

@app.errorhandler(404)
def not_found(e):
    return jsonify({'success': False, 'error': 'Endpoint not found'}), 404

@app.errorhandler(500)
def internal_error(e):
    return jsonify({'success': False, 'error': 'Internal server error'}), 500


# ================= MAIN ENTRY POINT =================
if __name__ == '__main__':
    # AWS EC2 configuration
    port = int(os.environ.get('PORT', 5000))
    host = '0.0.0.0'  # Important for EC2
    debug = os.environ.get('FLASK_ENV') == 'development'
    
    logger.info(f"🌐 Starting AWS EC2 server on {host}:{port}")
    logger.info(f"🔧 Debug mode: {debug}")
    logger.info(f"🧠 MediaPipe ready for real analysis")
    logger.info(f"👁️ Algorithm: Original lazy eye detection")
    
    app.run(host=host, port=port, debug=debug)
