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
  "requiresDeliveryOtp": true, "deliveryOtp": "6170", "deliveryOtpVerifiedAt": null,
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

### Delivery OTP verification

Like Amazon/Flipkart, delivery can require the customer to read out a one-time code to
whoever hands over the goods before the order is marked delivered. `deliveryOtp` is
generated (a random 4-digit string) the moment an order's payment is approved
(`Order.status` → `CONFIRMED`) and is included in every order response the retailer
can see from that point on — **show it prominently on the order tracking screen**
once `status` is `CONFIRMED` or later, with copy like "Share this OTP with the
delivery person: 6170", but only when `requiresDeliveryOtp` is `true`. Admin can opt
a specific order out of this (`requiresDeliveryOtp: false`) via
`PATCH /admin/orders/:id/delivery-otp-toggle`; when opted out, don't show any OTP UI
for that order. There is no separate driver app in this slice — whoever is operating
`PATCH /admin/orders/:id/status` to mark `DELIVERED` is the one entering the code the
customer reads out to them (see Admin endpoints below).

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

## Notifications (retailer, any status — including PENDING/REJECTED/SUSPENDED, since
account-status-change notices need to reach the retailer before they're APPROVED)

- `GET /notifications` → most recent 50, newest first: `[{ id, type, title, body,
  orderId, read, createdAt }]`. `orderId` is present (link to order detail) for
  order/payment-related notifications, `null` for account-status and broadcast ones.
- `GET /notifications/unread-count` → `{ count }` — poll this (or refetch on screen
  focus) to drive the Home bell icon's badge.
- `POST /notifications/:id/read` → marks one notification read.
- `POST /notifications/read-all` → marks all of the retailer's notifications read.

Notifications are created server-side automatically on: payment approved/rejected,
order status → DISPATCHED/OUT_FOR_DELIVERY/DELIVERED/CANCELLED, retailer account
approved/rejected/suspended, and a new active scheme being created (broadcast to all
APPROVED retailers). There is no push-notification delivery in this slice (no device
token registration, no OS-level push) — this is purely an in-app notification center;
build the bell icon/list against it accordingly, and treat it as something the user
checks when they open the app, not something that wakes their phone.

`NotificationType` enum: `ORDER_CONFIRMED | PAYMENT_VERIFIED | PAYMENT_REJECTED |
ORDER_DISPATCHED | OUT_FOR_DELIVERY | ORDER_DELIVERED | ORDER_CANCELLED | NEW_SCHEME |
ACCOUNT_APPROVED | ACCOUNT_REJECTED | ACCOUNT_SUSPENDED | BROADCAST` (`ORDER_CONFIRMED`
is reserved/currently unused — `PAYMENT_VERIFIED` covers that transition instead).

## Expiry traceability & claim system (retailer, APPROVED only)

Full design rationale in `EXPIRY_SYSTEM_DESIGN.md` at the repo root — read that
first for the *why*, this is just the *what*. Short version: a retailer can only
claim units the backend can prove were delivered to them and haven't already
been accounted for (sold back, returned, previously claimed, written off).

- `GET /expiry/my-stock` → the retailer's currently-held batches (remainingQty > 0
  only), each annotated with claim eligibility:
  ```json
  [{
    "batchId": "uuid", "productId": "uuid", "productName": "...", "brand": "...",
    "imageUrl": "...", "batchNumber": "GD-EXP", "expiryDate": "2026-08-24T...",
    "remainingQty": 3, "pendingRequestedQty": 0, "claimable": 3,
    "eligible": true, "ineligibleReason": null
  }]
  ```
  `claimable` already subtracts this retailer's other pending (`SUBMITTED`,
  undecided) claims against the same batch — it's the exact number safe to
  request right now. `eligible`/`ineligibleReason` explain *why* a batch with
  stock left isn't claimable yet (outside the claim window per policy, or
  nothing left after pending claims) — render this, don't just hide the row.
- `POST /expiry/claims` `{ reason, evidenceUrl?, items: [{ batchId, requestedQty }] }`
  → submits a claim. **400s the whole request** if any item's `requestedQty`
  exceeds that batch's current `claimable` — the error names the batch and the
  actual claimable number, e.g. `"Batch GD-EXP: requested 100 but only 3
  case(s) are currently claimable."` Never resubmit with a server-computed
  qty silently substituted; show the user the real number from `my-stock` and
  let them adjust. Returns the created claim; `status` is already `APPROVED`
  in the response if the total credit value was under the policy's
  auto-approve limit, otherwise `SUBMITTED` (awaiting admin review).
- `GET /expiry/claims` / `GET /expiry/claims/:id` → the retailer's own claims,
  each with `items[]` (including the nested `batch`).

