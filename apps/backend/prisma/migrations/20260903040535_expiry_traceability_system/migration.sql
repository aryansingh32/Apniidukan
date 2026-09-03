-- CreateEnum
CREATE TYPE "BatchStatus" AS ENUM ('ACTIVE', 'NEAR_EXPIRY', 'EXPIRED', 'BLOCKED');

-- CreateEnum
CREATE TYPE "ExpiryBucket" AS ENUM ('HEALTHY', 'INFO_180', 'WARNING_90', 'WARNING_60', 'CRITICAL_30', 'CRITICAL_7', 'EXPIRED');

-- CreateEnum
CREATE TYPE "LedgerEntryType" AS ENUM ('RECEIVED', 'SALE', 'RETURN', 'TRANSFER', 'ADJUSTMENT', 'EXPIRED_CLAIM', 'DAMAGED', 'WRITE_OFF');

-- CreateEnum
CREATE TYPE "ExpiryClaimStatus" AS ENUM ('SUBMITTED', 'APPROVED', 'REJECTED', 'CLOSED');

-- CreateEnum
CREATE TYPE "ExpiryClaimRejectionReason" AS ENUM ('WRONG_BATCH', 'NOT_DELIVERED', 'QUANTITY_EXCEEDED', 'CLAIM_WINDOW', 'EVIDENCE', 'DUPLICATE', 'POLICY', 'SUSPICIOUS');

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "NotificationType" ADD VALUE 'BATCH_EXPIRING';
ALTER TYPE "NotificationType" ADD VALUE 'BATCH_EXPIRED';
ALTER TYPE "NotificationType" ADD VALUE 'EXPIRY_CLAIM_APPROVED';
ALTER TYPE "NotificationType" ADD VALUE 'EXPIRY_CLAIM_REJECTED';

