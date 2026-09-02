# Apniidukan — Backend API Contract

Backend: NestJS + Prisma + PostgreSQL, running at `http://localhost:3000/api` in dev
(global prefix `/api`). Source: `apps/backend`. Start with `npm run start:dev` inside
`apps/backend` (requires local Postgres; `DATABASE_URL` in `apps/backend/.env`).
Seed data: `npm run prisma:seed` (inside `apps/backend`).

All money fields are decimal numbers (rupees, 2dp). All list/detail responses are the
raw Prisma-shaped JSON documented below — there is no envelope (`{data: ...}` etc.),
endpoints return the object or array directly. Errors return
`{ statusCode, message, error }` with a standard HTTP status code.

## Demo credentials

- Admin login: `admin@apniidukan.com` / `Admin@123` (also `ops@apniidukan.com`,
  `finance@apniidukan.com`, same password, roles OPERATIONS/FINANCE)
- Retailer OTP login: any mobile number. OTP is always `123456` in this dev
  environment (no real SMS provider wired up). Seeded approved retailers:
  `9876543210`, `9876543211`, `9876543212`. Seeded PENDING: `9876543213`. Seeded
  REJECTED: `9876543215`. Seeded SUSPENDED: `9876543216`.

## Auth

Two separate JWT spaces — a retailer token and an admin token are not interchangeable.

- `POST /auth/mobile/request-otp` `{ mobileNumber }` → `{ message, devNote, expiresInSeconds }`.
  `devNote` tells you the OTP is `123456` in dev.
- `POST /auth/mobile/verify-otp` `{ mobileNumber, code }` → `{ token, retailer, isNewRetailer, needsRegistration }`.
  `retailer.status` is one of `PENDING | APPROVED | REJECTED | SUSPENDED`.
  `needsRegistration` is true until `shopName` is set — route to the registration
  screen in that case, otherwise to the pending/approved screen based on `status`.
- `POST /admin/auth/login` `{ email, password }` → `{ token, admin: { id, email, name, role } }`.
  `role` is one of `ADMIN | OPERATIONS | FINANCE | SUPER_ADMIN`.

Send `Authorization: Bearer <token>` on every subsequent call. Retailer-scoped routes
403 with a message like `"Your account is pending. Marketplace access requires admin
approval."` if the retailer isn't `APPROVED` yet — the mobile app must treat 403 on any
catalog/cart/order call as "show the pending/rejected/suspended screen", not a generic
error. `GET/PATCH /retailers/me` work regardless of status (needed for registration
before approval).

## Retailer profile & registration

- `GET /retailers/me` → full retailer row (id, mobileNumber, ownerName, shopName,
  address, city, pincode, gstin, shopPhotoUrl, status, rejectionReason, createdAt).
- `PATCH /retailers/me` `{ ownerName, shopName, address, city, pincode, gstin?,
  shopPhotoUrl? }` → updated retailer. If the retailer was `REJECTED`, submitting again
  automatically resets status to `PENDING`.

## Catalog (all require retailer Bearer token + APPROVED status, except `/categories`
and `/banners` which are public reads)

- `GET /categories` → `[{ id, name, imageUrl, sortOrder, productCount }]`
- `GET /banners` → active banners only: `[{ id, title, subtitle, imageUrl, ctaLabel,
  ctaTarget, priority }]`. `ctaTarget` is a loose string convention used by the seed
  data: `"schemes"`, `"category:<Category Name>"`, `"scheme:<slug>"` — treat unknown
  values as "no-op, just show the banner".
