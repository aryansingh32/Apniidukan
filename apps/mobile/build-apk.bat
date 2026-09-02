@echo off
setlocal
cd /d "%~dp0"

echo Builds an installable Android APK using EAS Build (Expo's cloud build service).
echo Requires a free Expo account: npm install -g eas-cli, then eas login.
echo.
echo The "preview" profile in eas.json points the built APK at 10.0.2.2:3000/api,
echo which is correct if you'll install it on an emulator on THIS machine, next
echo to scripts\start.bat's backend. For a physical device or a remote backend,
echo edit eas.json's preview.env.EXPO_PUBLIC_API_BASE_URL first.
echo.

call npx eas-cli build --platform android --profile preview
