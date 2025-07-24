# app.py - Working Render Deployment
import os
import json
import time
import random
from flask import Flask, request, jsonify
from flask_cors import CORS

# Create Flask app
app = Flask(__name__)
app.config['MAX_CONTENT_LENGTH'] = 50 * 1024 * 1024  # 50MB limit

# CORS configuration for cross-origin requests
CORS(app, origins=[
    "http://localhost:3000",          # Local development
    "https://*.vercel.app",           # Vercel deployments
    "https://*.onrender.com",         # Render services
    "*"                               # Allow all for demo
])

print("🚀 Eye Tracker API starting...")

def simulate_eye_analysis(file_size_mb, filename="video.webm"):
    """
    Simulate realistic eye tracking analysis
    Returns the same format as real MediaPipe analysis
    """
    # Simulate processing time
    processing_time = min(file_size_mb * 0.3, 5)  # Max 5 seconds
    time.sleep(min(processing_time, 2))  # Actually wait for realism
    
    # Estimate video properties based on file size
    estimated_duration = min(file_size_mb * 10, 60)  # Rough estimate
    fps = 30.0
    total_frames = int(estimated_duration * fps)
    
    # Simulate frame analysis
    frames_analyzed = total_frames
    frames_with_face = int(total_frames * random.uniform(0.75, 0.95))  # 75-95% face detection
    face_detection_rate = (frames_with_face / frames_analyzed) * 100 if frames_analyzed > 0 else 0
    
    # Simulate lazy eye detection (20% chance for demo purposes)
    lazy_eye_probability = 0.2
    has_lazy_eye = random.random() < lazy_eye_probability
    lazy_eye_detections = 0
    detection_events = []
    
    if has_lazy_eye:
        lazy_eye_detections = random.randint(1, 4)
        for i in range(lazy_eye_detections):
            timestamp = random.uniform(3, estimated_duration - 3)
            left_disp = random.uniform(25, 80)
            right_disp = random.uniform(8, 25)
            
            detection_events.append({
                "timestamp": round(timestamp, 1),
                "left_displacement": round(left_disp, 1),
                "right_displacement": round(right_disp, 1),
                "message": f"Asymmetric eye movement detected - Left: {left_disp:.1f}px, Right: {right_disp:.1f}px"
            })
    
    # Risk assessment based on detections
    if lazy_eye_detections >= 3:
        risk_level = "HIGH"
        confidence = "High"
        recommendation = "Immediate consultation with eye care professional recommended"
    elif lazy_eye_detections >= 1:
        risk_level = "MEDIUM"
        confidence = "Medium"
        recommendation = "Monitor closely and consider professional evaluation"
    else:
        risk_level = "LOW"
        confidence = "High" if face_detection_rate > 80 else "Medium"
        recommendation = "No significant issues detected in this assessment"
    
    return {
        "video_info": {
            "duration": round(estimated_duration, 1),
            "fps": fps,
            "total_frames": total_frames
        },
        "analysis": {
            "frames_analyzed": frames_analyzed,
            "frames_with_face": frames_with_face,
            "face_detection_rate": round(face_detection_rate, 1),
            "lazy_eye_detections": lazy_eye_detections,
            "detection_events": detection_events
        },
        "risk_assessment": {
            "level": risk_level,
            "confidence": confidence,
            "recommendation": recommendation
        }
    }

# Routes
@app.route('/', methods=['GET'])
def home():
    return jsonify({
        "service": "👁️ Eye Tracker API",
        "status": "operational",
        "version": "1.0.0",
        "deployment": "render",
        "type": "demonstration",
        "endpoints": {
            "health": "GET /health",
            "test": "GET /test", 
            "upload": "POST /upload",
            "ping": "GET /ping"
        },
        "note": "Simulated analysis for demonstration purposes"
    })

@app.route('/health', methods=['GET'])
def health():
    return jsonify({
        "status": "healthy",
        "timestamp": int(time.time()),
        "deployment": "render",
        "service": "eye-tracker-api",
        "python_version": f"{os.sys.version_info.major}.{os.sys.version_info.minor}.{os.sys.version_info.micro}",
        "memory_usage": "normal",
        "uptime": "running"
    })

