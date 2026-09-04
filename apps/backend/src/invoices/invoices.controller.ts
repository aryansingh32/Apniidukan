import { Controller, Get, Header, Param, Res, UseGuards } from '@nestjs/common';
import type { Response } from 'express';
import { InvoicesService } from './invoices.service';
import { RetailerAuthGuard } from '../common/guards/retailer-auth.guard';
import { RetailerApprovedGuard } from '../common/guards/retailer-approved.guard';
import { CurrentRetailerId } from '../common/decorators/current-retailer.decorator';

@Controller('orders/:orderId/invoice')
@UseGuards(RetailerAuthGuard, RetailerApprovedGuard)
export class InvoicesController {
  constructor(private service: InvoicesService) {}

  @Get()
  @Header('Content-Type', 'application/pdf')
  async download(@CurrentRetailerId() retailerId: string, @Param('orderId') orderId: string, @Res() res: Response) {
    const pdf = await this.service.getPdfForRetailer(retailerId, orderId);
    res.setHeader('Content-Disposition', `inline; filename="invoice-${orderId}.pdf"`);
    res.send(pdf);
  }
}
