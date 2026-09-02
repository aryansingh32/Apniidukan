import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { PricingService } from '../pricing/pricing.service';

const CART_ITEM_PRODUCT_INCLUDE = {
  product: { include: { bulkPriceSlabs: true, schemes: { where: { active: true, type: 'BUY_X_GET_Y_FREE' as const } } } },
};

@Injectable()
export class CartService {
  constructor(private prisma: PrismaService, private pricing: PricingService) {}

  private async getOrCreateCart(retailerId: string) {
    let cart = await this.prisma.cart.findUnique({ where: { retailerId } });
    if (!cart) {
      cart = await this.prisma.cart.create({ data: { retailerId } });
    }
    return cart;
  }

  async getComputedCart(retailerId: string) {
    const cart = await this.getOrCreateCart(retailerId);
    const items = await this.prisma.cartItem.findMany({ where: { cartId: cart.id }, include: CART_ITEM_PRODUCT_INCLUDE });
    const activeSchemes = await this.prisma.scheme.findMany();

    const computation = this.pricing.computeCart(
      items.map((i) => ({ product: i.product as any, caseQty: i.caseQty })),
      activeSchemes,
    );

    return { cartId: cart.id, itemCount: items.length, ...computation };
  }

  async addItem(retailerId: string, productId: string, caseQty: number) {
    if (caseQty <= 0) throw new BadRequestException('Quantity must be greater than 0');
    const product = await this.prisma.product.findUnique({ where: { id: productId } });
    if (!product || product.status !== 'ACTIVE') throw new NotFoundException('Product unavailable');

    const cart = await this.getOrCreateCart(retailerId);
    await this.prisma.cartItem.upsert({
      where: { cartId_productId: { cartId: cart.id, productId } },
      create: { cartId: cart.id, productId, caseQty },
      update: { caseQty },
    });
    return this.getComputedCart(retailerId);
  }

  async updateItem(retailerId: string, productId: string, caseQty: number) {
    const cart = await this.getOrCreateCart(retailerId);
    if (caseQty <= 0) {
      await this.prisma.cartItem.deleteMany({ where: { cartId: cart.id, productId } });
    } else {
      await this.prisma.cartItem.updateMany({ where: { cartId: cart.id, productId }, data: { caseQty } });
    }
    return this.getComputedCart(retailerId);
  }

  async removeItem(retailerId: string, productId: string) {
    const cart = await this.getOrCreateCart(retailerId);
    await this.prisma.cartItem.deleteMany({ where: { cartId: cart.id, productId } });
    return this.getComputedCart(retailerId);
  }

  async clear(retailerId: string) {
    const cart = await this.getOrCreateCart(retailerId);
    await this.prisma.cartItem.deleteMany({ where: { cartId: cart.id } });
    return this.getComputedCart(retailerId);
  }

  async addOrderToCart(retailerId: string, orderId: string) {
    const order = await this.prisma.order.findFirst({ where: { id: orderId, retailerId }, include: { items: true } });
    if (!order) throw new NotFoundException('Order not found');

    const cart = await this.getOrCreateCart(retailerId);
    const unavailable: string[] = [];

    for (const item of order.items) {
      const product = await this.prisma.product.findUnique({ where: { id: item.productId } });
      if (!product || product.status !== 'ACTIVE') {
        unavailable.push(item.productNameSnapshot);
        continue;
      }
      await this.prisma.cartItem.upsert({
        where: { cartId_productId: { cartId: cart.id, productId: item.productId } },
        create: { cartId: cart.id, productId: item.productId, caseQty: item.caseQty },
        update: { caseQty: item.caseQty },
      });
    }

    return { ...(await this.getComputedCart(retailerId)), unavailableProducts: unavailable };
  }
}
