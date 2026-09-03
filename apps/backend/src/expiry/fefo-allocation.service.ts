import { BadRequestException, Injectable } from '@nestjs/common';
import { BatchStatus, Prisma } from '@prisma/client';

type Tx = Prisma.TransactionClient;

export interface BatchAllocationPlan {
  batchId: string;
  caseQty: number;
  batchNumberSnapshot: string;
  expiryDateSnapshot: Date;
}

const SELLABLE_STATUSES: BatchStatus[] = [BatchStatus.ACTIVE, BatchStatus.NEAR_EXPIRY];

/**
 * First-Expiry-First-Out allocation at checkout — see EXPIRY_SYSTEM_DESIGN.md.
 * Returns `null` when the product has no batches at all (the legacy,
 * non-batch-tracked path — checkout falls back to decrementing
 * Product.stockCases directly, same as before this feature existed).
 * Throws when the product *is* batch-tracked but doesn't have enough
 * in-date, sellable stock to cover the request — this must never silently
 * fall back to the legacy path, or a batch-tracked product could ship
 * without provenance.
 */
@Injectable()
export class FefoAllocationService {
  async allocateForLine(tx: Tx, productId: string, totalQty: number, minShelfLifeDays: number, productName: string): Promise<BatchAllocationPlan[] | null> {
    const hasAnyBatches = (await tx.productBatch.count({ where: { productId } })) > 0;
    if (!hasAnyBatches) return null;

    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() + minShelfLifeDays);

    const eligibleBatches = await tx.productBatch.findMany({
      where: {
        productId,
        status: { in: SELLABLE_STATUSES },
        warehouseRemainingQty: { gt: 0 },
        expiryDate: { gte: cutoff },
      },
      orderBy: { expiryDate: 'asc' },
    });

    let remaining = totalQty;
    const plan: BatchAllocationPlan[] = [];
    for (const batch of eligibleBatches) {
      if (remaining <= 0) break;
      const take = Math.min(remaining, batch.warehouseRemainingQty);
      plan.push({ batchId: batch.id, caseQty: take, batchNumberSnapshot: batch.batchNumber, expiryDateSnapshot: batch.expiryDate });
      remaining -= take;
    }

    if (remaining > 0) {
      const available = totalQty - remaining;
      throw new BadRequestException(
        `Only ${available} case(s) of ${productName} have enough remaining shelf life to ship right now (need ${totalQty}).`,
      );
    }

    for (const allocation of plan) {
      await tx.productBatch.update({
        where: { id: allocation.batchId },
        data: { warehouseRemainingQty: { decrement: allocation.caseQty } },
      });
    }

    return plan;
  }
}
