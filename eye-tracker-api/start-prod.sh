#!/bin/bash
echo "🚀 Starting with Gunicorn..."
gunicorn --bind 0.0.0.0:5000 --workers 4 --timeout 300 wsgi:app
