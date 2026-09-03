import { BatchStatus, ExpiryBucket } from '@prisma/client';

const BUCKET_ORDER: ExpiryBucket[] = [
  ExpiryBucket.HEALTHY,
  ExpiryBucket.INFO_180,
  ExpiryBucket.WARNING_90,
  ExpiryBucket.WARNING_60,
  ExpiryBucket.CRITICAL_30,
  ExpiryBucket.CRITICAL_7,
  ExpiryBucket.EXPIRED,
];

export function daysUntil(expiryDate: Date, now: Date = new Date()): number {
  const msPerDay = 24 * 60 * 60 * 1000;
  return Math.ceil((expiryDate.getTime() - now.getTime()) / msPerDay);
}

export function bucketForExpiry(expiryDate: Date, now: Date = new Date()): ExpiryBucket {
  const days = daysUntil(expiryDate, now);
  if (days < 0) return ExpiryBucket.EXPIRED;
  if (days <= 7) return ExpiryBucket.CRITICAL_7;
  if (days <= 30) return ExpiryBucket.CRITICAL_30;
  if (days <= 60) return ExpiryBucket.WARNING_60;
  if (days <= 90) return ExpiryBucket.WARNING_90;
  if (days <= 180) return ExpiryBucket.INFO_180;
  return ExpiryBucket.HEALTHY;
}

export function bucketRank(bucket: ExpiryBucket): number {
  return BUCKET_ORDER.indexOf(bucket);
}

/** BLOCKED is a manual admin override that the automatic sweep never clears. */
export function statusForBucket(bucket: ExpiryBucket, currentStatus: BatchStatus): BatchStatus {
  if (currentStatus === BatchStatus.BLOCKED) return BatchStatus.BLOCKED;
  if (bucket === ExpiryBucket.EXPIRED) return BatchStatus.EXPIRED;
  if (bucket === ExpiryBucket.CRITICAL_30 || bucket === ExpiryBucket.CRITICAL_7) return BatchStatus.NEAR_EXPIRY;
  return BatchStatus.ACTIVE;
}
