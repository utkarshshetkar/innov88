#!/bin/bash
# start.sh — Linux/macOS startup script

echo "============================================"
echo "  RoomBook - College Booking System"
echo "============================================"
echo ""

# Check for Node.js
if ! command -v node &> /dev/null; then
  echo "[ERROR] Node.js is not installed."
  echo "Download from: https://nodejs.org  (LTS version)"
  exit 1
fi

echo "[1/4] Setting up backend..."
cd backend
[ ! -f .env ] && cp .env.example .env && echo "  Created .env from template"
[ ! -d node_modules ] && npm install
[ ! -f data/booking.db ] && node src/seed.js
echo "[Backend ready]"

echo ""
echo "[2/4] Setting up frontend..."
cd ../frontend
[ ! -d node_modules ] && npm install
echo "[Frontend ready]"

echo ""
echo "[3/4] Starting servers..."
cd ../backend
node src/index.js &
BACKEND_PID=$!

cd ../frontend
npm run dev &
FRONTEND_PID=$!

echo ""
echo "============================================"
echo "  Open: http://localhost:5173"
echo "  Demo: admin@college.edu / admin123"
echo "============================================"
echo ""
echo "Press Ctrl+C to stop both servers."

trap "kill $BACKEND_PID $FRONTEND_PID" EXIT
wait
