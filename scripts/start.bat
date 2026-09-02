@echo off
setlocal
cd /d "%~dp0.."

docker compose up -d --build
if errorlevel 1 (
  echo.
  echo docker compose failed to start. Is Docker Desktop running?
  exit /b 1
)

echo.
echo Apniidukan is starting up (first run can take a minute or two to build images and seed the database).
echo.
echo   Backend API:   http://localhost:3000/api
echo   Admin panel:   http://localhost:3001
echo.
echo   Demo admin login:    admin@apniidukan.com / Admin@123
echo   Demo retailer OTP:   any mobile number, code 123456
echo     (pre-approved: 9876543210, 9876543211, 9876543212)
echo.
echo Tail logs with:   docker compose logs -f backend
echo Stop everything:  scripts\stop.bat
echo.
pause
