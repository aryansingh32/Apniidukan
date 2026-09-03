import { Body, Controller, Get, Param, Patch, Query, UseGuards } from '@nestjs/common';
import { OrdersService } from './orders.service';
import { AdminAuthGuard } from '../common/guards/admin-auth.guard';
import { OrderStatus } from '@prisma/client';

@Controller('admin/orders')
@UseGuards(AdminAuthGuard)
export class AdminOrdersController {
  constructor(private service: OrdersService) {}

  @Get()
  list(@Query('status') status?: OrderStatus) {
    return this.service.adminList(status);
  }

  @Get(':id')
  get(@Param('id') id: string) {
    return this.service.adminGet(id);
  }

  @Patch(':id/status')
  updateStatus(
    @Param('id') id: string,
    @Body('status') status: OrderStatus,
    @Body('note') note?: string,
    @Body('otp') otp?: string,
  ) {
    return this.service.adminUpdateStatus(id, status, note, otp);
  }

  @Patch(':id/delivery-otp-toggle')
  setRequiresDeliveryOtp(@Param('id') id: string, @Body('requiresDeliveryOtp') requiresDeliveryOtp: boolean) {
    return this.service.adminSetRequiresDeliveryOtp(id, requiresDeliveryOtp);
  }
}
