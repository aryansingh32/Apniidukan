import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
import { OrderStatus } from '@prisma/client';

// eslint-disable-next-line @typescript-eslint/no-var-requires
const PDFDocument = require('pdfkit');

const INVOICE_ELIGIBLE_STATUSES: OrderStatus[] = [
  OrderStatus.CONFIRMED,
  OrderStatus.PICKING,
  OrderStatus.PACKED,
  OrderStatus.DISPATCHED,
  OrderStatus.OUT_FOR_DELIVERY,
  OrderStatus.DELIVERED,
];

@Injectable()
export class InvoicesService {
  constructor(
    private prisma: PrismaService,
    private config: ConfigService,
  ) {}

  private async generateInvoiceNumber(): Promise<string> {
    const count = await this.prisma.invoice.count();
    return `INV${(50001 + count).toString()}`;
  }

  /** Creates the Invoice record the first time it's needed (idempotent). */
  async ensureForOrder(orderId: string) {
    const existing = await this.prisma.invoice.findUnique({ where: { orderId } });
    if (existing) return existing;

    const order = await this.prisma.order.findUnique({ where: { id: orderId } });
    if (!order) throw new NotFoundException('Order not found');
    if (!INVOICE_ELIGIBLE_STATUSES.includes(order.status)) {
      throw new BadRequestException('Invoice is generated once the order is confirmed');
    }

    const invoiceNumber = await this.generateInvoiceNumber();
    const discountTotal = Number(order.tradeDiscount) + Number(order.schemeDiscount);
    const taxableAmount = Number(order.subtotal) - discountTotal;
    const gstAmount = Number(order.gstAmount);

    return this.prisma.invoice.create({
      data: {
        invoiceNumber,
        orderId: order.id,
        retailerId: order.retailerId,
        subtotal: order.subtotal,
        discountTotal,
        taxableAmount,
        cgstAmount: gstAmount / 2,
        sgstAmount: gstAmount / 2,
        igstAmount: 0,
        totalAmount: order.totalAmount,
      },
    });
  }

  async getPdfForRetailer(retailerId: string, orderId: string): Promise<Buffer> {
    const order = await this.prisma.order.findFirst({ where: { id: orderId, retailerId } });
    if (!order) throw new NotFoundException('Order not found');
    return this.buildPdf(orderId);
  }

  async getPdfForAdmin(orderId: string): Promise<Buffer> {
    return this.buildPdf(orderId);
  }

