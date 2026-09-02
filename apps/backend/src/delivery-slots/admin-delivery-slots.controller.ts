import { Body, Controller, Delete, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { DeliverySlotsService, UpsertDeliverySlotDto } from './delivery-slots.service';
import { AdminAuthGuard } from '../common/guards/admin-auth.guard';

@Controller('admin/delivery-slots')
@UseGuards(AdminAuthGuard)
export class AdminDeliverySlotsController {
  constructor(private service: DeliverySlotsService) {}

  @Get()
  list() {
    return this.service.listAll();
  }

  @Post()
  create(@Body() dto: UpsertDeliverySlotDto) {
    return this.service.create(dto);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: Partial<UpsertDeliverySlotDto>) {
    return this.service.update(id, dto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.service.remove(id);
  }
}
