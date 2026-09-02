#!/bin/sh
# Starts the Expo dev server and opens the app on a running Android
# emulator (or auto-launches your default AVD if Android Studio's tooling
# is on PATH). Requires the backend to be reachable at 10.0.2.2:3000 from
# the emulator, i.e. running on this same host (see scripts/start.sh at the
# repo root, or `npm run start:dev` inside apps/backend).
set -e
cd "$(dirname "$0")"

export EXPO_PUBLIC_API_BASE_URL="${EXPO_PUBLIC_API_BASE_URL:-http://10.0.2.2:3000/api}"

echo "Using API base URL: $EXPO_PUBLIC_API_BASE_URL"
echo "(edit this script, or set EXPO_PUBLIC_API_BASE_URL yourself, if your backend lives elsewhere)"
echo ""

npx expo start --android
