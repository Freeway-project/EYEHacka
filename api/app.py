# app.py - Complete Render API
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

# ================= CONFIGURATION =================
MAX_FILE_SIZE = 100 * 1024 * 1024  # 100MB
MOVE_PX_MIN = 30
RATIO_THRESH = 0.30
HIST_FRAMES = 60

app = Flask(__name__)
app.config['MAX_CONTENT_LENGTH'] = MAX_FILE_SIZE

# CORS for cross-origin requests (Vercel frontend → Render API)
CORS(app, origins=[
    "http://localhost:3000",  # Local development
    "https://*.vercel.app",   # Vercel frontend
    "https://*.onrender.com", # Render services
])

print("✅ Render API initialized for eye tracking!")

# ================= HELPER FUNCTIONS =================
def detect_lazy_eye(hist, move_px=MOVE_PX_MIN, ratio=RATIO_THRESH):
    """Detect lazy eye from eye movement history"""
    if len(hist) < 15: 
        return False, 0.0, 0.0
    
    l = np.array([p[0] for p in hist], dtype=float)
    r = np.array([p[1] for p in hist], dtype=float)
    disp_l = np.linalg.norm(l[-1] - l[0])
    disp_r = np.linalg.norm(r[-1] - r[0])
    fast, slow = max(disp_l, disp_r), min(disp_l, disp_r)
    
    is_lazy = fast > move_px and slow < fast * ratio
    return is_lazy, disp_l, disp_r

def analyze_video_stream(video_bytes):
    """Analyze video from bytes using MediaPipe"""
    temp_path = None
    try:
        print(f"📹 Processing video: {len(video_bytes) / 1024 / 1024:.2f} MB")
        
        # Create temporary file
        with tempfile.NamedTemporaryFile(delete=False, suffix='.webm') as temp_file:
            temp_file.write(video_bytes)
            temp_path = temp_file.name
        
        # MediaPipe setup
        mp_face_mesh = mp.solutions.face_mesh
        mesh = mp_face_mesh.FaceMesh(
            refine_landmarks=True, 
            max_num_faces=1,
            min_detection_confidence=0.5,
            min_tracking_confidence=0.5
        )
        LEFT_IRIS, RIGHT_IRIS = 468, 473
        
        # Open video
        cap = cv2.VideoCapture(temp_path)
        if not cap.isOpened():
            raise Exception("Could not open video file")
        
        # Get video properties
        fps = cap.get(cv2.CAP_PROP_FPS) or 30.0
        frame_count = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
        duration = frame_count / fps if fps > 0 else 0
        
        print(f"📊 Video: {duration:.1f}s, {frame_count} frames, {fps:.1f} FPS")
        
        # Analysis variables
        hist = deque(maxlen=HIST_FRAMES)
        frames_analyzed = 0
        frames_with_face = 0
        lazy_eye_detections = 0
        detection_events = []
        
        # Process video frame by frame
        while True:
            ret, frame = cap.read()
            if not ret:
                break
                
            frames_analyzed += 1
            
            # Skip frames for performance (analyze every 2nd frame)
            if frames_analyzed % 2 != 0:
                continue
            
            h, w = frame.shape[:2]
            rgb_frame = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
            results = mesh.process(rgb_frame)

            if results.multi_face_landmarks:
                frames_with_face += 1
                
                # Extract iris positions
                landmarks = results.multi_face_landmarks[0].landmark
                left_iris = landmarks[LEFT_IRIS]
                right_iris = landmarks[RIGHT_IRIS]
                
                # Convert to pixel coordinates
                left_px = np.array([left_iris.x * w, left_iris.y * h])
                right_px = np.array([right_iris.x * w, right_iris.y * h])
                hist.append((left_px.copy(), right_px.copy()))

                # Check for lazy eye every 30 frames
                if len(hist) >= 30 and frames_analyzed % 30 == 0:
                    is_lazy, disp_l, disp_r = detect_lazy_eye(hist)
                    
                    if is_lazy:
                        lazy_eye_detections += 1
                        timestamp = frames_analyzed / fps
                        detection_events.append({
                            "timestamp": timestamp,
                            "left_displacement": float(disp_l),
                            "right_displacement": float(disp_r),
                            "message": f"Possible lazy eye detected - L:{disp_l:.1f}px, R:{disp_r:.1f}px"
                        })
                        print(f"⚠️ Lazy eye detected at {timestamp:.1f}s")
                    
                    # Clear history for next analysis window
                    hist.clear()
        
        # Cleanup
        cap.release()
        mesh.close()
        
        # Calculate results
        face_detection_rate = (frames_with_face / frames_analyzed * 100) if frames_analyzed > 0 else 0
        
        # Risk assessment
        if lazy_eye_detections > 2:
            risk_level = "HIGH"
            recommendation = "Consult an eye care professional immediately"
        elif lazy_eye_detections > 0:
            risk_level = "MEDIUM" 
            recommendation = "Monitor closely and consider professional consultation"
        else:
            risk_level = "LOW"
            recommendation = "No significant issues detected"
        
        confidence = "High" if face_detection_rate > 70 else "Medium" if face_detection_rate > 50 else "Low"
        
        results = {
            "video_info": {
                "duration": duration,
                "fps": fps,
                "total_frames": frame_count
            },
            "analysis": {
                "frames_analyzed": frames_analyzed,
                "frames_with_face": frames_with_face,
                "face_detection_rate": face_detection_rate,
                "lazy_eye_detections": lazy_eye_detections,
                "detection_events": detection_events
            },
            "risk_assessment": {
                "level": risk_level,
                "confidence": confidence,
                "recommendation": recommendation
            }
        }
        
        print(f"✅ Analysis complete: {lazy_eye_detections} detections, {face_detection_rate:.1f}% face detection")
        return results
        
    except Exception as e:
        print(f"❌ Analysis error: {str(e)}")
        return {"error": f"Video analysis failed: {str(e)}"}
    
    finally:
        # Clean up temp file
        if temp_path and os.path.exists(temp_path):
            try:
                os.unlink(temp_path)
                print("🗑️ Temp file cleaned up")
            except:
                pass

