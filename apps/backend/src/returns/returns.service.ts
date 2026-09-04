import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';
import { NotificationType, OrderStatus, ReturnReason, ReturnStatus } from '@prisma/client';

@Injectable()
export class ReturnsService {
  constructor(
    private prisma: PrismaService,
    private notifications: NotificationsService,
  ) {}

  private async generateReturnNumber(): Promise<string> {
    const count = await this.prisma.returnRequest.count();
    return `RET${(70001 + count).toString()}`;
  }

  private async generateCreditNoteNumber(): Promise<string> {
    const count = await this.prisma.creditNote.count();
    return `CN${(90001 + count).toString()}`;
  }

  async submit(
    retailerId: string,
    orderItemId: string,
    qty: number,
    reason: ReturnReason,
    note?: string,
    photoUrl?: string,
  ) {
    if (!qty || qty <= 0) throw new BadRequestException('Enter a valid quantity to return');

    const orderItem = await this.prisma.orderItem.findUnique({
      where: { id: orderItemId },
      include: { order: true, returnRequests: { where: { status: { not: ReturnStatus.REJECTED } } } },
    });
    if (!orderItem || orderItem.order.retailerId !== retailerId) throw new NotFoundException('Order item not found');
    if (orderItem.order.status !== OrderStatus.DELIVERED) {
      throw new BadRequestException('Returns can only be submitted for delivered orders');
    }

    const totalQty = orderItem.caseQty + orderItem.freeCaseQty;
    const alreadyRequested = orderItem.returnRequests.reduce((sum, r) => sum + r.qty, 0);
    if (qty > totalQty - alreadyRequested) {
      throw new BadRequestException(`You can return at most ${totalQty - alreadyRequested} case(s) of this item`);
    }

    const returnNumber = await this.generateReturnNumber();
    return this.prisma.returnRequest.create({
      data: {
        returnNumber,
        retailerId,
        orderId: orderItem.orderId,
        orderItemId,
        qty,
        reason,
        note,
        photoUrl,
      },
    });
  }

  async list(retailerId: string) {
    return this.prisma.returnRequest.findMany({
      where: { retailerId },
      include: { orderItem: true, order: true, creditNote: true },
      orderBy: { createdAt: 'desc' },
    });
  }

  async get(retailerId: string, id: string) {
    const r = await this.prisma.returnRequest.findFirst({
      where: { id, retailerId },
      include: { orderItem: true, order: true, creditNote: true },
    });
    if (!r) throw new NotFoundException('Return request not found');
    return r;
  }

  async listCreditNotes(retailerId: string) {
    return this.prisma.creditNote.findMany({
      where: { retailerId },
      include: { returnRequest: { include: { orderItem: true } } },
      orderBy: { createdAt: 'desc' },
    });
  }

  async adminList(status?: ReturnStatus) {
    return this.prisma.returnRequest.findMany({
      where: status ? { status } : {},
      include: { orderItem: true, order: true, retailer: true, creditNote: true },
      orderBy: { createdAt: 'desc' },
    });
  }

  async adminGet(id: string) {
    const r = await this.prisma.returnRequest.findUnique({
      where: { id },
      include: { orderItem: true, order: true, retailer: true, creditNote: true },
    });
    if (!r) throw new NotFoundException('Return request not found');
    return r;
  }

  /** 1-click approve: instantly issues a credit note for the returned line's proportional value. */
  async adminApprove(id: string, adminId: string) {
    const r = await this.prisma.returnRequest.findUnique({ where: { id }, include: { orderItem: true } });
    if (!r) throw new NotFoundException('Return request not found');
    if (r.status !== ReturnStatus.SUBMITTED) throw new BadRequestException('This return has already been decided');

    const totalQty = r.orderItem.caseQty + r.orderItem.freeCaseQty;
    const unitValue = totalQty > 0 ? Number(r.orderItem.lineTotal) / totalQty : 0;
    const amount = Math.round(unitValue * r.qty * 100) / 100;
    const creditNoteNumber = await this.generateCreditNoteNumber();

    const [updated] = await this.prisma.$transaction([
      this.prisma.returnRequest.update({
        where: { id },
        data: { status: ReturnStatus.APPROVED, decidedByAdminId: adminId, decidedAt: new Date() },
      }),
      this.prisma.creditNote.create({
        data: {
          creditNoteNumber,
          retailerId: r.retailerId,
          returnRequestId: r.id,
          amount,
          reason: `Return ${r.returnNumber} — ${r.reason}`,
        },
      }),
    ]);

    await this.notifications.create(
      r.retailerId,
      NotificationType.RETURN_APPROVED,
      'Return Approved',
      `Your return ${r.returnNumber} was approved. Credit note ${creditNoteNumber} for ₹${amount.toFixed(2)} has been issued.`,
      r.orderId,
    );

    return { ...updated, creditNote: { creditNoteNumber, amount } };
  }

  async adminReject(id: string, adminId: string, reason: string) {
    if (!reason) throw new BadRequestException('Rejection reason is required');
    const r = await this.prisma.returnRequest.findUnique({ where: { id } });
    if (!r) throw new NotFoundException('Return request not found');
    if (r.status !== ReturnStatus.SUBMITTED) throw new BadRequestException('This return has already been decided');

    const updated = await this.prisma.returnRequest.update({
      where: { id },
      data: { status: ReturnStatus.REJECTED, rejectionReason: reason, decidedByAdminId: adminId, decidedAt: new Date() },
    });

    await this.notifications.create(
      r.retailerId,
      NotificationType.RETURN_REJECTED,
      'Return Rejected',
      `Your return ${r.returnNumber} could not be approved: ${reason}.`,
      r.orderId,
    );

    return updated;
  }
}
