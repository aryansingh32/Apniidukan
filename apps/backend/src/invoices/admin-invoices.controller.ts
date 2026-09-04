import { Controller, Get, Header, Param, Res, UseGuards } from '@nestjs/common';
import type { Response } from 'express';
import { InvoicesService } from './invoices.service';
import { AdminAuthGuard } from '../common/guards/admin-auth.guard';

@Controller('admin/orders/:orderId/invoice')
@UseGuards(AdminAuthGuard)
export class AdminInvoicesController {
  constructor(private service: InvoicesService) {}

  @Get()
  @Header('Content-Type', 'application/pdf')
  async download(@Param('orderId') orderId: string, @Res() res: Response) {
    const pdf = await this.service.getPdfForAdmin(orderId);
    res.setHeader('Content-Disposition', `inline; filename="invoice-${orderId}.pdf"`);
    res.send(pdf);
  }
}
