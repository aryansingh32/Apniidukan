# Expiry Traceability & Claim-Control System — Design

Design for turning "expiry" from a date field into a provenance chain: batch →
our order → our delivery → retailer inventory ledger → expiry claim, so a claim
can only succeed when the backend can *prove* the retailer actually holds
unclaimed stock of that exact batch, delivered by us, within policy.

This document reconciles the spec the business gave (25 sections, wholesaler
modeled as one of several suppliers) with what's actually built (one
wholesaler — this platform itself — selling to many retailer-shopkeepers, no
multi-supplier marketplace). Every deliberate simplification from the original
spec is called out explicitly, not silently dropped.

## Two decisions that shape everything below

1. **Single wholesaler = this platform.** There is no `Wholesaler` entity.
   "Wholesaler" in the original spec maps to *us* — the admin/business side of
   this app. Provenance is `ProductBatch → Order → Delivery → RetailerBatchStock`,
   not `ProductBatch → (any of N wholesalers) → Order → …`. Section 8's "same
   batch number from two different wholesalers" scenario narrows to "same
   batch number across two different orders from us," which the ledger design
   below still handles correctly (see "Same batch, multiple orders" below) —
   it just can never be a cross-supplier collision, because there's only one
   supplier.
2. **MVP scope** is the 7 pieces the spec itself recommended starting with:
   batch/lot tracking, delivery-level batch confirmation, retailer batch
   ledger, expiry notification engine, claim workflow, automatic
   claim-quantity validation, complete audit log. Risk scoring, photo/evidence
   verification infrastructure, FEFO-as-a-recommendation-engine (FEFO
   *allocation* is in MVP — see below), full FEFO recall management, and
   serialized/QR tracking are Phase 2, noted inline where relevant rather than
   silently omitted.

## The chain, concretely

```
ProductBatch (batch/lot, expiry, our warehouse qty)
      │  FEFO-allocated at checkout
      ▼
OrderItemBatchAllocation (which batches fulfilled this order line, immutable snapshot)
      │  order reaches DELIVERED with correct delivery OTP
      ▼
InventoryLedgerEntry (type=RECEIVED, retailer credited)  ──┐
      │                                                     │  every ledger write
      ▼                                                     │  updates this cache
RetailerBatchStock (cached remaining qty per retailer×batch)◄┘
      │  retailer submits a claim
      ▼
ExpiryClaim / ExpiryClaimItem (requestedQty ≤ claimable, enforced server-side)
      │  approved
      ▼
InventoryLedgerEntry (type=EXPIRED_CLAIM, decrements RetailerBatchStock)
```

The delivery-OTP system already built (retailer reads a code out to whoever
marks the order DELIVERED) *is* the "receiver/OTP confirmation" the spec asks
for in section 2 — I'm reusing it rather than building a parallel
confirmation mechanism. The moment an order clears `PATCH
/admin/orders/:id/status {status: DELIVERED, otp}`, that's simultaneously:
delivery timestamp (server `createdAt`), receiver (the retailer account the
order belongs to), and OTP confirmation (already enforced). That single event
now *also* credits the retailer's batch ledger.

## Schema

### `ProductBatch`

```
id                    uuid
productId             → Product
batchNumber           string            // "PCM-A4821"; unique per product
manufacturingDate     date?
expiryDate            date
stockInDate           datetime          // when WE received it into our warehouse
warehouseRemainingQty int               // OUR remaining stock of this batch (cases)
receivedQty           int               // original qty stocked in (immutable)
costPricePerCase      decimal?          // snapshot cost at stock-in, for claim credit calc
storageRequirements   string?
status                BatchStatus       // ACTIVE | NEAR_EXPIRY | EXPIRED | BLOCKED
expiryBucket          ExpiryBucket      // last notification bucket crossed (dedupe)
createdAt / updatedAt
@@unique([productId, batchNumber])
```

