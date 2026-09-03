import { Body, Controller, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { ExpiryBucket } from '@prisma/client';
import { ExpiryCenterService } from './expiry-center.service';
import { ExpiryPolicyService, UpdatePolicyDto } from './expiry-policy.service';
import { ExpiryNotificationSweepService } from './expiry-notification-sweep.service';
import { AdminAuthGuard } from '../common/guards/admin-auth.guard';
import { CurrentAdmin } from '../common/decorators/current-retailer.decorator';

@Controller('admin/expiry')
@UseGuards(AdminAuthGuard)
export class AdminExpiryCenterController {
  constructor(
    private center: ExpiryCenterService,
    private policy: ExpiryPolicyService,
    private sweep: ExpiryNotificationSweepService,
  ) {}

  @Get('center')
  summary() {
    return this.center.summary();
  }

  @Get('batches')
  listByBucket(@Query('bucket') bucket?: ExpiryBucket) {
    return this.center.listByBucket(bucket);
  }

  @Get('batches/:id')
  batchDetail(@Param('id') id: string) {
    return this.center.batchDetail(id);
  }

  @Get('policy')
  getPolicy() {
    return this.policy.get();
  }

  @Patch('policy')
  updatePolicy(@Body() dto: UpdatePolicyDto, @CurrentAdmin() admin: { sub: string }) {
    return this.policy.update(dto, admin.sub);
  }

  @Post('run-checks')
  runChecks() {
    return this.sweep.run();
  }
}
