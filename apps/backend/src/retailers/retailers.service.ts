import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { RetailerStatus } from '@prisma/client';

export interface RegisterRetailerDto {
  ownerName: string;
  shopName: string;
  address: string;
  city: string;
  pincode: string;
  gstin?: string;
  shopPhotoUrl?: string;
}

@Injectable()
export class RetailersService {
  constructor(private prisma: PrismaService) {}

  async getMe(retailerId: string) {
    const retailer = await this.prisma.retailer.findUnique({ where: { id: retailerId } });
    if (!retailer) throw new NotFoundException('Retailer not found');
    return retailer;
  }

  async register(retailerId: string, dto: RegisterRetailerDto) {
    const existing = await this.prisma.retailer.findUnique({ where: { id: retailerId } });
    if (!existing) throw new NotFoundException('Retailer not found');

    const shouldResetToPending = existing.status === 'REJECTED';

    return this.prisma.retailer.update({
      where: { id: retailerId },
      data: {
        ...dto,
        ...(shouldResetToPending ? { status: RetailerStatus.PENDING, rejectionReason: null } : {}),
      },
    });
  }

  async adminList(status?: RetailerStatus, search?: string) {
    return this.prisma.retailer.findMany({
      where: {
        ...(status ? { status } : {}),
        ...(search
          ? {
              OR: [
                { shopName: { contains: search, mode: 'insensitive' } },
                { ownerName: { contains: search, mode: 'insensitive' } },
                { mobileNumber: { contains: search } },
                { city: { contains: search, mode: 'insensitive' } },
              ],
            }
          : {}),
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async adminGet(id: string) {
    const retailer = await this.prisma.retailer.findUnique({
      where: { id },
      include: {
        orders: { orderBy: { createdAt: 'desc' }, take: 20, include: { payment: true } },
      },
    });
    if (!retailer) throw new NotFoundException('Retailer not found');
    return retailer;
  }

  async approve(id: string, adminId: string) {
    const retailer = await this.getExisting(id);
    const updated = await this.prisma.retailer.update({
      where: { id },
      data: { status: RetailerStatus.APPROVED, rejectionReason: null },
    });
    await this.log(adminId, 'RETAILER_APPROVED', id, { previousStatus: retailer.status });
    return updated;
  }

  async reject(id: string, adminId: string, reason: string) {
    const retailer = await this.getExisting(id);
    const updated = await this.prisma.retailer.update({
      where: { id },
      data: { status: RetailerStatus.REJECTED, rejectionReason: reason },
    });
    await this.log(adminId, 'RETAILER_REJECTED', id, { previousStatus: retailer.status, reason });
    return updated;
  }

  async suspend(id: string, adminId: string) {
    const retailer = await this.getExisting(id);
    const updated = await this.prisma.retailer.update({ where: { id }, data: { status: RetailerStatus.SUSPENDED } });
    await this.log(adminId, 'RETAILER_SUSPENDED', id, { previousStatus: retailer.status });
    return updated;
  }

  async reactivate(id: string, adminId: string) {
    const retailer = await this.getExisting(id);
    const updated = await this.prisma.retailer.update({ where: { id }, data: { status: RetailerStatus.APPROVED } });
    await this.log(adminId, 'RETAILER_REACTIVATED', id, { previousStatus: retailer.status });
    return updated;
  }

  private async getExisting(id: string) {
    const retailer = await this.prisma.retailer.findUnique({ where: { id } });
    if (!retailer) throw new NotFoundException('Retailer not found');
    return retailer;
  }

  private log(adminId: string, action: string, entityId: string, metadata: Record<string, unknown>) {
    return this.prisma.auditLog.create({
      data: { actorType: 'ADMIN', actorId: adminId, action, entityType: 'Retailer', entityId, metadata: metadata as any },
    });
  }
}