No `supplier`/`wholesaler` field — always us, per decision #1. No per-batch
barcode — `Product.barcode` (GTIN) already exists and is shared across all
batches of that product; batch/lot number is the thing that varies, which
`batchNumber` captures.

`warehouseRemainingQty` is *our* stock, separate from what any retailer
holds — see "Two inventories" below.

`status` is admin-settable (`BLOCKED` stops a batch being allocated at
checkout — e.g. a recall, see "Recall" below) and system-maintained for
`NEAR_EXPIRY`/`EXPIRED` based on `expiryDate` vs. today.

### `OrderItemBatchAllocation`

```
id                    uuid
orderItemId           → OrderItem
batchId               → ProductBatch
caseQty               int
batchNumberSnapshot   string     // immutable even if the batch record is later corrected
expiryDateSnapshot    date       // immutable
createdAt
```

Created at checkout by the FEFO allocator (below). This *is* the "qty
shipped" record from section 2 — one order item can span multiple rows if one
batch didn't have enough stock to cover the whole line.

### `InventoryLedgerEntry` — the immutable movement log

```
id                    uuid
retailerId            → Retailer
batchId               → ProductBatch
productId             → Product          // denormalized for query speed
type                  LedgerEntryType    // RECEIVED | SALE | RETURN | TRANSFER
                                          // | ADJUSTMENT | EXPIRED_CLAIM | DAMAGED
                                          // | WRITE_OFF
quantity              int                // signed delta: + increases retailer's
                                          // stock of this batch, − decreases it
orderId               string?            // set for RECEIVED
claimId               string?            // set for EXPIRED_CLAIM
reason                string?            // required for ADJUSTMENT / WRITE_OFF / DAMAGED
performedByAdminId    string?
businessDate          datetime           // the movement's effective date
createdAt             datetime           // true server event time — never editable,
                                          // never backend-settable to a caller-supplied value
```

Sign convention by type (enforced in the service layer, not a DB constraint,
to keep the migration simple):

| type | sign |
|---|---|
| RECEIVED, RETURN | always positive |
| SALE, TRANSFER, EXPIRED_CLAIM, DAMAGED, WRITE_OFF | always negative |
| ADJUSTMENT | either — this is the one deliberate manual-override type |

**`SALE` is schema-complete but not implemented in this MVP.** This app has
no point-of-sale feature — it has no visibility into what a retailer sells
across their own shop counter, and building POS integration is a separate
project. Crucially, **the claimable-quantity formula doesn't need it**: since
this platform only needs to prove what *it* shipped and hasn't already
accounted for, `claimable = RECEIVED − RETURNED − TRANSFERRED −
PREVIOUSLY_CLAIMED − WRITTEN_OFF − DAMAGED` is actually a *more conservative*
number than the spec's version (which nets out declared sales) — it never
trusts a retailer-reported sales figure at all. I'm treating this as a
favorable simplification, not a gap, and documenting it here so it isn't
mistaken for an oversight later.

### `RetailerBatchStock` — cached, always derived from the ledger

```
id                uuid
retailerId        → Retailer
batchId           → ProductBatch
productId         → Product
receivedQty       int   // cumulative
claimedQty        int   // cumulative EXPIRED_CLAIM
returnedQty       int   // cumulative
transferredQty    int   // cumulative
writtenOffQty     int   // cumulative
damagedQty        int   // cumulative
remainingQty      int   // received − claimed − returned − transferred − writtenOff − damaged
firstDeliveredAt  datetime?
lastMovementAt    datetime
@@unique([retailerId, batchId])
```

This exists purely so "what does retailer X currently hold of batch Y" is an
O(1) read instead of summing the ledger on every request. It is **never**
written to directly — every write happens inside the same DB transaction as
the `InventoryLedgerEntry` insert that caused it, using an upsert against the
`(retailerId, batchId)` unique key. If a bug ever makes them disagree, the
ledger wins; `RetailerBatchStock` is a rebuildable cache, not a second source
of truth.

