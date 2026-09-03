import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { BatchStatus, NotificationType } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';
import { bucketForExpiry, bucketRank, statusForBucket } from './expiry-bucket.util';

const BUCKET_LABEL: Record<string, string> = {
  INFO_180: 'expiring in about 6 months',
  WARNING_90: 'expiring in about 3 months',
  WARNING_60: 'expiring in about 2 months',
  CRITICAL_30: 'expiring within 30 days',
  CRITICAL_7: 'expiring within 7 days',
  EXPIRED: 'now expired',
};

/**
 * Walks every non-blocked batch, and whenever its computed bucket has
 * gotten *more urgent* than the bucket already stored on it, updates the
 * stored bucket/status and notifies every retailer currently holding stock
 * of it. See EXPIRY_SYSTEM_DESIGN.md — this is the "don't wait until
 * products are expired" notification engine (spec section 13), scoped to
 * the in-app Notification model this app already has (no push/SMS/WhatsApp
 * provider configured here — the admin-facing signal is the Expiry Center
 * dashboard's live bucket counts, not a stored notification).
 */
@Injectable()
export class ExpiryNotificationSweepService {
  private readonly logger = new Logger(ExpiryNotificationSweepService.name);

  constructor(
    private prisma: PrismaService,
    private notifications: NotificationsService,
  ) {}

  @Cron(CronExpression.EVERY_DAY_AT_6AM)
  async scheduledRun() {
    const result = await this.run();
    this.logger.log(`Expiry sweep: ${result.batchesUpdated} batch(es) crossed a bucket, ${result.notificationsSent} notification(s) sent.`);
  }

  async run() {
    const now = new Date();
    const batches = await this.prisma.productBatch.findMany({
      where: { status: { not: BatchStatus.BLOCKED } },
      include: { product: { select: { name: true } } },
    });

    let batchesUpdated = 0;
    let notificationsSent = 0;

    for (const batch of batches) {
      const liveBucket = bucketForExpiry(batch.expiryDate, now);
      if (bucketRank(liveBucket) <= bucketRank(batch.expiryBucket)) continue; // not more urgent than last time — skip

      const newStatus = statusForBucket(liveBucket, batch.status);
      await this.prisma.productBatch.update({
        where: { id: batch.id },
        data: { expiryBucket: liveBucket, status: newStatus },
      });
      batchesUpdated++;

      const holders = await this.prisma.retailerBatchStock.findMany({
        where: { batchId: batch.id, remainingQty: { gt: 0 } },
        select: { retailerId: true, remainingQty: true },
      });

      const label = BUCKET_LABEL[liveBucket] ?? liveBucket.toLowerCase();
      const type = liveBucket === 'EXPIRED' ? NotificationType.BATCH_EXPIRED : NotificationType.BATCH_EXPIRING;
      const title = liveBucket === 'EXPIRED' ? 'Stock Expired' : 'Stock Expiring Soon';

      for (const holder of holders) {
        await this.notifications.create(
          holder.retailerId,
          type,
          title,
          `${holder.remainingQty} case(s) of ${batch.product.name} (batch ${batch.batchNumber}) is ${label}. Check My Stock for claim eligibility.`,
        );
        notificationsSent++;
      }
    }

    return { batchesUpdated, notificationsSent, checkedAt: now };
  }
}