**Claim shape:**
```json
{
  "id": "uuid", "claimNumber": "CLM-18003", "retailerId": "uuid",
  "status": "APPROVED", "flagged": false, "reason": "...", "evidenceUrl": null,
  "totalRequestedQty": 3, "totalApprovedQty": 3,
  "decisionNote": "Auto-approved: total credit within policy limit",
  "decidedByAdminId": null, "decidedAt": "...", "createdAt": "...",
  "items": [{
    "id": "uuid", "batchId": "uuid", "productId": "uuid", "requestedQty": 3,
    "claimableQtyAtSubmission": 3, "approvedQty": 3, "unitCreditAmount": 1080,
    "totalCreditAmount": 3240, "rejectionReasonCode": null, "batch": { "...": "ProductBatch row" }
  }]
}
```
`ExpiryClaimStatus`: `SUBMITTED | APPROVED | REJECTED | CLOSED` (`CLOSED` is
reserved for a future "credit note settled" step, not currently set anywhere).
`ExpiryClaimRejectionReason` (set per-item on reject): `WRONG_BATCH |
NOT_DELIVERED | QUANTITY_EXCEEDED | CLAIM_WINDOW | EVIDENCE | DUPLICATE |
POLICY | SUSPICIOUS`.

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
  /admin/orders/:id/status` `{ status, note?, otp? }` — moves the order through the
  operational pipeline (PICKING/PACKED/DISPATCHED/OUT_FOR_DELIVERY/DELIVERED/CANCELLED).
  Moving to `DELIVERED` on an order where `requiresDeliveryOtp` is `true` requires
  `otp` to exactly match the order's `deliveryOtp` — 400
  `"Incorrect delivery OTP..."` otherwise; when `requiresDeliveryOtp` is `false`, `otp`
  is ignored/not needed. `PATCH /admin/orders/:id/delivery-otp-toggle`
  `{ requiresDeliveryOtp }` opts a specific order in/out of that requirement (400 if
  the order is already DELIVERED/CANCELLED).
- Payments: `GET /admin/payments?status=UNDER_REVIEW` (includes `order.retailer`), `POST
  /admin/payments/:id/approve` (also generates the order's `deliveryOtp` and fires a
  `PAYMENT_VERIFIED` notification), `POST /admin/payments/:id/reject` `{ reason }`
  (fires a `PAYMENT_REJECTED` notification)
- Notifications: `POST /admin/notifications/broadcast` `{ title, body }` → sends a
  `BROADCAST`-type notification to every `APPROVED` retailer, returns `{ count }`.
- Batches: `GET/POST /admin/products/:productId/batches` — stock-in a batch/lot
  `{ batchNumber, expiryDate, receivedQty, manufacturingDate?, stockInDate?,
  costPricePerCase?, storageRequirements? }`; `GET /admin/batches/:id`, `PATCH
  /admin/batches/:id` `{ storageRequirements?, costPricePerCase?, status? }` —
  admin can correct these fields or set `status: "BLOCKED"` (e.g. a recall —
  stops the batch being FEFO-allocated at checkout immediately); retailers have
  no batch-editing endpoint anywhere, by design.
- Expiry Center: `GET /admin/expiry/center` → `{ counts: { EXPIRED, CRITICAL_7,
  CRITICAL_30, WARNING_60, WARNING_90, INFO_180, HEALTHY }, totalBatches }` (live,
  computed from each batch's `expiryDate` on every call — not the cached
  `expiryBucket` field, which only updates on the notification sweep). `GET
  /admin/expiry/batches?bucket=` (bucket optional) → flat list for that bucket.
  `GET /admin/expiry/batches/:id` → batch + `distributedTotals` (received/
  claimed/returned/transferred/writtenOff/damaged summed across all retailers,
  and `remainingWithRetailers` — deliberately no "sold" figure, this platform
  doesn't track retailers' own point-of-sale) + `holdings[]` (which retailers
  currently hold this batch and how much).
- Policy: `GET /admin/expiry/policy` / `PATCH /admin/expiry/policy` `{
  claimAllowed?, minimumExpiryAtDeliveryDays?, claimWindowAfterExpiryDays?,
  claimWindowBeforeExpiryDays?, minimumRemainingShelfLifeDays?, requiresPhoto?,
  autoApproveLimitAmount? }` — one row, applies platform-wide.
  `minimumRemainingShelfLifeDays` also gates checkout itself (see below), not
  just claims.
- Claims: `GET /admin/expiry/claims?status=`, `GET /admin/expiry/claims/:id`,
  `POST /admin/expiry/claims/:id/approve` `{ note? }` (credits the retailer's
  ledger with an `EXPIRED_CLAIM` movement and fires an
  `EXPIRY_CLAIM_APPROVED` notification), `POST
  /admin/expiry/claims/:id/reject` `{ rejectionReasonCode, note? }` (fires
  `EXPIRY_CLAIM_REJECTED`). 400 if the claim isn't `SUBMITTED` (already decided).
- `POST /admin/expiry/run-checks` → manually runs the expiry notification
  sweep (also runs automatically daily at 6am) — walks every batch, and for
  any batch whose bucket got more urgent since the last run, notifies every
  retailer currently holding stock of it (`BATCH_EXPIRING` / `BATCH_EXPIRED`).
  Returns `{ batchesUpdated, notificationsSent, checkedAt }`. Use this to
  demo the notification engine without waiting for the cron.

**Checkout is now batch-aware.** `POST /orders` FEFO-allocates each line
across a product's batches (earliest `expiryDate` first) when that product
has any batches at all — skipping batches with fewer than
`minimumRemainingShelfLifeDays` of shelf life remaining, and 400ing
(`"Only N case(s) of X have enough remaining shelf life to ship right
now..."`) if the eligible batches can't cover the requested quantity. A
product with zero batches ever created is unaffected — same behavior as
before this feature existed, and such orders simply can never back an expiry
claim (no batch, nothing to trace). `Order` and `GET /orders/:id` responses
are unchanged in shape; the allocation detail
(`OrderItemBatchAllocation` — which batch(es) fulfilled each line) isn't
currently surfaced on the order response, only on `/admin/expiry/batches/:id`'s
retailer holdings and the retailer's own `/expiry/my-stock`.

