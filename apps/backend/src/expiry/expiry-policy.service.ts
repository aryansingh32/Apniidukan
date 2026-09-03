import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

export interface UpdatePolicyDto {
  claimAllowed?: boolean;
  minimumExpiryAtDeliveryDays?: number;
  claimWindowAfterExpiryDays?: number;
  claimWindowBeforeExpiryDays?: number;
  minimumRemainingShelfLifeDays?: number;
  requiresPhoto?: boolean;
  autoApproveLimitAmount?: number;
}

/** Single configurable policy row — one wholesaler (this platform), one policy. */
@Injectable()
export class ExpiryPolicyService {
  constructor(private prisma: PrismaService) {}

  async get() {
    const existing = await this.prisma.expiryClaimPolicy.findFirst();
    if (existing) return existing;
    return this.prisma.expiryClaimPolicy.create({ data: {} });
  }

  async update(dto: UpdatePolicyDto, adminId: string) {
    const current = await this.get();
    const updated = await this.prisma.expiryClaimPolicy.update({ where: { id: current.id }, data: dto });
    await this.prisma.auditLog.create({
      data: { actorType: 'ADMIN', actorId: adminId, action: 'EXPIRY_POLICY_UPDATED', entityType: 'ExpiryClaimPolicy', entityId: current.id, metadata: dto as any },
    });
    return updated;
  }
}
