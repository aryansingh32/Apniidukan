import { Body, Controller, Post, UseGuards } from '@nestjs/common';
import { NotificationsService } from './notifications.service';
import { AdminAuthGuard } from '../common/guards/admin-auth.guard';

@Controller('admin/notifications')
@UseGuards(AdminAuthGuard)
export class AdminNotificationsController {
  constructor(private service: NotificationsService) {}

  @Post('broadcast')
  broadcast(@Body('title') title: string, @Body('body') body: string) {
    return this.service.broadcastToApproved(title, body);
  }
}
