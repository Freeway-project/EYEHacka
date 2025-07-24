"""
Gunicorn Configuration for Eye Tracker API
"""
import multiprocessing

# Server socket
bind = "0.0.0.0:5000"
backlog = 2048

# Worker processes
workers = min(4, multiprocessing.cpu_count() * 2 + 1)
worker_class = "sync"
worker_connections = 1000
timeout = 300  # 5 minutes for video processing
keepalive = 5

# Restart workers to prevent memory leaks
max_requests = 500
max_requests_jitter = 50

# Logging
accesslog = "-"
errorlog = "-"
loglevel = "info"
access_log_format = '%(h)s "%(r)s" %(s)s %(b)s %(D)s μs'

# Process naming
proc_name = 'eye_tracker_api'

# Server mechanics
preload_app = True
daemon = False
pidfile = '/tmp/gunicorn_eye_tracker.pid'

# Environment
raw_env = [
    'FLASK_ENV=production',
]
