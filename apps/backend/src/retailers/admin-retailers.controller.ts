import { Body, Controller, Get, Param, Patch, Query, UseGuards } from '@nestjs/common';
import { RetailersService } from './retailers.service';
import { AdminAuthGuard } from '../common/guards/admin-auth.guard';
import { CurrentAdmin } from '../common/decorators/current-retailer.decorator';
import { RetailerStatus } from '@prisma/client';

@Controller('admin/retailers')
@UseGuards(AdminAuthGuard)
export class AdminRetailersController {
  constructor(private service: RetailersService) {}

  @Get()
  list(@Query('status') status?: RetailerStatus, @Query('search') search?: string) {
    return this.service.adminList(status, search);
  }

  @Get(':id')
  get(@Param('id') id: string) {
    return this.service.adminGet(id);
  }

  @Patch(':id/approve')
  approve(@Param('id') id: string, @CurrentAdmin() admin: { sub: string }) {
    return this.service.approve(id, admin.sub);
  }

  @Patch(':id/reject')
  reject(@Param('id') id: string, @Body('reason') reason: string, @CurrentAdmin() admin: { sub: string }) {
    return this.service.reject(id, admin.sub, reason);
  }

  @Patch(':id/suspend')
  suspend(@Param('id') id: string, @CurrentAdmin() admin: { sub: string }) {
    return this.service.suspend(id, admin.sub);
  }

  @Patch(':id/reactivate')
  reactivate(@Param('id') id: string, @CurrentAdmin() admin: { sub: string }) {
    return this.service.reactivate(id, admin.sub);
  }
}
