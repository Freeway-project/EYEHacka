# app.py - Simple Flask Eye Tracker API
import os
import cv2
import json
import numpy as np
import mediapipe as mp
from collections import deque
from flask import Flask, request, jsonify
from flask_cors import CORS
from werkzeug.utils import secure_filename
import time

# ================= CONFIGURATION =================
UPLOAD_FOLDER = 'uploads'
RESULTS_FOLDER = 'results'
ALLOWED_EXTENSIONS = {'webm', 'mp4', 'avi', 'mov'}
MAX_FILE_SIZE = 50 * 1024 * 1024  # 50MB

# Eye tracking parameters (from your original code)
MOVE_PX_MIN = 30            # eye must move ≥ this to call it "tracking"
RATIO_THRESH = 0.30         # lazy‑eye ratio threshold (≤ → flag)
HIST_FRAMES = 60            # frames stored per sweep

app = Flask(__name__)
app.config['MAX_CONTENT_LENGTH'] = MAX_FILE_SIZE
CORS(app)

# Create directories
os.makedirs(UPLOAD_FOLDER, exist_ok=True)
os.makedirs(RESULTS_FOLDER, exist_ok=True)

print("✅ Flask app initialized successfully!")

# ================= HELPER FUNCTIONS =================
def allowed_file(filename):
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS

def detect_lazy_eye(hist, move_px=MOVE_PX_MIN, ratio=RATIO_THRESH):
    """Your original lazy eye detection function"""
    if len(hist) < 15: 
        return False, 0.0, 0.0
    
    l = np.array([p[0] for p in hist], dtype=float)
    r = np.array([p[1] for p in hist], dtype=float)
    disp_l = np.linalg.norm(l[-1] - l[0])
    disp_r = np.linalg.norm(r[-1] - r[0])
    fast, slow = max(disp_l, disp_r), min(disp_l, disp_r)
    
    is_lazy = fast > move_px and slow < fast * ratio
    return is_lazy, disp_l, disp_r

def analyze_video(video_path):
    """Analyze video using your eye tracking algorithm"""
    try:
        # MediaPipe setup (same as your code)
        mesh = mp.solutions.face_mesh.FaceMesh(refine_landmarks=True, max_num_faces=1)
        LEFT_IRIS, RIGHT_IRIS = 468, 473
        
        # Open video
        cap = cv2.VideoCapture(video_path)
        if not cap.isOpened():
            return {"error": "Could not open video file"}
        
        # Get video properties
        fps = cap.get(cv2.CAP_PROP_FPS) or 30.0
        frame_count = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
        duration = frame_count / fps if fps > 0 else 0
        
        # Analysis variables (same as your code)
        hist = deque(maxlen=HIST_FRAMES)
        frames_analyzed = 0
        frames_with_face = 0
        lazy_eye_detections = 0
        detection_events = []
        
        print(f"📹 Analyzing video: {duration:.1f}s, {frame_count} frames")
        
        while True:
            ok, frame = cap.read()
            if not ok: 
                break
                
            frames_analyzed += 1
            h, w = frame.shape[:2]
            rgb = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
            res = mesh.process(rgb)

            if res.multi_face_landmarks:
                frames_with_face += 1
                
                # Extract iris positions (same as your code)
                pts = res.multi_face_landmarks[0].landmark
                li = pts[LEFT_IRIS]
                ri = pts[RIGHT_IRIS]
                li_px = np.array([li.x*w, li.y*h])
                ri_px = np.array([ri.x*w, ri.y*h])
                hist.append((li_px.copy(), ri_px.copy()))

                # Check for lazy eye every 30 frames (simulate your "bounce" detection)
                if len(hist) >= 30 and frames_analyzed % 30 == 0:
                    is_lazy, disp_l, disp_r = detect_lazy_eye(hist)
                    
                    if is_lazy:
                        lazy_eye_detections += 1
                        detection_events.append({
                            "timestamp": frames_analyzed / fps,
                            "left_displacement": float(disp_l),
                            "right_displacement": float(disp_r),
                            "message": "Possible lazy eye detected"
                        })
                        print(f"⚠️ Lazy eye detected at {frames_analyzed/fps:.1f}s")
                    
                    # Clear history (simulate your bounce reset)
                    hist.clear()
        
        cap.release()
        mesh.close()
        
        # Generate results
        results = {
            "video_info": {
                "duration": duration,
                "fps": fps,
                "total_frames": frame_count
            },
            "analysis": {
                "frames_analyzed": frames_analyzed,
                "frames_with_face": frames_with_face,
                "face_detection_rate": (frames_with_face / frames_analyzed * 100) if frames_analyzed > 0 else 0,
                "lazy_eye_detections": lazy_eye_detections,
                "detection_events": detection_events
            },
            "risk_assessment": {
                "level": "HIGH" if lazy_eye_detections > 0 else "LOW",
                "confidence": "High" if frames_with_face > frames_analyzed * 0.7 else "Low",
                "recommendation": "Consult an eye care professional" if lazy_eye_detections > 0 else "No issues detected"
            }
        }
        
        return results
        
    except Exception as e:
        print(f"❌ Error analyzing video: {str(e)}")
        return {"error": f"Analysis failed: {str(e)}"}

