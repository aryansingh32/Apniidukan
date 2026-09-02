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
  updateStatus(@Param('id') id: string, @Body('status') status: OrderStatus, @Body('note') note?: string) {
    return this.service.adminUpdateStatus(id, status, note);
  }
}
