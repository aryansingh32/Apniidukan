import { Body, Controller, Get, Param, Post, Query, UseGuards } from '@nestjs/common';
import { PaymentsService } from './payments.service';
import { AdminAuthGuard } from '../common/guards/admin-auth.guard';
import { CurrentAdmin } from '../common/decorators/current-retailer.decorator';
import { PaymentStatus } from '@prisma/client';

@Controller('admin/payments')
@UseGuards(AdminAuthGuard)
export class AdminPaymentsController {
  constructor(private service: PaymentsService) {}

  @Get()
  list(@Query('status') status?: PaymentStatus) {
    return this.service.adminList(status);
  }

  @Post(':id/approve')
  approve(@Param('id') id: string, @CurrentAdmin() admin: { sub: string }) {
    return this.service.adminApprove(id, admin.sub);
  }

  @Post(':id/reject')
  reject(@Param('id') id: string, @Body('reason') reason: string, @CurrentAdmin() admin: { sub: string }) {
    return this.service.adminReject(id, admin.sub, reason);
  }

  @Post(':id/mark-cod-collected')
  markCodCollected(@Param('id') id: string, @CurrentAdmin() admin: { sub: string }) {
    return this.service.adminMarkCodCollected(id, admin.sub);
  }
}
