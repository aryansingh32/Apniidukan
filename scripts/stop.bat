@echo off
setlocal
cd /d "%~dp0.."

if "%1"=="--reset" (
  docker compose down -v
  echo Stopped and wiped the database volume. Next start.bat will reseed from scratch.
) else (
  docker compose down
  echo Stopped. Database data is preserved -- run scripts\start.bat to resume.
)
pause
