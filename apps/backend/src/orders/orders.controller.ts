import { Body, Controller, Get, Param, Post, Query, UseGuards } from '@nestjs/common';
import { OrdersService } from './orders.service';
import { RetailerAuthGuard } from '../common/guards/retailer-auth.guard';
import { RetailerApprovedGuard } from '../common/guards/retailer-approved.guard';
import { CurrentRetailerId } from '../common/decorators/current-retailer.decorator';
import { PaymentMethod } from '@prisma/client';

@Controller('orders')
@UseGuards(RetailerAuthGuard, RetailerApprovedGuard)
export class OrdersController {
  constructor(private service: OrdersService) {}

  @Post()
  checkout(
    @CurrentRetailerId() retailerId: string,
    @Body('deliverySlotId') deliverySlotId: string,
    @Body('deliveryDate') deliveryDate?: string,
    @Body('paymentMethod') paymentMethod?: PaymentMethod,
    @Body('idempotencyKey') idempotencyKey?: string,
  ) {
    return this.service.checkout(retailerId, deliverySlotId, deliveryDate, paymentMethod ?? PaymentMethod.UPI, idempotencyKey);
  }

  @Get('quick-reorder')
  quickReorder(@CurrentRetailerId() retailerId: string) {
    return this.service.quickReorder(retailerId);
  }

  @Get()
  list(@CurrentRetailerId() retailerId: string, @Query('tab') tab?: 'active' | 'completed' | 'cancelled') {
    return this.service.list(retailerId, tab);
  }

  @Get(':id')
  get(@CurrentRetailerId() retailerId: string, @Param('id') id: string) {
    return this.service.get(retailerId, id);
  }
}