### `ExpiryClaimPolicy` — single configurable row (per decision #1: one
wholesaler ⇒ one policy, not per-supplier)

```
id                            uuid  // singleton — one row, upserted
claimAllowed                  bool
minimumExpiryAtDeliveryDays   int   // gates checkout allocation, not just claims — see below
claimWindowAfterExpiryDays    int
claimWindowBeforeExpiryDays   int
minimumRemainingShelfLifeDays int
requiresPhoto                 bool
autoApproveLimitAmount        decimal
updatedAt
```

`requiresBatch`, `requiresDeliveryProof`, `requiresStockConfirmation` from the
spec aren't separate toggles here — they're structural guarantees, not
policy: a claim item *cannot* exist without a batch (foreign key), and a
batch can't have `RetailerBatchStock` without a delivered order (nothing
else writes `RECEIVED` entries). Making them booleans would just be a way to
turn off guarantees that shouldn't be optional.

### `ExpiryClaim` / `ExpiryClaimItem`

```
ExpiryClaim
  id, claimNumber (unique, "CLM-18421")
  retailerId
  status              ExpiryClaimStatus  // SUBMITTED | APPROVED | REJECTED | CLOSED
  flagged             bool               // hard rule tripped a soft flag — see below
  reason              string
  evidenceUrl         string?            // plain URL, same convention as payment screenshots —
                                          // no upload infra in this app yet
  totalRequestedQty / totalApprovedQty   int  // denormalized sums
  decisionNote        string?
  decidedByAdminId    string?
  decidedAt           datetime?
  createdAt / updatedAt

ExpiryClaimItem
  id, claimId, batchId, productId
  requestedQty              int
  claimableQtyAtSubmission  int      // snapshot — audit trail even if ledger moves later
  approvedQty               int?
  unitCreditAmount           decimal?  // defaults to batch.costPricePerCase
  totalCreditAmount          decimal?
  rejectionReasonCode  ExpiryClaimRejectionReason?  // WRONG_BATCH | NOT_DELIVERED |
                        // QUANTITY_EXCEEDED | CLAIM_WINDOW | EVIDENCE | DUPLICATE |
                        // POLICY | SUSPICIOUS
```

**Simplified from the spec's state machine.** The spec's
`DRAFT→SUBMITTED→SYSTEM_VALIDATION→VALID/FLAGGED→AUTO_REVIEW/MANUAL_REVIEW→
APPROVED→CREDIT/REFUND→CLOSED` is a lot of stored states for what's actually
a synchronous validation step. Validation happens *at* submit — a claim that
fails hard rules (over-claim, wrong batch, outside window) is rejected
immediately with a specific `rejectionReasonCode`, never stored as
`SUBMITTED`. A claim that passes hard rules but trips a *soft* signal (see
"Flagging" below) is stored as `SUBMITTED` with `flagged=true`, which routes
it to manual review instead of auto-approve — same outcome as the spec's
`FLAGGED`/`MANUAL_REVIEW`, fewer states to keep in sync. No standalone
`riskScore`/scoring engine in MVP (spec section 20) — `flagged` is set by a
small set of hard-coded rules for now; the full weighted scoring model is
Phase 2, and the schema doesn't need to change to add it later (it's an
additive `riskScore int` + more rules, not a redesign).

## The core invariant, enforced server-side

```
claimable(retailer, batch) =
    RetailerBatchStock.remainingQty
    − Σ requestedQty of that retailer's OTHER *pending* (SUBMITTED, not yet
      decided) claims against the same batch
```

The second term is what stops two simultaneous claim submissions each
passing validation against the same "remaining 10 units" before either is
decided (the double-submit race the spec's "duplicate claim protection"
section is really worried about). It's computed inside the same DB
transaction as the insert, using `SELECT ... FOR UPDATE` on the
`RetailerBatchStock` row (via `$queryRaw`, since Prisma has no native
row-lock API) so two concurrent requests serialize instead of both reading a
stale "10 available."

