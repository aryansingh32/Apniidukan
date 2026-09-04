import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
import { OrderStatus, PaymentStatus, NotificationType } from '@prisma/client';
import { NotificationsService } from '../notifications/notifications.service';

function generateDeliveryOtp(): string {
  return Math.floor(1000 + Math.random() * 9000).toString();
}

@Injectable()
export class PaymentsService {
  constructor(
    private prisma: PrismaService,
    private config: ConfigService,
    private notifications: NotificationsService,
  ) {}

  async getForOrder(retailerId: string, orderId: string) {
    const order = await this.prisma.order.findFirst({ where: { id: orderId, retailerId }, include: { payment: true } });
    if (!order || !order.payment) throw new NotFoundException('Payment not found');

    const payeeName = this.config.get<string>('UPI_PAYEE_NAME') ?? 'Apniidukan Distributors';
    const amount = Number(order.payment.amount);

    if (order.payment.method === 'COD') {
      return { ...order.payment, payeeName, upiDeepLink: null, orderNumber: order.orderNumber };
    }

    const upiDeepLink = `upi://pay?pa=${encodeURIComponent(order.payment.upiId ?? '')}&pn=${encodeURIComponent(payeeName)}&am=${amount}&cu=INR&tn=${encodeURIComponent(order.orderNumber)}`;

    return { ...order.payment, payeeName, upiDeepLink, orderNumber: order.orderNumber };
  }

  async submitUtr(retailerId: string, orderId: string, utr: string, screenshotUrl?: string) {
    if (!utr || utr.trim().length < 6) throw new BadRequestException('Enter a valid UTR / transaction reference number');

    const order = await this.prisma.order.findFirst({ where: { id: orderId, retailerId }, include: { payment: true } });
    if (!order || !order.payment) throw new NotFoundException('Payment not found');

    if (![PaymentStatus.UNPAID, PaymentStatus.PAYMENT_REJECTED].includes(order.payment.status as any)) {
      throw new BadRequestException('Payment for this order has already been submitted');
    }

    const payment = await this.prisma.payment.update({
      where: { id: order.payment.id },
      data: {
        utr: utr.trim(),
        screenshotUrl,
        status: PaymentStatus.UNDER_REVIEW,
        submittedAt: new Date(),
        rejectionReason: null,
      },
    });

    await this.prisma.order.update({
      where: { id: orderId },
      data: {
        status: OrderStatus.PAYMENT_VERIFICATION,
        statusHistory: { create: { status: OrderStatus.PAYMENT_VERIFICATION, note: `UTR ${utr} submitted, verification pending` } },
      },
    });

    return payment;
  }

  async adminList(status?: PaymentStatus) {
    return this.prisma.payment.findMany({
      where: status ? { status } : {},
      include: { order: { include: { retailer: true } } },
      orderBy: { updatedAt: 'desc' },
    });
  }

  async adminApprove(paymentId: string, adminId: string) {
    const payment = await this.prisma.payment.findUnique({ where: { id: paymentId }, include: { order: true } });
    if (!payment) throw new NotFoundException('Payment not found');

    const updated = await this.prisma.payment.update({
      where: { id: paymentId },
      data: { status: PaymentStatus.PAYMENT_APPROVED, verifiedByAdminId: adminId, verifiedAt: new Date(), rejectionReason: null },
    });

    await this.prisma.order.update({
      where: { id: payment.orderId },
      data: {
        status: OrderStatus.CONFIRMED,
        deliveryOtp: generateDeliveryOtp(),
        statusHistory: { create: { status: OrderStatus.CONFIRMED, note: 'Payment verified by admin. Order confirmed.' } },
      },
    });

    await this.prisma.auditLog.create({
      data: { actorType: 'ADMIN', actorId: adminId, action: 'PAYMENT_APPROVED', entityType: 'Payment', entityId: paymentId },
    });

    await this.notifications.create(
      payment.order.retailerId,
      NotificationType.PAYMENT_VERIFIED,
      'Payment Verified',
      `Your payment for order ${payment.order.orderNumber} has been verified. Your order is now confirmed.`,
      payment.order.id,
    );

    return updated;
  }

  async adminMarkCodCollected(paymentId: string, adminId: string) {
    const payment = await this.prisma.payment.findUnique({ where: { id: paymentId }, include: { order: true } });
    if (!payment) throw new NotFoundException('Payment not found');
    if (payment.method !== 'COD') throw new BadRequestException('This payment is not a Cash on Delivery payment');
    if (payment.status === 'COD_COLLECTED') return payment;

    const updated = await this.prisma.payment.update({
      where: { id: paymentId },
      data: { status: PaymentStatus.COD_COLLECTED, verifiedByAdminId: adminId, verifiedAt: new Date() },
    });

    await this.prisma.auditLog.create({
      data: { actorType: 'ADMIN', actorId: adminId, action: 'COD_COLLECTED', entityType: 'Payment', entityId: paymentId },
    });

    return updated;
  }

  async adminReject(paymentId: string, adminId: string, reason: string) {
    if (!reason) throw new BadRequestException('Rejection reason is required');
    const payment = await this.prisma.payment.findUnique({ where: { id: paymentId }, include: { order: true } });
    if (!payment) throw new NotFoundException('Payment not found');

    const updated = await this.prisma.payment.update({
      where: { id: paymentId },
      data: { status: PaymentStatus.PAYMENT_REJECTED, rejectionReason: reason, verifiedByAdminId: adminId, verifiedAt: new Date() },
    });

    await this.prisma.order.update({
      where: { id: payment.orderId },
      data: { statusHistory: { create: { status: OrderStatus.PAYMENT_VERIFICATION, note: `Payment rejected: ${reason}` } } },
    });

    await this.prisma.auditLog.create({
      data: { actorType: 'ADMIN', actorId: adminId, action: 'PAYMENT_REJECTED', entityType: 'Payment', entityId: paymentId, metadata: { reason } },
    });

    await this.notifications.create(
      payment.order.retailerId,
      NotificationType.PAYMENT_REJECTED,
      'Payment Rejected',
      `Your payment for order ${payment.order.orderNumber} could not be verified: ${reason}. Please resubmit your UTR.`,
      payment.order.id,
    );

    return updated;
  }
}
