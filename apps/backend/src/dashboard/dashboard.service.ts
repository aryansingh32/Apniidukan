import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { OrderStatus, PaymentStatus, RetailerStatus } from '@prisma/client';

@Injectable()
export class DashboardService {
  constructor(private prisma: PrismaService) {}

  async summary() {
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);

    const [
      totalOrders,
      todaysOrders,
      pendingPayments,
      pendingApprovals,
      revenueAgg,
      pendingDispatches,
      lowStockProducts,
      totalRetailers,
    ] = await Promise.all([
      this.prisma.order.count(),
      this.prisma.order.count({ where: { createdAt: { gte: startOfDay } } }),
      this.prisma.payment.count({ where: { status: PaymentStatus.UNDER_REVIEW } }),
      this.prisma.retailer.count({ where: { status: RetailerStatus.PENDING } }),
      this.prisma.order.aggregate({
        _sum: { totalAmount: true },
        where: { status: { notIn: [OrderStatus.CANCELLED, OrderStatus.PAYMENT_PENDING, OrderStatus.PAYMENT_VERIFICATION] } },
      }),
      this.prisma.order.count({ where: { status: { in: [OrderStatus.CONFIRMED, OrderStatus.PICKING, OrderStatus.PACKED] } } }),
      this.prisma.product.findMany({ where: { stockCases: { lte: 10 }, status: { not: 'INACTIVE' } }, take: 10 }),
      this.prisma.retailer.count({ where: { status: RetailerStatus.APPROVED } }),
    ]);

    return {
      totalOrders,
      todaysOrders,
      pendingPayments,
      pendingApprovals,
      revenue: Number(revenueAgg._sum.totalAmount ?? 0),
      pendingDispatches,
      lowStockProducts,
      totalRetailers,
    };
  }
}
