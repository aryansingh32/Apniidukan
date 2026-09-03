import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { NotificationsController } from './notifications.controller';
import { AdminNotificationsController } from './admin-notifications.controller';
import { NotificationsService } from './notifications.service';
import { RetailerAuthGuard } from '../common/guards/retailer-auth.guard';
import { AdminAuthGuard } from '../common/guards/admin-auth.guard';

@Module({
  imports: [JwtModule.register({})],
  controllers: [NotificationsController, AdminNotificationsController],
  providers: [NotificationsService, RetailerAuthGuard, AdminAuthGuard],
  exports: [NotificationsService],
})
export class NotificationsModule {}