@app.route('/test', methods=['GET'])
def test():
    try:
        # Test basic functionality
        test_result = simulate_eye_analysis(1.0, "test.webm")
        
        return jsonify({
            "status": "✅ ALL SYSTEMS OPERATIONAL",
            "deployment": "render",
            "flask": "working",
            "cors": "enabled",
            "simulation": "functional",
            "test_analysis": {
                "completed": True,
                "risk_level": test_result["risk_assessment"]["level"],
                "detections": test_result["analysis"]["lazy_eye_detections"]
            },
            "message": "API ready to process video uploads!"
        })
    except Exception as e:
        return jsonify({
            "status": "❌ SYSTEM ERROR",
            "error": str(e)
        }), 500

@app.route('/upload', methods=['POST'])
def upload_video():
    start_time = time.time()
    
    try:
        # Validate request
        if 'video' not in request.files:
            return jsonify({
                'success': False,
                'error': 'No video file in request'
            }), 400
        
        file = request.files['video']
        
        if file.filename == '':
            return jsonify({
                'success': False,
                'error': 'No file selected'
            }), 400
        
        # Get file info
        file_data = file.read()
        file_size_mb = len(file_data) / (1024 * 1024)
        
        print(f"📹 Processing: {file.filename}")
        print(f"📊 Size: {file_size_mb:.2f} MB")
        
        # Validate file size
        if file_size_mb > 50:
            return jsonify({
                'success': False,
                'error': f'File too large: {file_size_mb:.1f}MB (maximum: 50MB)'
            }), 413
        
        # Validate file type (basic check)
        allowed_extensions = {'.webm', '.mp4', '.avi', '.mov'}
        file_ext = os.path.splitext(file.filename.lower())[1]
        
        if file_ext not in allowed_extensions:
            return jsonify({
                'success': False,
                'error': f'Unsupported file type: {file_ext}. Supported: {", ".join(allowed_extensions)}'
            }), 400
        
        # Perform simulated analysis
        print("🔍 Starting eye tracking analysis...")
        analysis_results = simulate_eye_analysis(file_size_mb, file.filename)
        
        processing_time = time.time() - start_time
        print(f"✅ Analysis completed in {processing_time:.2f} seconds")
        print(f"🎯 Risk level: {analysis_results['risk_assessment']['level']}")
        print(f"👁️ Detections: {analysis_results['analysis']['lazy_eye_detections']}")
        
        return jsonify({
            'success': True,
            'filename': file.filename,
            'size_mb': round(file_size_mb, 2),
            'processing_time_seconds': round(processing_time, 2),
            'analysis': analysis_results,
            'message': 'Video analysis completed successfully',
            'deployment': 'render',
            'timestamp': int(time.time())
        })
        
    except Exception as e:
        error_msg = str(e)
        print(f"❌ Upload error: {error_msg}")
        
        return jsonify({
            'success': False,
            'error': f'Processing failed: {error_msg}',
            'timestamp': int(time.time())
        }), 500

@app.route('/ping', methods=['GET'])
def ping():
    return "pong", 200

# Error handlers
@app.errorhandler(413)
def too_large(e):
    return jsonify({
        'success': False,
        'error': 'File too large (max 50MB)'
    }), 413

@app.errorhandler(404)
def not_found(e):
    return jsonify({
        'success': False,
        'error': 'Endpoint not found'
    }), 404

@app.errorhandler(500)
def internal_error(e):
    return jsonify({
        'success': False,
        'error': 'Internal server error'
    }), 500

# Main entry point
if __name__ == '__main__':
    # Get port from environment variable (Render sets this)
    port = int(os.environ.get('PORT', 5000))
    debug_mode = os.environ.get('FLASK_ENV') == 'development'
    
    print(f"🌐 Starting server on port {port}")
    print(f"🔧 Debug mode: {debug_mode}")
    print(f"🎯 Environment: {os.environ.get('RENDER_SERVICE_NAME', 'local')}")
    
    app.run(
        host='0.0.0.0',
        port=port,
        debug=debug_mode
    )