- `GET /products?categoryId=&search=&brand=` → array of product cards, see shape below.
- `GET /products/:id` → single product card, same shape.
- `GET /products/barcode/:code` → array (barcode can theoretically match >1 product;
  in seed data it's always exactly one or zero — show a picker if >1, "Product not
  found" if empty).
- `GET /schemes` → active schemes only, each with `product` (full product row) attached
  when it's a `BUY_X_GET_Y_FREE` scheme.
- `GET /delivery-slots` → active slots: `[{ id, label, windowStart, windowEnd,
  cutoffTime }]` (`windowStart`/`windowEnd`/`cutoffTime` are `"HH:mm"` strings).

**Product card shape** (this is the margin/profit calculator data — the backend
computes everything, the frontend only renders it):

```json
{
  "id": "uuid",
  "name": "Lux Soap Soft Rose",
  "brand": "HUL",
  "categoryId": "uuid",
  "categoryName": "Soaps & Bath",
  "imageUrl": "https://...",
  "packSize": "100g",
  "unitsPerCase": 48,
  "mrpPerUnit": 50,
  "mrpTotalPerCase": 2400,
  "buyingPricePerCase": 2040,
  "yourRatePerCase": 2040,
  "profitPerCase": 360,
  "marginPercent": 15,
  "gstRate": 18,
  "hsnCode": "34011190",
  "sku": "SO-LUX-100",
  "barcode": "8901063130019",
  "status": "ACTIVE",
  "stockCases": 100,
  "nextSlab": { "minCases": 6, "pricePerCase": 1938 },
  "bulkPriceSlabs": [
    { "minCases": 1, "maxCases": 5, "pricePerCase": 2040 },
    { "minCases": 6, "maxCases": 20, "pricePerCase": 1938 },
    { "minCases": 21, "maxCases": 50, "pricePerCase": 1836 },
    { "minCases": 51, "maxCases": null, "pricePerCase": 1734 }
  ],
  "activeFreeGoodsScheme": {
    "id": "uuid", "title": "Lux Soap — Buy 10 Get 1 Free",
    "description": "...", "buyQty": 10, "freeQty": 1
  }
}
```

`yourRatePerCase`/`profitPerCase`/`marginPercent` here are computed at quantity=1
(i.e. the base case rate) for catalog browsing — the real, quantity-aware price comes
back from the cart endpoints below once items are added, and is the number that must
be shown/trusted on the cart, checkout and order screens.

## Cart (retailer, APPROVED only)

All cart endpoints return the **same full computed-cart shape** shown below, so the
mobile app can just re-render the cart screen after any mutation.

- `GET /cart`
- `POST /cart/items` `{ productId, caseQty }` — upsert
- `PATCH /cart/items/:productId` `{ caseQty }` — `caseQty <= 0` removes the line
- `DELETE /cart/items/:productId`
- `DELETE /cart` — clear
- `POST /cart/reorder/:orderId` — copies a past order's lines into the cart (same
  response shape, plus `unavailableProducts: string[]` naming any lines skipped
  because the product is no longer ACTIVE)

```json
{
  "cartId": "uuid",
  "itemCount": 2,
  "lines": [ {
    "productId": "uuid", "productName": "...", "brand": "...", "packSize": "...",
    "imageUrl": "...", "unitsPerCase": 48, "mrpPerUnit": 50,
    "caseQty": 10, "freeCaseQty": 1, "pricePerCase": 1938, "gstRate": 18,
    "lineSubtotal": 19380, "lineDiscountShare": 1550.4, "taxableValue": 17829.6,
    "lineGst": 3209.33, "lineTotal": 21038.93, "mrpTotal": 24000, "profitTotal": 4620,
    "marginPercent": 19.25,
    "appliedFreeGoodsScheme": { "id": "uuid", "title": "...", "freeCaseQty": 1 },
    "nextSlab": { "minCases": 21, "pricePerCase": 1836 }
  } ],
  "subtotal": 34360,
  "tradeDiscount": 2748.8,
  "schemeDiscount": 0,
  "gstAmount": 5690.02,
  "totalAmount": 37301.22,
  "totalMrpValue": 43200,
  "totalProfit": 8840,
  "appliedTradeScheme": { "id": "uuid", "title": "Big Order Bonus — Order 25,000+", "discountAmount": 2748.8 },
  "appliedFreeGoodsSchemes": [ { "id": "uuid", "title": "...", "productId": "uuid", "freeCaseQty": 1, "freeValue": 1938 } ],
  "upsell": { "schemeTitle": "Big Order Bonus — Order 25,000+", "amountNeeded": 850 }
}
```

