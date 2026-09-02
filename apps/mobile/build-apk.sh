#!/bin/sh
# Builds an installable Android APK using EAS Build (Expo's cloud build
# service). Requires a free Expo account.
#
#   1. npm install -g eas-cli
#   2. eas login
#   3. ./build-apk.sh
#
# The "preview" profile in eas.json is pre-configured to point the built
# APK at http://10.0.2.2:3000/api — correct if you'll install the APK on an
# Android emulator running on the SAME machine as `scripts/start.sh`'s
# backend. For a physical device, or a backend hosted elsewhere, edit the
# "preview" profile's env.EXPO_PUBLIC_API_BASE_URL in eas.json first (use
# your machine's LAN IP for a physical device on the same Wi-Fi, or a real
# deployed URL).
#
# No Expo account / no internet to EAS? See the "Build locally with Gradle"
# section in the root README for an offline alternative (needs the Android
# SDK + Gradle, which you already have if you can run the emulator).
set -e
cd "$(dirname "$0")"

npx eas-cli build --platform android --profile preview
