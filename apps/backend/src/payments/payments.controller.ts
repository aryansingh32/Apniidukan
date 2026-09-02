import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { PaymentsService } from './payments.service';
import { RetailerAuthGuard } from '../common/guards/retailer-auth.guard';
import { RetailerApprovedGuard } from '../common/guards/retailer-approved.guard';
import { CurrentRetailerId } from '../common/decorators/current-retailer.decorator';

@Controller('orders/:orderId/payment')
@UseGuards(RetailerAuthGuard, RetailerApprovedGuard)
export class PaymentsController {
  constructor(private service: PaymentsService) {}

  @Get()
  get(@CurrentRetailerId() retailerId: string, @Param('orderId') orderId: string) {
    return this.service.getForOrder(retailerId, orderId);
  }

  @Post('utr')
  submitUtr(
    @CurrentRetailerId() retailerId: string,
    @Param('orderId') orderId: string,
    @Body('utr') utr: string,
    @Body('screenshotUrl') screenshotUrl?: string,
  ) {
    return this.service.submitUtr(retailerId, orderId, utr, screenshotUrl);
  }
}
