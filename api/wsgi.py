"""
WSGI Entry Point for Gunicorn
"""
import os
import sys

# Add current directory to Python path
sys.path.insert(0, os.path.dirname(__file__))

# Import Flask app
from app import app

# WSGI callable
application = app

if __name__ == "__main__":
    # For testing: python wsgi.py
    application.run(debug=False, host='0.0.0.0', port=5000)