**Delivery already credits the ledger.** The existing delivery-OTP flow
(`PATCH /admin/orders/:id/status {status: "DELIVERED", otp}`) now also, in
the same transaction, credits the retailer's `RetailerBatchStock` for every
batch that order's items were allocated from — this is what makes the batch
show up in that retailer's `GET /expiry/my-stock` afterward. No new endpoint,
no behavior change to the request/response shape.

**ProductBatch shape:**
```json
{
  "id": "uuid", "productId": "uuid", "batchNumber": "PG-H1",
  "manufacturingDate": "...", "expiryDate": "2027-04-11T...",
  "stockInDate": "...", "warehouseRemainingQty": 125, "receivedQty": 150,
  "costPricePerCase": 780, "storageRequirements": null,
  "status": "ACTIVE", "expiryBucket": "HEALTHY"
}
```
`BatchStatus`: `ACTIVE | NEAR_EXPIRY | EXPIRED | BLOCKED` (system-maintained
from `expiryDate` by the notification sweep, except `BLOCKED` which is a
manual admin override the sweep never clears — set/unset it explicitly via
`PATCH /admin/batches/:id`). `ExpiryBucket`: `HEALTHY | INFO_180 | WARNING_90
| WARNING_60 | CRITICAL_30 | CRITICAL_7 | EXPIRED`.

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
- `NotificationType`: see the Notifications section above
- `BatchStatus`: `ACTIVE | NEAR_EXPIRY | EXPIRED | BLOCKED`
- `ExpiryBucket`: `HEALTHY | INFO_180 | WARNING_90 | WARNING_60 | CRITICAL_30 |
  CRITICAL_7 | EXPIRED`
- `LedgerEntryType`: `RECEIVED | SALE | RETURN | TRANSFER | ADJUSTMENT |
  EXPIRED_CLAIM | DAMAGED | WRITE_OFF` (`SALE` and `ADJUSTMENT` aren't
  produced by any endpoint yet — see EXPIRY_SYSTEM_DESIGN.md's Phase 2 notes)
- `ExpiryClaimStatus`: `SUBMITTED | APPROVED | REJECTED | CLOSED`
- `ExpiryClaimRejectionReason`: `WRONG_BATCH | NOT_DELIVERED | QUANTITY_EXCEEDED
  | CLAIM_WINDOW | EVIDENCE | DUPLICATE | POLICY | SUSPICIOUS`

## What's intentionally out of scope in this vertical slice

No returns/credit-notes endpoints, no GST invoice PDF endpoint, no
offline-sync/idempotency-key endpoints, no barcode-scanner-specific
endpoint beyond `GET /products/barcode/:code`, no file upload endpoint (image/screenshot
fields are plain URL strings), no OS-level push notifications (in-app notification
center only — see Notifications above), no separate driver app (delivery OTP entry
happens through the admin order-status endpoint). Build the UI to degrade gracefully
(e.g. hide "Download Invoice" or show "Coming soon") rather than calling endpoints
that don't exist.
