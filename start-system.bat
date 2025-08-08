@echo off
echo Starting QR Attendance System...
echo.
echo Starting Backend Server...
start "Backend Server" cmd /k "npm run dev"
echo.
echo Starting Frontend Server...
start "Frontend Server" cmd /k "cd frontend && npm start"
echo.
echo System is starting up...
echo Backend: http://localhost:5000
echo Frontend: http://localhost:3000
echo.
pause 