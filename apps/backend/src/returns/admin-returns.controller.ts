import { Body, Controller, Get, Param, Post, Query, UseGuards } from '@nestjs/common';
import { ReturnsService } from './returns.service';
import { AdminAuthGuard } from '../common/guards/admin-auth.guard';
import { CurrentAdmin } from '../common/decorators/current-retailer.decorator';
import { ReturnStatus } from '@prisma/client';

@Controller('admin/returns')
@UseGuards(AdminAuthGuard)
export class AdminReturnsController {
  constructor(private service: ReturnsService) {}

  @Get()
  list(@Query('status') status?: ReturnStatus) {
    return this.service.adminList(status);
  }

  @Get(':id')
  get(@Param('id') id: string) {
    return this.service.adminGet(id);
  }

  @Post(':id/approve')
  approve(@Param('id') id: string, @CurrentAdmin() admin: { sub: string }) {
    return this.service.adminApprove(id, admin.sub);
  }

  @Post(':id/reject')
  reject(@Param('id') id: string, @Body('reason') reason: string, @CurrentAdmin() admin: { sub: string }) {
    return this.service.adminReject(id, admin.sub, reason);
  }
}
