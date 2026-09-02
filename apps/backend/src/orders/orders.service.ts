import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
import { PricingService } from '../pricing/pricing.service';
import { OrderStatus } from '@prisma/client';

const CART_ITEM_PRODUCT_INCLUDE = {
  product: { include: { bulkPriceSlabs: true, schemes: { where: { active: true, type: 'BUY_X_GET_Y_FREE' as const } } } },
};

const ACTIVE_STATUSES: OrderStatus[] = [
  OrderStatus.PAYMENT_PENDING,
  OrderStatus.PAYMENT_VERIFICATION,
  OrderStatus.CONFIRMED,
  OrderStatus.PICKING,
  OrderStatus.PACKED,
  OrderStatus.DISPATCHED,
  OrderStatus.OUT_FOR_DELIVERY,
];

@Injectable()
export class OrdersService {
  constructor(private prisma: PrismaService, private pricing: PricingService, private config: ConfigService) {}

  private async generateOrderNumber(): Promise<string> {
    const count = await this.prisma.order.count();
    return `B2B${(10001 + count).toString()}`;
  }

  async checkout(retailerId: string, deliverySlotId: string, deliveryDate?: string) {
    const slot = await this.prisma.deliverySlot.findUnique({ where: { id: deliverySlotId } });
    if (!slot || !slot.active) throw new BadRequestException('Selected delivery slot is not available');

    const cart = await this.prisma.cart.findUnique({ where: { retailerId } });
    if (!cart) throw new BadRequestException('Cart is empty');

    const cartItems = await this.prisma.cartItem.findMany({ where: { cartId: cart.id }, include: CART_ITEM_PRODUCT_INCLUDE });
    if (cartItems.length === 0) throw new BadRequestException('Cart is empty');

    for (const item of cartItems) {
      if (item.product.status !== 'ACTIVE') {
        throw new BadRequestException(`${item.product.name} is currently unavailable`);
      }
      if (item.caseQty > item.product.stockCases) {
        throw new BadRequestException(`Only ${item.product.stockCases} case(s) of ${item.product.name} in stock`);
      }
    }

    const schemes = await this.prisma.scheme.findMany();
    const computation = this.pricing.computeCart(
      cartItems.map((i) => ({ product: i.product as any, caseQty: i.caseQty })),
      schemes,
    );

    const orderNumber = await this.generateOrderNumber();
    const upiId = this.config.get<string>('UPI_ID') ?? 'apniidukan@upi';

    const order = await this.prisma.$transaction(async (tx) => {
      const created = await tx.order.create({
        data: {
          orderNumber,
          retailerId,
          subtotal: computation.subtotal,
          tradeDiscount: computation.tradeDiscount,
          schemeDiscount: computation.schemeDiscount,
          gstAmount: computation.gstAmount,
          totalAmount: computation.totalAmount,
          appliedSchemes: {
            tradeScheme: computation.appliedTradeScheme,
            freeGoodsSchemes: computation.appliedFreeGoodsSchemes,
          } as any,
          deliverySlotId,
          deliveryDate: deliveryDate ? new Date(deliveryDate) : this.defaultDeliveryDate(),
          status: OrderStatus.PAYMENT_PENDING,
          items: {
            create: computation.lines.map((line) => ({
              productId: line.productId,
              productNameSnapshot: line.productName,
              brandSnapshot: line.brand,
              packSizeSnapshot: line.packSize,
              caseQty: line.caseQty,
              freeCaseQty: line.freeCaseQty,
              pricePerCase: line.pricePerCase,
              mrpPerUnit: line.mrpPerUnit,
              unitsPerCase: line.unitsPerCase,
              gstRate: line.gstRate,
              lineSubtotal: line.lineSubtotal,
              lineDiscount: line.lineDiscountShare,
              lineTotal: line.lineTotal,
            })),
          },
          statusHistory: { create: { status: OrderStatus.PAYMENT_PENDING, note: 'Order placed, awaiting payment' } },
          payment: {
            create: {
              amount: computation.totalAmount,
              upiId,
              status: 'UNPAID',
            },
          },
        },
        include: { items: true, payment: true, deliverySlot: true },
      });

      for (const line of computation.lines) {
        await tx.product.update({
          where: { id: line.productId },
          data: { stockCases: { decrement: line.caseQty + line.freeCaseQty } },
        });
      }

      await tx.cartItem.deleteMany({ where: { cartId: cart.id } });

      return created;
    });

    return order;
  }

  private defaultDeliveryDate() {
    const d = new Date();
    d.setDate(d.getDate() + 1);
    return d;
  }

  async list(retailerId: string, tab?: 'active' | 'completed' | 'cancelled') {
    const where: any = { retailerId };
    if (tab === 'active') where.status = { in: ACTIVE_STATUSES };
    if (tab === 'completed') where.status = OrderStatus.DELIVERED;
    if (tab === 'cancelled') where.status = OrderStatus.CANCELLED;

    return this.prisma.order.findMany({
      where,
      include: { items: true, payment: true, deliverySlot: true },
      orderBy: { createdAt: 'desc' },
    });
  }

  async get(retailerId: string, id: string) {
    const order = await this.prisma.order.findFirst({
      where: { id, retailerId },
      include: { items: true, payment: true, deliverySlot: true, statusHistory: { orderBy: { createdAt: 'asc' } } },
    });
    if (!order) throw new NotFoundException('Order not found');
    return order;
  }

  async quickReorder(retailerId: string) {
    const lastOrder = await this.prisma.order.findFirst({
      where: { retailerId, status: { not: OrderStatus.CANCELLED } },
      orderBy: { createdAt: 'desc' },
      include: { items: true },
    });
    if (!lastOrder) return null;

    return {
      orderId: lastOrder.id,
      orderNumber: lastOrder.orderNumber,
      placedAt: lastOrder.createdAt,
      items: lastOrder.items.map((i) => ({
        productId: i.productId,
        name: i.productNameSnapshot,
        brand: i.brandSnapshot,
        caseQty: i.caseQty,
      })),
    };
  }

  async adminList(status?: OrderStatus) {
    return this.prisma.order.findMany({
      where: status ? { status } : {},
      include: { items: true, payment: true, retailer: true, deliverySlot: true },
      orderBy: { createdAt: 'desc' },
    });
  }

  async adminGet(id: string) {
    const order = await this.prisma.order.findUnique({
      where: { id },
      include: {
        items: true,
        payment: true,
        retailer: true,
        deliverySlot: true,
        statusHistory: { orderBy: { createdAt: 'asc' } },
      },
    });
    if (!order) throw new NotFoundException('Order not found');
    return order;
  }

  async adminUpdateStatus(id: string, status: OrderStatus, note?: string) {
    const order = await this.prisma.order.findUnique({ where: { id } });
    if (!order) throw new NotFoundException('Order not found');

    return this.prisma.order.update({
      where: { id },
      data: {
        status,
        statusHistory: { create: { status, note } },
      },
      include: { items: true, payment: true, statusHistory: { orderBy: { createdAt: 'asc' } } },
    });
  }
}