`upsell` is non-null only when the cart is below the *next* order-value scheme's
threshold — render "Add ₹850 more to unlock Big Order Bonus". `pricePerCase` is
already the correct tiered/bulk price for the current `caseQty`. `tradeDiscount` comes
from the single best-matching `ORDER_VALUE_DISCOUNT` scheme (only one applies at a
time); `appliedFreeGoodsSchemes` can have many entries (one per product with a
qualifying `BUY_X_GET_Y_FREE` scheme).

## Checkout / Orders (retailer, APPROVED only)

- `POST /orders` `{ deliverySlotId, deliveryDate? }` (ISO date string, optional —
  defaults to tomorrow) → creates the order from the current cart using the exact same
  pricing engine as `/cart`, decrements stock, clears the cart, and creates an attached
  `UNPAID` payment record. Returns the full order (see shape below). 400 if the cart is
  empty, a line's product went INACTIVE, or requested `caseQty` exceeds `stockCases`.
- `GET /orders/quick-reorder` → `{ orderId, orderNumber, placedAt, items: [{ productId,
  name, brand, caseQty }] }` for the most recent non-cancelled order, or `null` if the
  retailer has never ordered. This is the Home screen "Quick Reorder" data — pair with
  `POST /cart/reorder/:orderId` for the "Repeat Order" button.
- `GET /orders?tab=active|completed|cancelled` (tab optional, omit for all)
- `GET /orders/:id` → order + `items[]` + `payment` + `deliverySlot` + `statusHistory[]`

**Order shape** (from checkout, and from `GET /orders/:id`):

```json
{
  "id": "uuid", "orderNumber": "B2B10011",
  "subtotal": 34360, "tradeDiscount": 2748.8, "schemeDiscount": 0,
  "gstAmount": 5690.02, "totalAmount": 37301.22,
  "appliedSchemes": { "tradeScheme": {...} , "freeGoodsSchemes": [...] },
  "deliverySlotId": "uuid", "deliveryDate": "2026-09-03T00:00:00.000Z",
  "status": "PAYMENT_PENDING",
  "items": [ { "id", "productId", "productNameSnapshot", "brandSnapshot",
    "packSizeSnapshot", "caseQty", "freeCaseQty", "pricePerCase", "mrpPerUnit",
    "unitsPerCase", "gstRate", "lineSubtotal", "lineDiscount", "lineTotal" } ],
  "payment": { "id", "amount", "upiId", "utr", "screenshotUrl", "status",
    "rejectionReason", "verifiedAt", "submittedAt" },
  "deliverySlot": { "id", "label", "windowStart", "windowEnd", "cutoffTime" },
  "statusHistory": [ { "status": "PAYMENT_PENDING", "note": "...", "createdAt": "..." } ],
  "createdAt": "..."
}
```

`status` (order) progresses:
`PAYMENT_PENDING → PAYMENT_VERIFICATION → CONFIRMED → PICKING → PACKED → DISPATCHED →
OUT_FOR_DELIVERY → DELIVERED`, or `CANCELLED` at any point (admin-only transition, no
retailer-facing cancel endpoint in this slice). "Active" tab = anything before
DELIVERED/CANCELLED. Render this list as the order tracking timeline.

`payment.status` progresses independently:
`UNPAID → UNDER_REVIEW → PAYMENT_APPROVED` (happy path) or `→ PAYMENT_REJECTED` (then
the retailer can resubmit a UTR, which puts it back to `UNDER_REVIEW`).

## Payment / UPI / UTR (retailer, APPROVED only)

- `GET /orders/:orderId/payment` → payment row plus `payeeName` and `upiDeepLink`
  (a ready-to-use `upi://pay?pa=...&pn=...&am=...&cu=INR&tn=<orderNumber>` string —
  render this as a QR code client-side, e.g. with `react-native-qrcode-svg`; also show
  `upiId` as copyable text).
