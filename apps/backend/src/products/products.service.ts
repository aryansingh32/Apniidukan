import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { PricingService, ProductWithPricing } from '../pricing/pricing.service';
import { ProductStatus, Prisma } from '@prisma/client';
import { buildBarcodeValue } from './barcode.util';

export interface UpsertProductDto {
  name: string;
  brand: string;
  categoryId: string;
  imageUrl?: string;
  packSize: string;
  unitsPerCase: number;
  mrpPerUnit: number;
  buyingPricePerCase: number;
  gstRate?: number;
  hsnCode?: string;
  sku: string;
  barcode?: string;
  status?: ProductStatus;
  stockCases?: number;
}

export interface BulkSlabDto {
  minCases: number;
  maxCases?: number;
  pricePerCase: number;
}

const PRODUCT_INCLUDE = {
  category: true,
  bulkPriceSlabs: true,
  schemes: { where: { active: true, type: 'BUY_X_GET_Y_FREE' as const } },
};

function round2(n: number) {
  return Math.round(n * 100) / 100;
}

@Injectable()
export class ProductsService {
  constructor(private prisma: PrismaService, private pricing: PricingService) {}

  private mapCard(product: ProductWithPricing & { category: { name: string }; schemes: any[] }) {
    const { pricePerCase, nextSlab } = this.pricing.priceForQty(product, 1);
    const mrpPerUnit = Number(product.mrpPerUnit);
    const mrpTotalPerCase = round2(mrpPerUnit * product.unitsPerCase);
    const profitPerCase = round2(mrpTotalPerCase - pricePerCase);
    const marginPercent = mrpTotalPerCase > 0 ? round2((profitPerCase / mrpTotalPerCase) * 100) : 0;
    const scheme = product.schemes[0];

    return {
      id: product.id,
      name: product.name,
      brand: product.brand,
      categoryId: product.categoryId,
      categoryName: product.category?.name,
      imageUrl: product.imageUrl,
      packSize: product.packSize,
      unitsPerCase: product.unitsPerCase,
      mrpPerUnit,
      mrpTotalPerCase,
      buyingPricePerCase: Number(product.buyingPricePerCase),
      yourRatePerCase: pricePerCase,
      profitPerCase,
      marginPercent,
      gstRate: Number(product.gstRate),
      hsnCode: product.hsnCode,
      sku: product.sku,
      barcode: product.barcode,
      status: product.status,
      stockCases: product.stockCases,
      nextSlab,
      bulkPriceSlabs: product.bulkPriceSlabs
        .sort((a, b) => a.minCases - b.minCases)
        .map((s) => ({ minCases: s.minCases, maxCases: s.maxCases, pricePerCase: Number(s.pricePerCase) })),
      activeFreeGoodsScheme: scheme
        ? { id: scheme.id, title: scheme.title, description: scheme.description, buyQty: scheme.buyQty, freeQty: scheme.freeQty }
        : null,
    };
  }

  async list(params: { categoryId?: string; search?: string; brand?: string; onlyActive?: boolean }) {
    const where: Prisma.ProductWhereInput = {
      ...(params.categoryId ? { categoryId: params.categoryId } : {}),
      ...(params.brand ? { brand: { equals: params.brand, mode: 'insensitive' } } : {}),
      ...(params.onlyActive === false ? {} : { status: { not: 'INACTIVE' } }),
      ...(params.search
        ? {
            OR: [
              { name: { contains: params.search, mode: 'insensitive' } },
              { brand: { contains: params.search, mode: 'insensitive' } },
              { sku: { contains: params.search, mode: 'insensitive' } },
              { barcode: { contains: params.search, mode: 'insensitive' } },
              { category: { name: { contains: params.search, mode: 'insensitive' } } },
            ],
          }
        : {}),
    };

    const products = await this.prisma.product.findMany({ where, include: PRODUCT_INCLUDE, orderBy: { name: 'asc' } });
    return products.map((p) => this.mapCard(p as any));
  }

  async get(id: string) {
    const product = await this.prisma.product.findUnique({ where: { id }, include: PRODUCT_INCLUDE });
    if (!product) throw new NotFoundException('Product not found');
    return this.mapCard(product as any);
  }

  async getByBarcode(barcode: string) {
    const products = await this.prisma.product.findMany({ where: { barcode }, include: PRODUCT_INCLUDE });
    return products.map((p) => this.mapCard(p as any));
  }

  create(dto: UpsertProductDto) {
    return this.prisma.product.create({ data: dto });
  }

  async update(id: string, dto: Partial<UpsertProductDto>) {
    await this.ensureExists(id);
    return this.prisma.product.update({ where: { id }, data: dto });
  }

  async remove(id: string) {
    await this.ensureExists(id);
    return this.prisma.product.update({ where: { id }, data: { status: 'INACTIVE' } });
  }

  async addSlab(productId: string, dto: BulkSlabDto) {
    await this.ensureExists(productId);
    return this.prisma.bulkPriceSlab.create({ data: { productId, ...dto } });
  }

  async removeSlab(slabId: string) {
    return this.prisma.bulkPriceSlab.delete({ where: { id: slabId } });
  }

  /** Generates a unique EAN-13-shaped barcode for one product and saves it. */
  async generateBarcode(id: string) {
    await this.ensureExists(id);
    const value = await this.nextUniqueBarcode();
    return this.prisma.product.update({ where: { id }, data: { barcode: value } });
  }

  /** Generates barcodes for every product missing one (or a given id list). Returns the updated products. */
  async generateBarcodesBulk(productIds?: string[]) {
    const products = await this.prisma.product.findMany({
      where: productIds && productIds.length > 0 ? { id: { in: productIds } } : { OR: [{ barcode: null }, { barcode: '' }] },
    });

    const updated = [];
    for (const product of products) {
      if (product.barcode && product.barcode.trim() && !productIds) continue;
      const value = await this.nextUniqueBarcode();
      updated.push(await this.prisma.product.update({ where: { id: product.id }, data: { barcode: value } }));
    }
    return updated;
  }

  private async nextUniqueBarcode(): Promise<string> {
    for (let attempt = 0; attempt < 20; attempt++) {
      const sequence = (await this.prisma.product.count()) + attempt + Date.now() % 1000;
      const value = buildBarcodeValue(sequence);
      const existing = await this.prisma.product.findFirst({ where: { barcode: value } });
      if (!existing) return value;
    }
    throw new Error('Could not generate a unique barcode, please retry');
  }

  private async ensureExists(id: string) {
    const product = await this.prisma.product.findUnique({ where: { id } });
    if (!product) throw new NotFoundException('Product not found');
    return product;
  }
}
