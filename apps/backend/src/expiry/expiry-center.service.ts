import { Injectable, NotFoundException } from '@nestjs/common';
import { BatchStatus, ExpiryBucket } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { bucketForExpiry } from './expiry-bucket.util';

const BUCKET_LIST: ExpiryBucket[] = [
  ExpiryBucket.EXPIRED,
  ExpiryBucket.CRITICAL_7,
  ExpiryBucket.CRITICAL_30,
  ExpiryBucket.WARNING_60,
  ExpiryBucket.WARNING_90,
  ExpiryBucket.INFO_180,
  ExpiryBucket.HEALTHY,
];

@Injectable()
export class ExpiryCenterService {
  constructor(private prisma: PrismaService) {}

  private async batchesWithLiveBucket() {
    const batches = await this.prisma.productBatch.findMany({
      where: { status: { not: BatchStatus.BLOCKED } },
      include: { product: { select: { id: true, name: true, brand: true, imageUrl: true } } },
      orderBy: { expiryDate: 'asc' },
    });
    const now = new Date();
    return batches.map((b) => ({ ...b, liveBucket: bucketForExpiry(b.expiryDate, now) }));
  }

  async summary() {
    const batches = await this.batchesWithLiveBucket();
    const counts = Object.fromEntries(BUCKET_LIST.map((b) => [b, 0])) as Record<ExpiryBucket, number>;
    for (const b of batches) counts[b.liveBucket]++;
    return { counts, totalBatches: batches.length };
  }

  async listByBucket(bucket?: ExpiryBucket) {
    const batches = await this.batchesWithLiveBucket();
    const filtered = bucket ? batches.filter((b) => b.liveBucket === bucket) : batches;
    return filtered.map((b) => ({
      id: b.id,
      productId: b.productId,
      productName: b.product.name,
      brand: b.product.brand,
      imageUrl: b.product.imageUrl,
      batchNumber: b.batchNumber,
      expiryDate: b.expiryDate,
      bucket: b.liveBucket,
      status: b.status,
      warehouseRemainingQty: b.warehouseRemainingQty,
    }));
  }

  async batchDetail(id: string) {
    const batch = await this.prisma.productBatch.findUnique({ where: { id }, include: { product: true } });
    if (!batch) throw new NotFoundException('Batch not found');

    const holdings = await this.prisma.retailerBatchStock.findMany({
      where: { batchId: id, remainingQty: { gt: 0 } },
      include: { retailer: { select: { id: true, shopName: true, ownerName: true, city: true } } },
      orderBy: { remainingQty: 'desc' },
    });

    const agg = await this.prisma.retailerBatchStock.aggregate({
      where: { batchId: id },
      _sum: { receivedQty: true, claimedQty: true, returnedQty: true, transferredQty: true, writtenOffQty: true, damagedQty: true, remainingQty: true },
    });

    return {
      batch,
      liveBucket: bucketForExpiry(batch.expiryDate),
      distributedTotals: {
        receivedByRetailers: agg._sum.receivedQty ?? 0,
        claimed: agg._sum.claimedQty ?? 0,
        returned: agg._sum.returnedQty ?? 0,
        transferred: agg._sum.transferredQty ?? 0,
        writtenOff: agg._sum.writtenOffQty ?? 0,
        damaged: agg._sum.damagedQty ?? 0,
        remainingWithRetailers: agg._sum.remainingQty ?? 0,
        // "sold" is deliberately not tracked in this MVP — see EXPIRY_SYSTEM_DESIGN.md,
        // this platform has no visibility into a retailer's own point-of-sale activity.
      },
      retailersHolding: holdings.length,
      holdings: holdings.map((h) => ({
        retailerId: h.retailerId,
        shopName: h.retailer.shopName,
        ownerName: h.retailer.ownerName,
        city: h.retailer.city,
        remainingQty: h.remainingQty,
        receivedQty: h.receivedQty,
        claimedQty: h.claimedQty,
      })),
    };
  }
}