# ================= FLASK ROUTES =================
@app.route('/')
def index():
    return jsonify({
        "message": "👁️ Eye Tracker API - Render Deployment",
        "version": "1.0",
        "status": "running",
        "deployment": "render",
        "algorithm": "MediaPipe + Lazy Eye Detection",
        "endpoints": {
            "upload": "/upload (POST - send video file)",
            "health": "/health (GET)",
            "test": "/test (GET)"
        },
        "cors": "enabled for Vercel frontends"
    })

@app.route('/health')
def health():
    return jsonify({
        "status": "healthy", 
        "deployment": "render",
        "timestamp": time.time(),
        "environment": os.environ.get('RENDER_SERVICE_NAME', 'development'),
        "packages": {
            "opencv": cv2.__version__,
            "numpy": np.__version__,
            "mediapipe": "0.10.14",
            "flask": "3.0.0"
        }
    })

@app.route('/test')
def test():
    """Test if all components work"""
    try:
        # Test MediaPipe
        mp_face_mesh = mp.solutions.face_mesh
        mesh = mp_face_mesh.FaceMesh(max_num_faces=1)
        mesh.close()
        
        # Test OpenCV
        test_frame = np.zeros((100, 100, 3), dtype=np.uint8)
        gray = cv2.cvtColor(test_frame, cv2.COLOR_BGR2GRAY)
        
        return jsonify({
            "status": "✅ ALL SYSTEMS WORKING",
            "deployment": "render",
            "mediapipe": "OK",
            "opencv": f"OK - {cv2.__version__}",
            "numpy": f"OK - {np.__version__}",
            "tempfile": "OK",
            "message": "Ready to analyze videos on Render!"
        })
    except Exception as e:
        return jsonify({
            "status": "❌ ERROR",
            "error": str(e)
        }), 500

@app.route('/upload', methods=['POST'])
def upload_video():
    try:
        start_time = time.time()
        
        # Check for video file
        if 'video' not in request.files:
            return jsonify({'error': 'No video file provided'}), 400
        
        file = request.files['video']
        if file.filename == '':
            return jsonify({'error': 'No file selected'}), 400
        
        # Read video bytes
        video_bytes = file.read()
        file_size_mb = len(video_bytes) / 1024 / 1024
        
        print(f"📤 Received: {file.filename} ({file_size_mb:.2f} MB)")
        
        # Validate file size
        if file_size_mb > 50:  # 50MB limit for processing
            return jsonify({'error': f'File too large: {file_size_mb:.1f}MB (max 50MB)'}), 413
        
        # Analyze video
        results = analyze_video_stream(video_bytes)
        
        if "error" in results:
            return jsonify(results), 500
        
        processing_time = time.time() - start_time
        print(f"⏱️ Processing completed in {processing_time:.2f} seconds")
        
        return jsonify({
            'success': True,
            'filename': file.filename,
            'size_mb': file_size_mb,
            'processing_time_seconds': processing_time,
            'analysis': results,
            'message': 'Video analyzed successfully on Render!',
            'deployment': 'render'
        })
        
    except Exception as e:
        print(f"❌ Upload error: {str(e)}")
        return jsonify({'error': f'Upload processing failed: {str(e)}'}), 500

# Health check for Render
@app.route('/ping')
def ping():
    return "pong"

if __name__ == '__main__':
    # Get port from environment (Render sets this)
    port = int(os.environ.get('PORT', 5000))
    print(f"🚀 Starting Render API on port {port}")
    app.run(host='0.0.0.0', port=port, debug=False)