- `POST /orders/:orderId/payment/utr` `{ utr, screenshotUrl? }` → submits/resubmits the
  UTR, moves `payment.status` to `UNDER_REVIEW` and `order.status` to
  `PAYMENT_VERIFICATION`. 400 if a UTR is already under review or approved for this
  order (i.e. don't let the user submit twice while pending). `screenshotUrl` is just a
  string field — there's no file upload endpoint in this slice; if you build a proof
  upload UI, stash it as a data URL or a placeholder path in this field.

## Admin endpoints

All under `Authorization: Bearer <admin token>`.

- `GET /admin/dashboard` → `{ totalOrders, todaysOrders, pendingPayments,
  pendingApprovals, revenue, pendingDispatches, lowStockProducts: Product[],
  totalRetailers }`
- Retailers: `GET /admin/retailers?status=&search=`, `GET /admin/retailers/:id` (includes
  last 20 orders + payments), `PATCH /admin/retailers/:id/approve`, `PATCH
  /admin/retailers/:id/reject` `{ reason }`, `PATCH /admin/retailers/:id/suspend`,
  `PATCH /admin/retailers/:id/reactivate`
- Categories: `GET/POST /admin/categories`, `PATCH/DELETE /admin/categories/:id`
- Products: `GET/POST /admin/products` (list returns all incl. INACTIVE), `GET/PATCH
  /admin/products/:id`, `DELETE /admin/products/:id` (soft — sets INACTIVE), `POST
  /admin/products/:id/slabs` `{ minCases, maxCases?, pricePerCase }`, `DELETE
  /admin/products/slabs/:slabId`
- Schemes: `GET/POST /admin/schemes`, `PATCH/DELETE /admin/schemes/:id`. Body:
  `{ title, description, type: "ORDER_VALUE_DISCOUNT"|"BUY_X_GET_Y_FREE",
  minOrderValue?, discountPercent?, flatDiscount?, productId?, buyQty?, freeQty?,
  startDate, endDate, active?, imageUrl?, maxUsagePerRetailer? }`
- Banners: `GET/POST /admin/banners`, `PATCH/DELETE /admin/banners/:id`. Body:
  `{ title, subtitle?, imageUrl, ctaLabel?, ctaTarget?, priority?, startDate?, endDate?,
  active? }`
- Delivery slots: `GET/POST /admin/delivery-slots`, `PATCH /admin/delivery-slots/:id`,
  `DELETE /admin/delivery-slots/:id` (soft — sets inactive)
- Orders: `GET /admin/orders?status=`, `GET /admin/orders/:id`, `PATCH
  /admin/orders/:id/status` `{ status, note? }` — moves the order through the
  operational pipeline (PICKING/PACKED/DISPATCHED/OUT_FOR_DELIVERY/DELIVERED/CANCELLED)
- Payments: `GET /admin/payments?status=UNDER_REVIEW` (includes `order.retailer`), `POST
  /admin/payments/:id/approve`, `POST /admin/payments/:id/reject` `{ reason }`

## Field/enum reference

- `RetailerStatus`: `PENDING | APPROVED | REJECTED | SUSPENDED`
- `AdminRole`: `ADMIN | OPERATIONS | FINANCE | SUPER_ADMIN`
- `ProductStatus`: `ACTIVE | OUT_OF_STOCK | INACTIVE`
- `OrderStatus`: `PAYMENT_PENDING | PAYMENT_VERIFICATION | CONFIRMED | PICKING | PACKED
  | DISPATCHED | OUT_FOR_DELIVERY | DELIVERED | CANCELLED`
- `PaymentStatus`: `UNPAID | UTR_SUBMITTED | UNDER_REVIEW | PAYMENT_APPROVED |
  PAYMENT_REJECTED` (this backend only ever sets `UNPAID`, `UNDER_REVIEW`,
  `PAYMENT_APPROVED`, `PAYMENT_REJECTED` — `UTR_SUBMITTED` exists in the schema but is
  currently unused, treat it the same as `UNDER_REVIEW` if you ever see it)
- `SchemeType`: `ORDER_VALUE_DISCOUNT | BUY_X_GET_Y_FREE`

## What's intentionally out of scope in this vertical slice

No returns/credit-notes endpoints, no notifications endpoints, no GST invoice PDF
endpoint, no inventory-batch/FEFO tracking, no offline-sync/idempotency-key endpoints,
no barcode-scanner-specific endpoint beyond `GET /products/barcode/:code`, no file
upload endpoint (image/screenshot fields are plain URL strings). Build the UI to
degrade gracefully (e.g. hide "Download Invoice" or show "Coming soon") rather than
calling endpoints that don't exist.
