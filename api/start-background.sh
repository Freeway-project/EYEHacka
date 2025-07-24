#!/bin/bash
echo "🌙 Starting Eye Tracker API in BACKGROUND mode..."
echo "📍 Make sure virtual environment is activated!"
echo "🌐 Server will be available at: http://localhost:5000"
echo "📄 Logs will be written to app.log"
echo ""
nohup gunicorn --config gunicorn.conf.py wsgi:app > app.log 2>&1 &
echo "✅ Server started in background. PID: $!"
echo "📄 View logs with: tail -f app.log"
echo "🛑 Stop with: pkill -f gunicorn"