-- CreateTable
CREATE TABLE "ProductBatch" (
    "id" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "batchNumber" TEXT NOT NULL,
    "manufacturingDate" TIMESTAMP(3),
    "expiryDate" TIMESTAMP(3) NOT NULL,
    "stockInDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "warehouseRemainingQty" INTEGER NOT NULL,
    "receivedQty" INTEGER NOT NULL,
    "costPricePerCase" DECIMAL(10,2),
    "storageRequirements" TEXT,
    "status" "BatchStatus" NOT NULL DEFAULT 'ACTIVE',
    "expiryBucket" "ExpiryBucket" NOT NULL DEFAULT 'HEALTHY',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProductBatch_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OrderItemBatchAllocation" (
    "id" TEXT NOT NULL,
    "orderItemId" TEXT NOT NULL,
    "batchId" TEXT NOT NULL,
    "caseQty" INTEGER NOT NULL,
    "batchNumberSnapshot" TEXT NOT NULL,
    "expiryDateSnapshot" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "OrderItemBatchAllocation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InventoryLedgerEntry" (
    "id" TEXT NOT NULL,
    "retailerId" TEXT NOT NULL,
    "batchId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "type" "LedgerEntryType" NOT NULL,
    "quantity" INTEGER NOT NULL,
    "orderId" TEXT,
    "claimId" TEXT,
    "reason" TEXT,
    "performedByAdminId" TEXT,
    "businessDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "InventoryLedgerEntry_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RetailerBatchStock" (
    "id" TEXT NOT NULL,
    "retailerId" TEXT NOT NULL,
    "batchId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "receivedQty" INTEGER NOT NULL DEFAULT 0,
    "claimedQty" INTEGER NOT NULL DEFAULT 0,
    "returnedQty" INTEGER NOT NULL DEFAULT 0,
    "transferredQty" INTEGER NOT NULL DEFAULT 0,
    "writtenOffQty" INTEGER NOT NULL DEFAULT 0,
    "damagedQty" INTEGER NOT NULL DEFAULT 0,
    "remainingQty" INTEGER NOT NULL DEFAULT 0,
    "firstDeliveredAt" TIMESTAMP(3),
    "lastMovementAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RetailerBatchStock_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ExpiryClaimPolicy" (
    "id" TEXT NOT NULL,
    "claimAllowed" BOOLEAN NOT NULL DEFAULT true,
    "minimumExpiryAtDeliveryDays" INTEGER NOT NULL DEFAULT 90,
    "claimWindowAfterExpiryDays" INTEGER NOT NULL DEFAULT 30,
    "claimWindowBeforeExpiryDays" INTEGER NOT NULL DEFAULT 0,
    "minimumRemainingShelfLifeDays" INTEGER NOT NULL DEFAULT 60,
    "requiresPhoto" BOOLEAN NOT NULL DEFAULT false,
    "autoApproveLimitAmount" DECIMAL(10,2) NOT NULL DEFAULT 5000,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ExpiryClaimPolicy_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ExpiryClaim" (
    "id" TEXT NOT NULL,
    "claimNumber" TEXT NOT NULL,
    "retailerId" TEXT NOT NULL,
    "status" "ExpiryClaimStatus" NOT NULL DEFAULT 'SUBMITTED',
    "flagged" BOOLEAN NOT NULL DEFAULT false,
    "reason" TEXT NOT NULL,
    "evidenceUrl" TEXT,
    "totalRequestedQty" INTEGER NOT NULL,
    "totalApprovedQty" INTEGER,
    "decisionNote" TEXT,
    "decidedByAdminId" TEXT,
    "decidedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ExpiryClaim_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ExpiryClaimItem" (
    "id" TEXT NOT NULL,
    "claimId" TEXT NOT NULL,
    "batchId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "requestedQty" INTEGER NOT NULL,
    "claimableQtyAtSubmission" INTEGER NOT NULL,
    "approvedQty" INTEGER,
    "unitCreditAmount" DECIMAL(10,2),
    "totalCreditAmount" DECIMAL(10,2),
    "rejectionReasonCode" "ExpiryClaimRejectionReason",

    CONSTRAINT "ExpiryClaimItem_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ProductBatch_expiryDate_idx" ON "ProductBatch"("expiryDate");

-- CreateIndex
CREATE UNIQUE INDEX "ProductBatch_productId_batchNumber_key" ON "ProductBatch"("productId", "batchNumber");

-- CreateIndex
CREATE INDEX "OrderItemBatchAllocation_orderItemId_idx" ON "OrderItemBatchAllocation"("orderItemId");

-- CreateIndex
CREATE INDEX "OrderItemBatchAllocation_batchId_idx" ON "OrderItemBatchAllocation"("batchId");

-- CreateIndex
CREATE INDEX "InventoryLedgerEntry_retailerId_batchId_idx" ON "InventoryLedgerEntry"("retailerId", "batchId");

-- CreateIndex
CREATE INDEX "InventoryLedgerEntry_batchId_idx" ON "InventoryLedgerEntry"("batchId");

-- CreateIndex
CREATE INDEX "RetailerBatchStock_productId_idx" ON "RetailerBatchStock"("productId");

-- CreateIndex
CREATE UNIQUE INDEX "RetailerBatchStock_retailerId_batchId_key" ON "RetailerBatchStock"("retailerId", "batchId");

-- CreateIndex
CREATE UNIQUE INDEX "ExpiryClaim_claimNumber_key" ON "ExpiryClaim"("claimNumber");

-- AddForeignKey
ALTER TABLE "ProductBatch" ADD CONSTRAINT "ProductBatch_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrderItemBatchAllocation" ADD CONSTRAINT "OrderItemBatchAllocation_orderItemId_fkey" FOREIGN KEY ("orderItemId") REFERENCES "OrderItem"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrderItemBatchAllocation" ADD CONSTRAINT "OrderItemBatchAllocation_batchId_fkey" FOREIGN KEY ("batchId") REFERENCES "ProductBatch"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InventoryLedgerEntry" ADD CONSTRAINT "InventoryLedgerEntry_retailerId_fkey" FOREIGN KEY ("retailerId") REFERENCES "Retailer"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InventoryLedgerEntry" ADD CONSTRAINT "InventoryLedgerEntry_batchId_fkey" FOREIGN KEY ("batchId") REFERENCES "ProductBatch"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RetailerBatchStock" ADD CONSTRAINT "RetailerBatchStock_retailerId_fkey" FOREIGN KEY ("retailerId") REFERENCES "Retailer"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RetailerBatchStock" ADD CONSTRAINT "RetailerBatchStock_batchId_fkey" FOREIGN KEY ("batchId") REFERENCES "ProductBatch"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExpiryClaim" ADD CONSTRAINT "ExpiryClaim_retailerId_fkey" FOREIGN KEY ("retailerId") REFERENCES "Retailer"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExpiryClaimItem" ADD CONSTRAINT "ExpiryClaimItem_claimId_fkey" FOREIGN KEY ("claimId") REFERENCES "ExpiryClaim"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExpiryClaimItem" ADD CONSTRAINT "ExpiryClaimItem_batchId_fkey" FOREIGN KEY ("batchId") REFERENCES "ProductBatch"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
