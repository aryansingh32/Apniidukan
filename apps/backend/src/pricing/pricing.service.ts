import { Injectable } from '@nestjs/common';
import { BulkPriceSlab, Product, Scheme } from '@prisma/client';

export type ProductWithPricing = Product & {
  bulkPriceSlabs: BulkPriceSlab[];
  schemes: Scheme[];
};

export interface PriceForQtyResult {
  pricePerCase: number;
  appliedSlabId: string | null;
  nextSlab: { minCases: number; pricePerCase: number } | null;
}

export interface ComputedLine {
  productId: string;
  productName: string;
  brand: string;
  packSize: string;
  imageUrl: string | null;
  unitsPerCase: number;
  mrpPerUnit: number;
  caseQty: number;
  freeCaseQty: number;
  pricePerCase: number;
  gstRate: number;
  lineSubtotal: number;
  lineDiscountShare: number;
  taxableValue: number;
  lineGst: number;
  lineTotal: number;
  mrpTotal: number;
  profitTotal: number;
  marginPercent: number;
  appliedFreeGoodsScheme: { id: string; title: string; freeCaseQty: number } | null;
  nextSlab: { minCases: number; pricePerCase: number } | null;
}

export interface CartComputation {
  lines: ComputedLine[];
  subtotal: number;
  tradeDiscount: number;
  schemeDiscount: number;
  gstAmount: number;
  totalAmount: number;
  totalMrpValue: number;
  totalProfit: number;
  appliedTradeScheme: { id: string; title: string; discountAmount: number } | null;
  appliedFreeGoodsSchemes: { id: string; title: string; productId: string; freeCaseQty: number; freeValue: number }[];
  upsell: { schemeTitle: string; amountNeeded: number } | null;
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

@Injectable()
export class PricingService {
  priceForQty(product: ProductWithPricing, caseQty: number): PriceForQtyResult {
    const slabs = [...product.bulkPriceSlabs].sort((a, b) => a.minCases - b.minCases);
    let applied: BulkPriceSlab | null = null;
    let next: BulkPriceSlab | null = null;

    for (const slab of slabs) {
      const max = slab.maxCases ?? Infinity;
      if (caseQty >= slab.minCases && caseQty <= max) {
        applied = slab;
      }
      if (caseQty < slab.minCases && !next) {
        next = slab;
      }
    }

    const pricePerCase = applied
      ? Number(applied.pricePerCase)
      : Number(product.buyingPricePerCase);

    return {
      pricePerCase,
      appliedSlabId: applied?.id ?? null,
      nextSlab: next ? { minCases: next.minCases, pricePerCase: Number(next.pricePerCase) } : null,
    };
  }

