import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { BatchStatus, Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { bucketForExpiry, statusForBucket } from './expiry-bucket.util';

type Tx = Prisma.TransactionClient;

export interface CreateBatchDto {
  batchNumber: string;
  manufacturingDate?: string;
  expiryDate: string;
  stockInDate?: string;
  receivedQty: number;
  costPricePerCase?: number;
  storageRequirements?: string;
}

export interface UpdateBatchDto {
  storageRequirements?: string;
  costPricePerCase?: number;
  status?: BatchStatus;
}

/** Only ACTIVE/NEAR_EXPIRY batches count as sellable warehouse stock. */
const SELLABLE_STATUSES: BatchStatus[] = [BatchStatus.ACTIVE, BatchStatus.NEAR_EXPIRY];

@Injectable()
export class ProductBatchesService {
  constructor(private prisma: PrismaService) {}

  adminList(productId: string) {
    return this.prisma.productBatch.findMany({ where: { productId }, orderBy: { expiryDate: 'asc' } });
  }

  async adminGet(id: string) {
    const batch = await this.prisma.productBatch.findUnique({ where: { id }, include: { product: true } });
    if (!batch) throw new NotFoundException('Batch not found');
    return batch;
  }

  async adminCreate(productId: string, dto: CreateBatchDto, adminId: string) {
    const product = await this.prisma.product.findUnique({ where: { id: productId } });
    if (!product) throw new NotFoundException('Product not found');
    if (!dto.batchNumber?.trim()) throw new BadRequestException('batchNumber is required');
    if (!dto.receivedQty || dto.receivedQty <= 0) throw new BadRequestException('receivedQty must be positive');

    const expiryDate = new Date(dto.expiryDate);
    if (Number.isNaN(expiryDate.getTime())) throw new BadRequestException('Invalid expiryDate');

    const bucket = bucketForExpiry(expiryDate);
    const status = statusForBucket(bucket, BatchStatus.ACTIVE);

    const batch = await this.prisma.$transaction(async (tx) => {
      const created = await tx.productBatch.create({
        data: {
          productId,
          batchNumber: dto.batchNumber.trim(),
          manufacturingDate: dto.manufacturingDate ? new Date(dto.manufacturingDate) : undefined,
          expiryDate,
          stockInDate: dto.stockInDate ? new Date(dto.stockInDate) : new Date(),
          receivedQty: dto.receivedQty,
          warehouseRemainingQty: dto.receivedQty,
          costPricePerCase: dto.costPricePerCase,
          storageRequirements: dto.storageRequirements,
          status,
          expiryBucket: bucket,
        },
      });
      await this.syncProductStockCases(productId, tx);
      return created;
    });

    await this.prisma.auditLog.create({
      data: {
        actorType: 'ADMIN',
        actorId: adminId,
        action: 'BATCH_CREATED',
        entityType: 'ProductBatch',
        entityId: batch.id,
        metadata: { productId, batchNumber: batch.batchNumber, receivedQty: dto.receivedQty, expiryDate: dto.expiryDate },
      },
    });

    return batch;
  }

  async adminUpdate(id: string, dto: UpdateBatchDto, adminId: string) {
    const existing = await this.prisma.productBatch.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('Batch not found');

    const updated = await this.prisma.$transaction(async (tx) => {
      const u = await tx.productBatch.update({
        where: { id },
        data: {
          storageRequirements: dto.storageRequirements,
          costPricePerCase: dto.costPricePerCase,
          status: dto.status,
        },
      });
      await this.syncProductStockCases(existing.productId, tx);
      return u;
    });

    await this.prisma.auditLog.create({
      data: { actorType: 'ADMIN', actorId: adminId, action: 'BATCH_UPDATED', entityType: 'ProductBatch', entityId: id, metadata: dto as any },
    });

    return updated;
  }

  /**
   * Product.stockCases predates batch tracking and several existing screens
   * (product cards, low-stock dashboard) still read it directly — rather
   * than touch all of them, this keeps it as a derived aggregate of
   * sellable batch stock, recomputed in the same transaction as any batch
   * mutation. Products with no batches never hit this and keep whatever
   * value admin sets on them directly (see EXPIRY_SYSTEM_DESIGN.md).
   */
  async syncProductStockCases(productId: string, tx: Tx | PrismaService) {
    const batchCount = await tx.productBatch.count({ where: { productId } });
    if (batchCount === 0) return;

    const agg = await tx.productBatch.aggregate({
      where: { productId, status: { in: SELLABLE_STATUSES } },
      _sum: { warehouseRemainingQty: true },
    });
    await tx.product.update({ where: { id: productId }, data: { stockCases: agg._sum.warehouseRemainingQty ?? 0 } });
  }
}
