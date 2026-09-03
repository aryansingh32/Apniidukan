import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { ExpiryClaimRejectionReason, ExpiryClaimStatus, LedgerEntryType, NotificationType, Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';
import { InventoryLedgerService } from './inventory-ledger.service';
import { ExpiryPolicyService } from './expiry-policy.service';
import { daysUntil } from './expiry-bucket.util';

type Tx = Prisma.TransactionClient;

export interface SubmitClaimItemDto {
  batchId: string;
  requestedQty: number;
}

export interface SubmitClaimDto {
  reason: string;
  evidenceUrl?: string;
  items: SubmitClaimItemDto[];
}

interface DecisionResult {
  claim: Prisma.ExpiryClaimGetPayload<{ include: { items: true } }>;
  outcome: 'APPROVED' | 'REJECTED';
  note: string | null;
}

@Injectable()
export class ExpiryClaimsService {
  constructor(
    private prisma: PrismaService,
    private ledger: InventoryLedgerService,
    private policy: ExpiryPolicyService,
    private notifications: NotificationsService,
  ) {}

  /**
   * The retailer's currently-held batches, each annotated with whether it's
   * claimable right now and why not if not — this is the section-3 "Your
   * Stock" table. A batch never appears here at all if remainingQty is 0
   * (nothing left to claim) or the retailer never received it (no
   * RetailerBatchStock row — the ledger is the only thing that can create one).
   */
  async myStock(retailerId: string) {
    const policyRow = await this.policy.get();
    const stocks = await this.prisma.retailerBatchStock.findMany({
      where: { retailerId, remainingQty: { gt: 0 } },
      include: { batch: { include: { product: true } } },
      orderBy: { batch: { expiryDate: 'asc' } },
    });

    const results = [];
    for (const stock of stocks) {
      const pendingRequestedQty = await this.pendingRequestedQtyExcluding(this.prisma, retailerId, stock.batchId);
      const claimable = Math.max(0, stock.remainingQty - pendingRequestedQty);
      const eligibility = this.evaluateEligibility(stock.batch.expiryDate, policyRow, claimable);

      results.push({
        batchId: stock.batchId,
        productId: stock.productId,
        productName: stock.batch.product.name,
        brand: stock.batch.product.brand,
        imageUrl: stock.batch.product.imageUrl,
        batchNumber: stock.batch.batchNumber,
        expiryDate: stock.batch.expiryDate,
        remainingQty: stock.remainingQty,
        pendingRequestedQty,
        claimable: eligibility.eligible ? claimable : 0,
        eligible: eligibility.eligible,
        ineligibleReason: eligibility.reason,
      });
    }
    return results;
  }

  private evaluateEligibility(
    expiryDate: Date,
    policyRow: { claimAllowed: boolean; claimWindowBeforeExpiryDays: number; claimWindowAfterExpiryDays: number },
    claimable: number,
  ): { eligible: boolean; reason?: string } {
    if (!policyRow.claimAllowed) return { eligible: false, reason: 'Expiry claims are currently disabled' };
    if (claimable <= 0) return { eligible: false, reason: 'Nothing left to claim on this batch' };

    const days = daysUntil(expiryDate); // negative once past expiry
    if (days > policyRow.claimWindowBeforeExpiryDays) {
      return { eligible: false, reason: `Not yet in the claim window (opens in ${days - policyRow.claimWindowBeforeExpiryDays} day(s))` };
    }
    if (days < -policyRow.claimWindowAfterExpiryDays) {
      return { eligible: false, reason: `Claim window closed ${Math.abs(days) - policyRow.claimWindowAfterExpiryDays} day(s) ago` };
    }
    return { eligible: true };
  }

  private async pendingRequestedQtyExcluding(client: Tx | PrismaService, retailerId: string, batchId: string) {
    const pending = await client.expiryClaimItem.findMany({
      where: { batchId, claim: { retailerId, status: ExpiryClaimStatus.SUBMITTED } },
      select: { requestedQty: true },
    });
    return pending.reduce((sum, i) => sum + i.requestedQty, 0);
  }

  private async generateClaimNumber(): Promise<string> {
    const count = await this.prisma.expiryClaim.count();
    return `CLM-${(18001 + count).toString()}`;
  }

  async submit(retailerId: string, dto: SubmitClaimDto) {
    if (!dto.reason?.trim()) throw new BadRequestException('A reason is required');
    if (!dto.items || dto.items.length === 0) throw new BadRequestException('At least one batch is required');

    const policyRow = await this.policy.get();
    if (!policyRow.claimAllowed) throw new BadRequestException('Expiry claims are currently disabled');
    if (policyRow.requiresPhoto && !dto.evidenceUrl) throw new BadRequestException('Photo evidence is required for a claim');

    const claimNumber = await this.generateClaimNumber();

    const { claim, autoApprove } = await this.prisma.$transaction(async (tx) => {
      const itemsToCreate: {
        batchId: string;
        productId: string;
        requestedQty: number;
        claimableQtyAtSubmission: number;
        unitCreditAmount: number | null;
      }[] = [];
      let totalRequestedQty = 0;
      let totalCreditAmount = 0;

      for (const item of dto.items) {
        if (!item.requestedQty || item.requestedQty <= 0) {
          throw new BadRequestException('requestedQty must be positive for every item');
        }

        // Row-lock this retailer's stock of this batch so two concurrent
        // claim submissions against the same batch can't both read the same
        // "remaining" number before either has committed — see
        // EXPIRY_SYSTEM_DESIGN.md, this is the crux of the whole
        // duplicate/over-claim protection.
        const locked = await tx.$queryRaw<{ id: string; remainingQty: number; batchId: string; productId: string }[]>`
          SELECT id, "remainingQty", "batchId", "productId" FROM "RetailerBatchStock"
          WHERE "retailerId" = ${retailerId} AND "batchId" = ${item.batchId}
          FOR UPDATE
        `;
        if (locked.length === 0) {
          throw new BadRequestException(`No delivered stock of batch ${item.batchId} was found for this retailer — it cannot be claimed.`);
        }
        const stockRow = locked[0];

        const batch = await tx.productBatch.findUnique({ where: { id: item.batchId } });
        if (!batch) throw new NotFoundException('Batch not found');

        const pending = await this.pendingRequestedQtyExcluding(tx, retailerId, item.batchId);
        const claimable = Math.max(0, stockRow.remainingQty - pending);
        const eligibility = this.evaluateEligibility(batch.expiryDate, policyRow, claimable);

        if (!eligibility.eligible) {
          throw new BadRequestException(`Batch ${batch.batchNumber}: ${eligibility.reason}`);
        }
        if (item.requestedQty > claimable) {
          throw new BadRequestException(
            `Batch ${batch.batchNumber}: requested ${item.requestedQty} but only ${claimable} case(s) are currently claimable.`,
          );
        }

        const unitCreditAmount = batch.costPricePerCase ? Number(batch.costPricePerCase) : null;
        totalRequestedQty += item.requestedQty;
        if (unitCreditAmount != null) totalCreditAmount += unitCreditAmount * item.requestedQty;

        itemsToCreate.push({
          batchId: item.batchId,
          productId: stockRow.productId,
          requestedQty: item.requestedQty,
          claimableQtyAtSubmission: claimable,
          unitCreditAmount,
        });
      }

      const createdClaim = await tx.expiryClaim.create({
        data: {
          claimNumber,
          retailerId,
          reason: dto.reason.trim(),
          evidenceUrl: dto.evidenceUrl,
          totalRequestedQty,
          status: ExpiryClaimStatus.SUBMITTED,
          items: {
            create: itemsToCreate.map((i) => ({
              batchId: i.batchId,
              productId: i.productId,
              requestedQty: i.requestedQty,
              claimableQtyAtSubmission: i.claimableQtyAtSubmission,
              unitCreditAmount: i.unitCreditAmount ?? undefined,
              totalCreditAmount: i.unitCreditAmount != null ? i.unitCreditAmount * i.requestedQty : undefined,
            })),
          },
        },
        include: { items: true },
      });

      await tx.auditLog.create({
        data: {
          actorType: 'RETAILER',
          actorId: retailerId,
          action: 'EXPIRY_CLAIM_SUBMITTED',
          entityType: 'ExpiryClaim',
          entityId: createdClaim.id,
          metadata: { claimNumber, totalRequestedQty },
        },
      });

      const shouldAutoApprove = totalCreditAmount > 0 && totalCreditAmount <= Number(policyRow.autoApproveLimitAmount);
      if (shouldAutoApprove) {
        const decided = await this.applyDecision(tx, createdClaim.id, 'APPROVED', null, 'Auto-approved: total credit within policy limit', null);
        return { claim: decided.claim, autoApprove: true };
      }

      return { claim: createdClaim, autoApprove: false };
    });

    if (autoApprove) {
      await this.notifyDecision(claim, 'APPROVED', 'Auto-approved: total credit within policy limit');
    }

    return claim;
  }

  async retailerList(retailerId: string) {
    return this.prisma.expiryClaim.findMany({
      where: { retailerId },
      include: { items: { include: { batch: true } } },
      orderBy: { createdAt: 'desc' },
    });
  }

  async retailerGet(retailerId: string, id: string) {
    const claim = await this.prisma.expiryClaim.findFirst({
      where: { id, retailerId },
      include: { items: { include: { batch: true } } },
    });
    if (!claim) throw new NotFoundException('Claim not found');
    return claim;
  }

  async adminList(status?: ExpiryClaimStatus) {
    return this.prisma.expiryClaim.findMany({
      where: status ? { status } : {},
      include: { items: { include: { batch: true } }, retailer: true },
      orderBy: { createdAt: 'desc' },
    });
  }

  async adminGet(id: string) {
    const claim = await this.prisma.expiryClaim.findUnique({
      where: { id },
      include: { items: { include: { batch: true } }, retailer: true },
    });
    if (!claim) throw new NotFoundException('Claim not found');
    return claim;
  }

  async adminApprove(id: string, adminId: string, note?: string) {
    const { claim } = await this.prisma.$transaction((tx) => this.applyDecision(tx, id, 'APPROVED', adminId, note ?? null, null));
    await this.notifyDecision(claim, 'APPROVED', note ?? null);
    return claim;
  }

  async adminReject(id: string, adminId: string, reasonCode: ExpiryClaimRejectionReason, note?: string) {
    if (!reasonCode) throw new BadRequestException('rejectionReasonCode is required');
    const { claim } = await this.prisma.$transaction((tx) => this.applyDecision(tx, id, 'REJECTED', adminId, note ?? null, reasonCode));
    await this.notifyDecision(claim, 'REJECTED', note ?? null);
    return claim;
  }

  private async notifyDecision(claim: DecisionResult['claim'], outcome: 'APPROVED' | 'REJECTED', note: string | null) {
    await this.notifications.create(
      claim.retailerId,
      outcome === 'APPROVED' ? NotificationType.EXPIRY_CLAIM_APPROVED : NotificationType.EXPIRY_CLAIM_REJECTED,
      outcome === 'APPROVED' ? 'Expiry Claim Approved' : 'Expiry Claim Rejected',
      outcome === 'APPROVED'
        ? `Your claim ${claim.claimNumber} for ${claim.totalRequestedQty} case(s) has been approved.`
        : `Your claim ${claim.claimNumber} was rejected${note ? `: ${note}` : '.'}`,
    );
  }

  /** Pure tx-scoped mutation — never fires the notification itself, callers do that once their transaction has committed. */
  private async applyDecision(
    tx: Tx,
    claimId: string,
    outcome: 'APPROVED' | 'REJECTED',
    adminId: string | null,
    note: string | null,
    rejectionReasonCode: ExpiryClaimRejectionReason | null,
  ): Promise<DecisionResult> {
    const claim = await tx.expiryClaim.findUnique({ where: { id: claimId }, include: { items: true } });
    if (!claim) throw new NotFoundException('Claim not found');
    if (claim.status !== ExpiryClaimStatus.SUBMITTED) {
      throw new BadRequestException(`Claim is already ${claim.status.toLowerCase()}`);
    }

    if (outcome === 'APPROVED') {
      for (const item of claim.items) {
        await tx.expiryClaimItem.update({ where: { id: item.id }, data: { approvedQty: item.requestedQty } });
        await this.ledger.recordMovement(tx, {
          retailerId: claim.retailerId,
          batchId: item.batchId,
          productId: item.productId,
          type: LedgerEntryType.EXPIRED_CLAIM,
          quantity: -item.requestedQty,
          claimId: claim.id,
          performedByAdminId: adminId ?? undefined,
          reason: 'Expiry claim approved',
        });
      }
    } else {
      for (const item of claim.items) {
        await tx.expiryClaimItem.update({
          where: { id: item.id },
          data: { approvedQty: 0, rejectionReasonCode: rejectionReasonCode ?? undefined },
        });
      }
    }

    const updated = await tx.expiryClaim.update({
      where: { id: claimId },
      data: {
        status: outcome,
        totalApprovedQty: outcome === 'APPROVED' ? claim.totalRequestedQty : 0,
        decisionNote: note ?? undefined,
        decidedByAdminId: adminId ?? undefined,
        decidedAt: new Date(),
      },
      include: { items: true },
    });

    await tx.auditLog.create({
      data: {
        actorType: adminId ? 'ADMIN' : 'SYSTEM',
        actorId: adminId,
        action: outcome === 'APPROVED' ? 'EXPIRY_CLAIM_APPROVED' : 'EXPIRY_CLAIM_REJECTED',
        entityType: 'ExpiryClaim',
        entityId: claimId,
        metadata: { note, rejectionReasonCode },
      },
    });

    return { claim: updated, outcome, note };
  }
}
