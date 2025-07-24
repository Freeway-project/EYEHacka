#!/bin/bash
echo "🧪 Testing Eye Tracker API..."
echo ""

echo "1️⃣ Testing health endpoint..."
curl -s http://localhost:5000/health | python3 -m json.tool
echo ""

echo "2️⃣ Testing components..."
curl -s http://localhost:5000/test | python3 -m json.tool
echo ""

echo "3️⃣ Testing main endpoint..."
curl -s http://localhost:5000/ | python3 -m json.tool
echo ""

echo "✅ All tests completed!"
