import { Body, Controller, Get, Param, Post, Query, UseGuards } from '@nestjs/common';
import { ExpiryClaimsService } from './expiry-claims.service';
import { AdminAuthGuard } from '../common/guards/admin-auth.guard';
import { CurrentAdmin } from '../common/decorators/current-retailer.decorator';
import { ExpiryClaimRejectionReason, ExpiryClaimStatus } from '@prisma/client';

@Controller('admin/expiry/claims')
@UseGuards(AdminAuthGuard)
export class AdminExpiryClaimsController {
  constructor(private service: ExpiryClaimsService) {}

  @Get()
  list(@Query('status') status?: ExpiryClaimStatus) {
    return this.service.adminList(status);
  }

  @Get(':id')
  get(@Param('id') id: string) {
    return this.service.adminGet(id);
  }

  @Post(':id/approve')
  approve(@Param('id') id: string, @Body('note') note: string | undefined, @CurrentAdmin() admin: { sub: string }) {
    return this.service.adminApprove(id, admin.sub, note);
  }

  @Post(':id/reject')
  reject(
    @Param('id') id: string,
    @Body('rejectionReasonCode') rejectionReasonCode: ExpiryClaimRejectionReason,
    @Body('note') note: string | undefined,
    @CurrentAdmin() admin: { sub: string },
  ) {
    return this.service.adminReject(id, admin.sub, rejectionReasonCode, note);
  }
}