# ================= FLASK ROUTES =================
@app.route('/')
def index():
    return jsonify({
        "message": "👁️ Eye Tracker API",
        "version": "1.0",
        "status": "running",
        "algorithm": "MediaPipe + Lazy Eye Detection",
        "endpoints": {
            "upload": "/upload (POST - send video file)",
            "health": "/health (GET)",
            "test": "/test (GET)"
        }
    })

@app.route('/health')
def health():
    return jsonify({
        "status": "healthy", 
        "timestamp": time.time(),
        "packages": {
            "opencv": cv2.__version__,
            "numpy": np.__version__,
            "mediapipe": "0.10.14"
        }
    })

@app.route('/test')
def test():
    """Test if all components work"""
    try:
        # Test MediaPipe
        mesh = mp.solutions.face_mesh.FaceMesh(max_num_faces=1)
        mesh.close()
        
        return jsonify({
            "status": "✅ ALL SYSTEMS WORKING",
            "mediapipe": "OK",
            "opencv": f"OK - {cv2.__version__}",
            "numpy": f"OK - {np.__version__}",
            "message": "Ready to analyze videos!"
        })
    except Exception as e:
        return jsonify({
            "status": "❌ ERROR",
            "error": str(e)
        }), 500

@app.route('/upload', methods=['POST'])
def upload_video():
    try:
        # Check for video file
        if 'video' not in request.files:
            return jsonify({'error': 'No video file provided'}), 400
        
        file = request.files['video']
        if file.filename == '':
            return jsonify({'error': 'No file selected'}), 400
        
        if not allowed_file(file.filename):
            return jsonify({'error': 'Invalid file type. Use: webm, mp4, avi, mov'}), 400
        
        # Save file
        filename = secure_filename(file.filename)
        timestamp = str(int(time.time()))
        unique_filename = f"{timestamp}_{filename}"
        file_path = os.path.join(UPLOAD_FOLDER, unique_filename)
        
        print(f"💾 Saving: {unique_filename}")
        file.save(file_path)
        
        # Analyze video
        print(f"🔍 Analyzing: {unique_filename}")
        results = analyze_video(file_path)
        
        if "error" in results:
            return jsonify(results), 500
        
        # Save results
        results_file = f"analysis_{timestamp}.json"
        results_path = os.path.join(RESULTS_FOLDER, results_file)
        with open(results_path, 'w') as f:
            json.dump(results, f, indent=2)
        
        # Clean up video file
        try:
            os.remove(file_path)
            print(f"🗑️ Cleaned up: {file_path}")
        except:
            pass
        
        return jsonify({
            'success': True,
            'filename': unique_filename,
            'analysis': results,
            'message': 'Video analyzed successfully!'
        })
        
    except Exception as e:
        print(f"❌ Upload error: {str(e)}")
        return jsonify({'error': f'Upload failed: {str(e)}'}), 500

if __name__ == '__main__':
    print("🚀 Starting Eye Tracker API...")
    print(f"📁 Upload folder: {UPLOAD_FOLDER}")
    print(f"📁 Results folder: {RESULTS_FOLDER}")
    print("🌐 Server starting on http://localhost:5000")
    print("🔗 Test with: curl http://localhost:5000/test")
    
    app.run(debug=True, host='0.0.0.0', port=5000)