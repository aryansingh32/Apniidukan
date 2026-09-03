import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationType } from '@prisma/client';

@Injectable()
export class NotificationsService {
  constructor(private prisma: PrismaService) {}

  create(retailerId: string, type: NotificationType, title: string, body: string, orderId?: string) {
    return this.prisma.notification.create({ data: { retailerId, type, title, body, orderId } });
  }

  async createForRetailers(retailerIds: string[], type: NotificationType, title: string, body: string) {
    if (retailerIds.length === 0) return { count: 0 };
    return this.prisma.notification.createMany({
      data: retailerIds.map((retailerId) => ({ retailerId, type, title, body })),
    });
  }

  async broadcastToApproved(title: string, body: string) {
    const retailers = await this.prisma.retailer.findMany({ where: { status: 'APPROVED' }, select: { id: true } });
    return this.createForRetailers(
      retailers.map((r) => r.id),
      NotificationType.BROADCAST,
      title,
      body,
    );
  }

  list(retailerId: string, limit = 50) {
    return this.prisma.notification.findMany({
      where: { retailerId },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });
  }

  unreadCount(retailerId: string) {
    return this.prisma.notification.count({ where: { retailerId, read: false } });
  }

  async markRead(retailerId: string, id: string) {
    await this.prisma.notification.updateMany({ where: { id, retailerId }, data: { read: true } });
    return { success: true };
  }

  async markAllRead(retailerId: string) {
    await this.prisma.notification.updateMany({ where: { retailerId, read: false }, data: { read: true } });
    return { success: true };
  }
}
