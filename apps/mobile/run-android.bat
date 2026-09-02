@echo off
setlocal
cd /d "%~dp0"

if "%EXPO_PUBLIC_API_BASE_URL%"=="" set EXPO_PUBLIC_API_BASE_URL=http://10.0.2.2:3000/api

echo Using API base URL: %EXPO_PUBLIC_API_BASE_URL%
echo (edit this script, or set EXPO_PUBLIC_API_BASE_URL yourself, if your backend lives elsewhere)
echo.
echo Requires an Android emulator (Android Studio ^> Device Manager) running,
echo or a default AVD configured that Expo can auto-launch.
echo.

call npx expo start --android
