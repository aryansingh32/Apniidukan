import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule } from '@nestjs/config';
import { ReturnsService } from './returns.service';
import { ReturnsController, CreditNotesController } from './returns.controller';
import { AdminReturnsController } from './admin-returns.controller';
import { RetailerAuthGuard } from '../common/guards/retailer-auth.guard';
import { RetailerApprovedGuard } from '../common/guards/retailer-approved.guard';
import { AdminAuthGuard } from '../common/guards/admin-auth.guard';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
  imports: [JwtModule.register({}), ConfigModule, NotificationsModule],
  controllers: [ReturnsController, CreditNotesController, AdminReturnsController],
  providers: [ReturnsService, RetailerAuthGuard, RetailerApprovedGuard, AdminAuthGuard],
})
export class ReturnsModule {}
