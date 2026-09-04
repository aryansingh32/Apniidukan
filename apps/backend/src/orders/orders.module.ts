import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule } from '@nestjs/config';
import { OrdersController } from './orders.controller';
import { AdminOrdersController } from './admin-orders.controller';
import { OrdersService } from './orders.service';
import { RetailerAuthGuard } from '../common/guards/retailer-auth.guard';
import { RetailerApprovedGuard } from '../common/guards/retailer-approved.guard';
import { AdminAuthGuard } from '../common/guards/admin-auth.guard';
import { PricingModule } from '../pricing/pricing.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { ExpiryModule } from '../expiry/expiry.module';
import { InvoicesModule } from '../invoices/invoices.module';

@Module({
  imports: [JwtModule.register({}), ConfigModule, PricingModule, NotificationsModule, ExpiryModule, InvoicesModule],
  controllers: [OrdersController, AdminOrdersController],
  providers: [OrdersService, RetailerAuthGuard, RetailerApprovedGuard, AdminAuthGuard],
  exports: [OrdersService],
})
export class OrdersModule {}