  computeCart(items: { product: ProductWithPricing; caseQty: number }[], allActiveSchemes: Scheme[]): CartComputation {
    const now = new Date();
    const activeSchemes = allActiveSchemes.filter((s) => s.active && s.startDate <= now && s.endDate >= now);
    const orderValueSchemes = activeSchemes.filter((s) => s.type === 'ORDER_VALUE_DISCOUNT');
    const freeGoodsSchemes = activeSchemes.filter((s) => s.type === 'BUY_X_GET_Y_FREE');

    let subtotal = 0;
    let totalMrpValue = 0;
    let totalProfit = 0;
    const appliedFreeGoodsSchemes: CartComputation['appliedFreeGoodsSchemes'] = [];

    const partialLines = items.map(({ product, caseQty }) => {
      const { pricePerCase, nextSlab } = this.priceForQty(product, caseQty);
      const lineSubtotal = round2(pricePerCase * caseQty);
      const mrpPerUnit = Number(product.mrpPerUnit);
      const mrpTotal = round2(mrpPerUnit * product.unitsPerCase * caseQty);
      const profitTotal = round2(mrpTotal - lineSubtotal);

      let freeCaseQty = 0;
      let appliedFreeGoodsScheme: ComputedLine['appliedFreeGoodsScheme'] = null;
      const matchingFreeScheme = freeGoodsSchemes.find((s) => s.productId === product.id && s.buyQty && s.freeQty);
      if (matchingFreeScheme && matchingFreeScheme.buyQty) {
        freeCaseQty = Math.floor(caseQty / matchingFreeScheme.buyQty) * (matchingFreeScheme.freeQty ?? 0);
        if (freeCaseQty > 0) {
          appliedFreeGoodsScheme = {
            id: matchingFreeScheme.id,
            title: matchingFreeScheme.title,
            freeCaseQty,
          };
          appliedFreeGoodsSchemes.push({
            id: matchingFreeScheme.id,
            title: matchingFreeScheme.title,
            productId: product.id,
            freeCaseQty,
            freeValue: round2(freeCaseQty * pricePerCase),
          });
        }
      }

      subtotal += lineSubtotal;
      totalMrpValue += mrpTotal;
      totalProfit += profitTotal;

      return {
        product,
        caseQty,
        freeCaseQty,
        pricePerCase,
        lineSubtotal,
        mrpTotal,
        profitTotal,
        nextSlab,
        appliedFreeGoodsScheme,
      };
    });

    subtotal = round2(subtotal);
    totalMrpValue = round2(totalMrpValue);
    totalProfit = round2(totalProfit);

    let tradeDiscount = 0;
    let appliedTradeScheme: CartComputation['appliedTradeScheme'] = null;
    let upsell: CartComputation['upsell'] = null;

    const eligible = orderValueSchemes
      .filter((s) => s.minOrderValue != null && subtotal >= Number(s.minOrderValue))
      .map((s) => {
        const amount = s.discountPercent
          ? round2((subtotal * Number(s.discountPercent)) / 100)
          : round2(Number(s.flatDiscount ?? 0));
        return { scheme: s, amount };
      })
      .sort((a, b) => b.amount - a.amount);

    if (eligible.length > 0) {
      tradeDiscount = eligible[0].amount;
      appliedTradeScheme = {
        id: eligible[0].scheme.id,
        title: eligible[0].scheme.title,
        discountAmount: tradeDiscount,
      };
    } else {
      const nearest = orderValueSchemes
        .filter((s) => s.minOrderValue != null && subtotal < Number(s.minOrderValue))
        .sort((a, b) => Number(a.minOrderValue) - Number(b.minOrderValue))[0];
      if (nearest) {
        upsell = {
          schemeTitle: nearest.title,
          amountNeeded: round2(Number(nearest.minOrderValue) - subtotal),
        };
      }
    }

    const schemeDiscount = 0;
    const taxableBase = subtotal - tradeDiscount - schemeDiscount;

    let gstAmount = 0;
    const lines: ComputedLine[] = partialLines.map((l) => {
      const discountShare = subtotal > 0 ? round2(((tradeDiscount + schemeDiscount) * l.lineSubtotal) / subtotal) : 0;
      const taxableValue = round2(l.lineSubtotal - discountShare);
      const gstRate = Number(l.product.gstRate);
      const lineGst = round2((taxableValue * gstRate) / 100);
      gstAmount += lineGst;
      const lineTotal = round2(taxableValue + lineGst);
      const marginPercent = l.mrpTotal > 0 ? round2((l.profitTotal / l.mrpTotal) * 100) : 0;

      return {
        productId: l.product.id,
        productName: l.product.name,
        brand: l.product.brand,
        packSize: l.product.packSize,
        imageUrl: l.product.imageUrl,
        unitsPerCase: l.product.unitsPerCase,
        mrpPerUnit: Number(l.product.mrpPerUnit),
        caseQty: l.caseQty,
        freeCaseQty: l.freeCaseQty,
        pricePerCase: l.pricePerCase,
        gstRate,
        lineSubtotal: l.lineSubtotal,
        lineDiscountShare: discountShare,
        taxableValue,
        lineGst,
        lineTotal,
        mrpTotal: l.mrpTotal,
        profitTotal: l.profitTotal,
        marginPercent,
        appliedFreeGoodsScheme: l.appliedFreeGoodsScheme,
        nextSlab: l.nextSlab,
      };
    });

    gstAmount = round2(gstAmount);
    const totalAmount = round2(taxableBase + gstAmount);

    return {
      lines,
      subtotal,
      tradeDiscount,
      schemeDiscount,
      gstAmount,
      totalAmount,
      totalMrpValue,
      totalProfit,
      appliedTradeScheme,
      appliedFreeGoodsSchemes,
      upsell,
    };
  }
}
