@echo off
echo ============================================
echo   RoomBook - College Booking System
echo ============================================
echo.

:: Check for Node.js
where node >nul 2>&1
if %errorlevel% neq 0 (
  echo [ERROR] Node.js is not installed or not in PATH.
  echo Download from: https://nodejs.org  (LTS version)
  pause
  exit /b 1
)

echo [1/4] Setting up backend...
cd backend
if not exist .env (
  copy .env.example .env
  echo   Created .env from template
)
if not exist node_modules (
  echo   Installing backend packages...
  call npm install
)
if not exist data\booking.db (
  echo   Seeding database with demo data...
  call node src/seed.js
)
echo [Backend ready]

echo.
echo [2/4] Setting up frontend...
cd ..\frontend
if not exist node_modules (
  echo   Installing frontend packages...
  call npm install
)
echo [Frontend ready]

echo.
echo [3/4] Starting backend server...
cd ..\backend
start "RoomBook Backend" cmd /k "node src/index.js"

echo [4/4] Starting frontend dev server...
cd ..\frontend
start "RoomBook Frontend" cmd /k "npm run dev"

echo.
echo ============================================
echo   RoomBook is starting up!
echo   Open: http://localhost:5173
echo.
echo   Demo logins:
echo   admin@college.edu     / admin123
echo   priya@college.edu     / priya123  (In-charge)
echo   rahul@college.edu     / rahul123  (Faculty)
echo   arjun@college.edu     / arjun123  (Club Coordinator)
echo ============================================
echo.
timeout /t 3
start http://localhost:5173
