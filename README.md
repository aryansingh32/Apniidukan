# Apniidukan — B2B FMCG Procurement Platform

A purchasing tool for shopkeepers/retailers to order from a distributor: see buying
rate vs MRP and profit margin on every product, tiered bulk pricing, running trade
schemes, a quick-reorder flow, and pay via UPI QR with admin-verified UTR — plus the
admin dashboard the distributor's own staff uses to approve retailers, manage the
catalog and schemes, verify payments, and run fulfillment.

This is a deep vertical slice of the full product spec: every flow below is real and
working end-to-end against a real database, rather than a broad set of shallow,
partially-wired screens. See "What's out of scope" for what was deliberately left for
a follow-up pass.

## Structure

```
apps/
  backend/   NestJS + Prisma + PostgreSQL — REST API, source of truth for all
             pricing/margin/scheme/GST calculation
  mobile/    Expo (React Native) — the retailer-only buyer app
  admin/     Next.js — the distributor's ops dashboard
API_CONTRACT.md   Full endpoint reference shared by all three apps
```

## Quick start (Docker) — backend + database + admin panel

Requires Docker Desktop (or any Docker engine) running. This builds and starts
Postgres, the backend API, and the admin dashboard together, seeded with demo data
automatically on first run.

```bash
scripts/start.sh      # macOS/Linux/WSL
scripts\start.bat     # Windows (double-click, or run from cmd/PowerShell)
```

- Backend API: http://localhost:3000/api
- Admin panel: http://localhost:3001
- Demo admin login: `admin@apniidukan.com` / `Admin@123`

Stop with `scripts/stop.sh` / `scripts\stop.bat` (data is kept in a Docker volume
across restarts). Add `--reset` to also wipe the database so the next start reseeds
from scratch. Tail logs with `docker compose logs -f backend`.

The mobile app is **not** part of this Docker setup (an Android emulator needs a GUI
and hardware acceleration Docker can't provide reliably) — see the next section.

## Mobile app — Android emulator

1. Get the backend running first, either via `scripts/start.sh`/`start.bat` above, or
   manually (`cd apps/backend && npm install && cp .env.example .env && npx prisma
   migrate dev && npm run prisma:seed && npm run start:dev`).
2. Install Android Studio, open **Device Manager**, create and start a virtual device
   (any recent Pixel + latest system image works).
3. From `apps/mobile`, run `npm install` once, then:
   ```bash
   ./run-android.sh     # macOS/Linux/WSL
   run-android.bat      # Windows
   ```
   This points the app at `http://10.0.2.2:3000/api` (the Android emulator's alias for
   your host machine's `localhost`, where the backend from step 1 is listening) and
   opens the app on the running emulator via Expo Go.
4. Login: any mobile number, OTP `123456`. Use a pre-approved number
   (`9876543210`/`9876543211`/`9876543212`) to skip the admin-approval wait, or
   register fresh and approve it from the admin panel's Retailers page.

Testing on a **physical device** instead: same steps, but set
`EXPO_PUBLIC_API_BASE_URL` to your computer's LAN IP (e.g.
`http://192.168.1.23:3000/api`) rather than `10.0.2.2`, and make sure the phone and
computer are on the same network.

## Mobile app — building an installable APK

**Option A — EAS Build (cloud, easiest):**

```bash
npm install -g eas-cli
eas login              # free Expo account
cd apps/mobile
./build-apk.sh          # or build-apk.bat on Windows
```

This uses the `preview` profile in `apps/mobile/eas.json`, which is pre-configured to
bake in `http://10.0.2.2:3000/api` — correct if you'll install the resulting APK on an
emulator on the *same machine* running the Docker backend. For a physical device or a
backend hosted elsewhere, edit `eas.json`'s `build.preview.env.EXPO_PUBLIC_API_BASE_URL`
first, then rebuild. EAS gives you a downloadable `.apk` link when the build finishes;
drag it onto a running emulator window to install, or `adb install <file>.apk`.

**Option B — local build with Gradle (no Expo account / no internet to EAS):**

```bash
cd apps/mobile
npx expo prebuild --platform android --clean
cd android
./gradlew assembleDebug          # macOS/Linux/WSL — or gradlew.bat on Windows
```

Produces `android/app/build/outputs/apk/debug/app-debug.apk`. Requires the Android
SDK + a JDK on your machine (the same tooling Android Studio's emulator needs).

## Running everything without Docker

### 1. Backend

```bash
cd apps/backend
npm install
cp .env.example .env   # edit DATABASE_URL etc. if your Postgres differs
npx prisma migrate dev
npm run prisma:seed
npm run start:dev      # http://localhost:3000/api
```

Demo admin login: `admin@apniidukan.com` / `Admin@123` (also `ops@apniidukan.com`,
`finance@apniidukan.com`, same password, different roles).

Demo retailer login (mobile app): any mobile number, OTP is always `123456` in this
dev build (no real SMS provider is wired up). Seeded approved retailers:
`9876543210`, `9876543211`, `9876543212`.

### 2. Mobile app (buyer)

```bash
cd apps/mobile
npm install
npx expo start
```

Set `EXPO_PUBLIC_API_BASE_URL` if the backend isn't reachable at the default
`http://localhost:3000/api` from your device/emulator (e.g. Android emulator needs
`http://10.0.2.2:3000/api`, a physical device needs your machine's LAN IP). See the
Docker/emulator sections above for the scripted version of this.

### 3. Admin dashboard

```bash
cd apps/admin
npm install
npm run dev   # http://localhost:3001 (or whatever port Next.js picks)
```

## Design

The mobile app's visual language (light lavender background, white rounded cards,
blue primary actions, large touch targets, minimal visual noise) follows the
reference mockups the product spec was built from — but with original B2B FMCG
content, not the reference's consumer-electronics branding. The admin dashboard is a
separate, desktop-optimized surface with its own clean/professional treatment.

## Core business rule: backend is the source of truth

Every price, bulk-pricing slab, scheme discount, free-goods calculation, GST amount,
and order total is computed server-side (see `apps/backend/src/pricing/pricing.service.ts`).
The frontends only render what the API returns — neither app recomputes pricing
client-side.

## What's out of scope in this pass

No returns/credit-notes, no GST invoice PDF generation, no inventory-batch/FEFO
tracking, no offline order drafts/sync, no notifications, no file-upload endpoints
(image/screenshot fields are plain URL strings). See the bottom of `API_CONTRACT.md`
for the full list — these are natural next iterations on top of this vertical slice,
not accidental gaps.
