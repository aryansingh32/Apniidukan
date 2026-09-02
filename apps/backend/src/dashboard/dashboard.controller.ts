import { Controller, Get, UseGuards } from '@nestjs/common';
import { DashboardService } from './dashboard.service';
import { AdminAuthGuard } from '../common/guards/admin-auth.guard';

@Controller('admin/dashboard')
@UseGuards(AdminAuthGuard)
export class DashboardController {
  constructor(private service: DashboardService) {}

  @Get()
  summary() {
    return this.service.summary();
  }
}