`requestedQty > claimable` for any item in a claim **hard-rejects the whole
claim** with a 400 naming the offending batch and its actual claimable
quantity — never silently caps it down. The frontend shows the claimable
number so the retailer doesn't hit this in practice, but the guarantee lives
in the backend, matching the spec's own "the backend must enforce" line.

Duplicate-claim fingerprint (spec section 12): `(retailerId, batchId)` with
status `SUBMITTED` is already a hard block via the invariant above (you
cannot re-request more than `remainingQty` minus what's already pending/
approved). A second claim for a batch that's already fully claimed simply
computes `claimable = 0` and is rejected at submission — no separate
fingerprint table needed, because the ledger itself is the fingerprint.

## Two inventories, not one

`Product.stockCases` already exists and several screens read it (product
cards' stock-status badge, the admin low-stock dashboard). That field
becomes a **derived aggregate**: sum of all its batches'
`warehouseRemainingQty`, recomputed and written back in the same transaction
whenever a batch is stocked in or allocated. Nothing downstream of it has to
change.

- `ProductBatch.warehouseRemainingQty` — **our** stock of that batch, sitting
  in our warehouse, decremented at checkout allocation.
- `RetailerBatchStock.remainingQty` — a **retailer's** stock of that batch,
  incremented only at OTP-verified delivery, decremented by claims/returns/
  adjustments.

These are deliberately separate rows so "how much of batch A is still
sellable by us" and "how much of batch A does retailer R still hold" never
get confused with each other.

**Products with zero batches keep working exactly as today** — checkout
falls back to decrementing `Product.stockCases` directly, no
`OrderItemBatchAllocation` rows get created, and those orders are simply
never eligible for an expiry claim (there's no batch to claim against). This
is the correct behavior, not a gap: it's exactly the spec's own
`requires_batch = true` rule, satisfied structurally rather than as a policy
toggle to check. New products can opt into batch tracking whenever the
business is ready to stock them in with lot numbers; nothing forces it on
day one.

## FEFO allocation at checkout

At checkout, for a product with batches, allocate `caseQty` against that
product's batches ordered by `expiryDate ASC` (earliest-expiring, sufliciently-
in-date stock first), splitting across batches if one doesn't have enough
`warehouseRemainingQty`. This directly implements section 16 (FEFO) *and*
section 19-A (product expiring before delivery) in one pass: a batch whose
`expiryDate` is closer than `ExpiryClaimPolicy.minimumExpiryAtDeliveryDays`
from now is skipped by the allocator entirely, so it can never ship in the
first place. If total eligible batch stock can't cover the requested
quantity, checkout fails with the same "insufficient stock" error shape it
already returns today — from the retailer's point of view, nothing new to
learn.

## Delivery confirmation → ledger credit

Extending `OrdersService.adminUpdateStatus`: when a status update lands on
`DELIVERED` and the delivery-OTP check passes (already enforced), the same
transaction now also, for every `OrderItemBatchAllocation` on that order,
inserts a `RECEIVED` ledger entry and upserts `RetailerBatchStock`. No new
confirmation step, no new screen — it rides the existing OTP gate, which
already captures timestamp (server `createdAt`), receiver (the order's
retailer), and explicit confirmation (the OTP itself, read out by the
customer).

*Not built in this pass* (spec section 2's photo/signature and "qty received
differs from qty shipped" reconciliation): this MVP assumes delivered qty =
shipped qty, since delivery is single-party-confirmed via OTP rather than a
two-party photo/signature exchange. A "retailer disputes what arrived"
flow is a natural Phase 2 extension of the same
`OrderItemBatchAllocation` record, not a schema change.

## Notification bucketing

```
enum ExpiryBucket { HEALTHY, INFO_180, WARNING_90, WARNING_60, CRITICAL_30, CRITICAL_7, EXPIRED }
```

A scheduled job (daily cron via `@nestjs/schedule`, plus a manual
`POST /admin/expiry/run-checks` for demo/testing) walks all non-`BLOCKED`
batches, computes the bucket their `expiryDate` currently falls into, and — 
only when a batch's bucket has gotten *more urgent* than the
`expiryBucket` value already stored on it (so nobody gets re-notified every
day they're still in the same bucket) — updates the stored bucket and
notifies every retailer currently holding `remainingQty > 0` of that batch
(join `RetailerBatchStock`), using the existing in-app `Notification` model
with two new types (`BATCH_EXPIRING`, `BATCH_EXPIRED`).

**Admin-side notification is the Expiry Center dashboard itself** (live
bucketed queries — sections 13/14/21 combined), not a stored
admin-notification row. There's no `AdminNotification` model in this app and
no push/email/SMS/WhatsApp provider configured anywhere in it; wiring one in
is infrastructure work independent of this feature, so admin "notification"
here means "the dashboard tells you the moment you open it," which is
honest about what's actually implemented rather than simulating a push
channel that doesn't exist.

## What's explicitly Phase 2 (not silently dropped)

- **Risk scoring** (section 20) — `flagged` boolean with a few hard rules
  ships now; the weighted point system is additive later.
- **Photo/evidence verification infrastructure** — `evidenceUrl` accepts a
  string today (matches how payment screenshots already work in this app);
  actual upload/review tooling is separate work.
- **Serialized/QR per-unit tracking** (section 25) — batch-level only for
  now; this app's whole catalog is ordinary FMCG case-goods, not high-value
  serialized items, so the ROI on per-unit tracking is low right now.
- **Recall management as a distinct workflow** — `ProductBatch.status =
  BLOCKED` already stops a batch from being allocated at checkout, which
  covers "pull this batch from sale immediately"; a recall's *retroactive*
  side (proactively crediting/collecting stock already delivered, bypassing
  normal claim-window policy) is real extra workflow, not built here.
  `RetailerBatchStock` already tells you exactly who holds a recalled batch
  and how much — the data a recall needs already exists.
- **Retailer-initiated correction requests / inventory-adjustment requests**
  (sections 17, 19-E) — retailers already have zero write access to batch,
  expiry, or inventory data anywhere in this app (structurally, not by
  policy), so the underlying guarantee ("retailer can't edit their own
  expiry/qty") is satisfied without extra work. `ADJUSTMENT` ledger entries
  exist and are admin-only for MVP; a retailer-facing
  "request a correction" form that routes to the same admin action is a
  small Phase 2 addition.
- **Damaged-goods claims as their own flow, and returns generally** — this
  app has no returns/credit-note feature at all yet (called out in
  `API_CONTRACT.md`'s existing "out of scope" list), so there's nothing for
  an expiry claim to be confused with today. The `DAMAGED` ledger type
  exists for admin write-offs; a retailer-facing damaged-goods claim is a
  sibling feature to build alongside Returns, not part of this pass.
- **Backdated-sale detection** (section 19-F) — moot until `SALE` entries
  exist (see above). `businessDate` vs `createdAt` is already tracked on
  every ledger entry so this is a filter to add later, not a schema change.

## API surface (implementation detail — see `API_CONTRACT.md` for the final,
authoritative version once built)

Retailer: `GET /expiry/my-stock` (the section-3 table), `GET
/expiry/claims`, `POST /expiry/claims`, `GET /expiry/claims/:id`.

Admin: batch stock-in as a sub-resource of products (`POST/GET
/admin/products/:id/batches`), `GET /admin/expiry/center` (bucketed
dashboard), `GET /admin/expiry/batches/:id` (drill-down with retailer
holdings), `GET/PATCH /admin/expiry/policy`, `GET /admin/expiry/claims`,
`POST /admin/expiry/claims/:id/approve`, `POST
/admin/expiry/claims/:id/reject`, `POST
/admin/expiry/inventory-adjustments`, `POST /admin/expiry/run-checks`.
