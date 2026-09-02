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

## Running it locally

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
`http://10.0.2.2:3000/api`, a physical device needs your machine's LAN IP).

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
