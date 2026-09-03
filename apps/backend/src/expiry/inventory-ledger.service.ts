import { Injectable } from '@nestjs/common';
import { LedgerEntryType, Prisma } from '@prisma/client';

type Tx = Prisma.TransactionClient;

export interface RecordMovementParams {
  retailerId: string;
  batchId: string;
  productId: string;
  type: LedgerEntryType;
  /** Signed delta: positive credits the retailer's batch stock, negative debits it. */
  quantity: number;
  orderId?: string;
  claimId?: string;
  reason?: string;
  performedByAdminId?: string;
  businessDate?: Date;
}

const DELTA_FIELD_BY_TYPE: Partial<Record<LedgerEntryType, 'receivedQty' | 'claimedQty' | 'returnedQty' | 'transferredQty' | 'writtenOffQty' | 'damagedQty'>> = {
  RECEIVED: 'receivedQty',
  RETURN: 'returnedQty',
  TRANSFER: 'transferredQty',
  EXPIRED_CLAIM: 'claimedQty',
  DAMAGED: 'damagedQty',
  WRITE_OFF: 'writtenOffQty',
};

/**
 * Every retailer-side stock movement in the expiry system goes through here —
 * see EXPIRY_SYSTEM_DESIGN.md. Writes the immutable ledger row and updates
 * the RetailerBatchStock cache atomically (Postgres serializes concurrent
 * atomic increments on the same row on its own; callers that need to make a
 * *decision* based on the current remaining quantity — i.e. claim submission
 * — must take their own row lock first, see ExpiryClaimsService).
 *
 * Must be called inside an existing transaction, since every caller also
 * writes something else (an order, a claim decision) in the same unit of
 * work.
 */
@Injectable()
export class InventoryLedgerService {
  async recordMovement(tx: Tx, params: RecordMovementParams) {
    await tx.inventoryLedgerEntry.create({
      data: {
        retailerId: params.retailerId,
        batchId: params.batchId,
        productId: params.productId,
        type: params.type,
        quantity: params.quantity,
        orderId: params.orderId,
        claimId: params.claimId,
        reason: params.reason,
        performedByAdminId: params.performedByAdminId,
        businessDate: params.businessDate ?? new Date(),
      },
    });

    const magnitude = Math.abs(params.quantity);
    const cumulativeField = DELTA_FIELD_BY_TYPE[params.type];

    const existing = await tx.retailerBatchStock.findUnique({
      where: { retailerId_batchId: { retailerId: params.retailerId, batchId: params.batchId } },
    });

    if (!existing) {
      await tx.retailerBatchStock.create({
        data: {
          retailerId: params.retailerId,
          batchId: params.batchId,
          productId: params.productId,
          receivedQty: cumulativeField === 'receivedQty' ? magnitude : 0,
          claimedQty: cumulativeField === 'claimedQty' ? magnitude : 0,
          returnedQty: cumulativeField === 'returnedQty' ? magnitude : 0,
          transferredQty: cumulativeField === 'transferredQty' ? magnitude : 0,
          writtenOffQty: cumulativeField === 'writtenOffQty' ? magnitude : 0,
          damagedQty: cumulativeField === 'damagedQty' ? magnitude : 0,
          remainingQty: params.quantity,
          firstDeliveredAt: params.type === 'RECEIVED' ? new Date() : null,
          lastMovementAt: new Date(),
        },
      });
      return;
    }

    await tx.retailerBatchStock.update({
      where: { id: existing.id },
      data: {
        ...(cumulativeField ? { [cumulativeField]: { increment: magnitude } } : {}),
        remainingQty: { increment: params.quantity },
        firstDeliveredAt: !existing.firstDeliveredAt && params.type === 'RECEIVED' ? new Date() : undefined,
        lastMovementAt: new Date(),
      },
    });
  }
}
