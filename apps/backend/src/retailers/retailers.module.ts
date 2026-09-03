import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { RetailersController } from './retailers.controller';
import { AdminRetailersController } from './admin-retailers.controller';
import { RetailersService } from './retailers.service';
import { RetailerAuthGuard } from '../common/guards/retailer-auth.guard';
import { AdminAuthGuard } from '../common/guards/admin-auth.guard';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
  imports: [JwtModule.register({}), NotificationsModule],
  controllers: [RetailersController, AdminRetailersController],
  providers: [RetailersService, RetailerAuthGuard, AdminAuthGuard],
})
export class RetailersModule {}