  private async buildPdf(orderId: string): Promise<Buffer> {
    const invoice = await this.ensureForOrder(orderId);

    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      include: {
        retailer: true,
        items: { include: { product: true } },
      },
    });
    if (!order) throw new NotFoundException('Order not found');

    const companyName = this.config.get<string>('COMPANY_NAME') ?? 'Apniidukan Distributors Pvt. Ltd.';
    const companyGstin = this.config.get<string>('COMPANY_GSTIN') ?? '27ABCDE1234F1Z5';
    const companyAddress = this.config.get<string>('COMPANY_ADDRESS') ?? 'Plot 12, MIDC Industrial Area, Mumbai, Maharashtra 400001';

    return new Promise((resolve, reject) => {
      const doc = new PDFDocument({ size: 'A4', margin: 40 });
      const chunks: Buffer[] = [];
      doc.on('data', (c: Buffer) => chunks.push(c));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);

      doc.fontSize(18).font('Helvetica-Bold').text('TAX INVOICE', { align: 'center' });
      doc.moveDown(0.5);

      doc.fontSize(10).font('Helvetica-Bold').text(companyName);
      doc.font('Helvetica').fontSize(9).text(companyAddress);
      doc.text(`GSTIN: ${companyGstin}`);
      doc.moveDown(0.8);

      const topY = doc.y;
      doc.font('Helvetica-Bold').fontSize(10).text('Invoice No:', 40, topY, { continued: true }).font('Helvetica').text(` ${invoice.invoiceNumber}`);
      doc.font('Helvetica-Bold').text('Invoice Date:', 40, doc.y, { continued: true }).font('Helvetica').text(` ${invoice.generatedAt.toLocaleDateString('en-IN')}`);
      doc.font('Helvetica-Bold').text('Order No:', 40, doc.y, { continued: true }).font('Helvetica').text(` ${order.orderNumber}`);

      doc.font('Helvetica-Bold').fontSize(10).text('Bill To:', 320, topY);
      doc.font('Helvetica').fontSize(9);
      doc.text(order.retailer.shopName ?? order.retailer.ownerName ?? '—', 320);
      doc.text(order.retailer.ownerName ?? '', 320);
      doc.text([order.retailer.address, order.retailer.city, order.retailer.pincode].filter(Boolean).join(', '), 320, doc.y, { width: 230 });
      if (order.retailer.gstin) doc.text(`GSTIN: ${order.retailer.gstin}`, 320);

      doc.moveDown(1.5);

      const tableTop = doc.y;
      const cols = { sn: 40, name: 70, hsn: 240, qty: 300, rate: 340, taxable: 400, gst: 460, total: 510 };
      doc.font('Helvetica-Bold').fontSize(8);
      doc.text('#', cols.sn, tableTop);
      doc.text('Item', cols.name, tableTop);
      doc.text('HSN', cols.hsn, tableTop);
      doc.text('Qty', cols.qty, tableTop);
      doc.text('Rate', cols.rate, tableTop);
      doc.text('Taxable', cols.taxable, tableTop);
      doc.text('GST%', cols.gst, tableTop);
      doc.text('Total', cols.total, tableTop);
      doc.moveTo(40, tableTop + 12).lineTo(560, tableTop + 12).strokeColor('#cccccc').stroke();

      let y = tableTop + 18;
      doc.font('Helvetica').fontSize(8);
      order.items.forEach((item, idx) => {
        const totalQty = item.caseQty + item.freeCaseQty;
        doc.text(String(idx + 1), cols.sn, y);
        doc.text(`${item.productNameSnapshot} (${item.packSizeSnapshot})`, cols.name, y, { width: 165 });
        doc.text(item.product?.hsnCode ?? '—', cols.hsn, y);
        doc.text(String(totalQty), cols.qty, y);
        doc.text(Number(item.pricePerCase).toFixed(2), cols.rate, y);
        doc.text(Number(item.lineSubtotal).toFixed(2), cols.taxable, y);
        doc.text(`${Number(item.gstRate).toFixed(1)}%`, cols.gst, y);
        doc.text(Number(item.lineTotal).toFixed(2), cols.total, y);
        y += 16;
      });

      doc.moveTo(40, y + 4).lineTo(560, y + 4).strokeColor('#cccccc').stroke();
      y += 14;

      const summaryX = 400;
      doc.font('Helvetica').fontSize(9);
      const row = (label: string, value: string, bold = false) => {
        doc.font(bold ? 'Helvetica-Bold' : 'Helvetica').text(label, summaryX, y, { width: 90, continued: true });
        doc.text(value, { align: 'right', width: 70 });
        y += 14;
      };
      row('Subtotal', `Rs ${Number(invoice.subtotal).toFixed(2)}`);
      if (Number(invoice.discountTotal) > 0) row('Discount', `- Rs ${Number(invoice.discountTotal).toFixed(2)}`);
      row('Taxable Amount', `Rs ${Number(invoice.taxableAmount).toFixed(2)}`);
      row('CGST', `Rs ${Number(invoice.cgstAmount).toFixed(2)}`);
      row('SGST', `Rs ${Number(invoice.sgstAmount).toFixed(2)}`);
      row('Total Payable', `Rs ${Number(invoice.totalAmount).toFixed(2)}`, true);

      doc.moveDown(3);
      doc.fontSize(7).fillColor('#888888').text('This is a system-generated invoice and does not require a signature.', 40, doc.y, { align: 'center', width: 520 });

      doc.end();
    });
  }
}
