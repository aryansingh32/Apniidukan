import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { NotificationsService } from './notifications.service';
import { RetailerAuthGuard } from '../common/guards/retailer-auth.guard';
import { CurrentRetailerId } from '../common/decorators/current-retailer.decorator';

@Controller('notifications')
@UseGuards(RetailerAuthGuard)
export class NotificationsController {
  constructor(private service: NotificationsService) {}

  @Get()
  list(@CurrentRetailerId() retailerId: string) {
    return this.service.list(retailerId);
  }

  @Get('unread-count')
  async unreadCount(@CurrentRetailerId() retailerId: string) {
    const count = await this.service.unreadCount(retailerId);
    return { count };
  }

  @Post(':id/read')
  markRead(@CurrentRetailerId() retailerId: string, @Param('id') id: string) {
    return this.service.markRead(retailerId, id);
  }

  @Post('read-all')
  markAllRead(@CurrentRetailerId() retailerId: string) {
    return this.service.markAllRead(retailerId);
  }
}
