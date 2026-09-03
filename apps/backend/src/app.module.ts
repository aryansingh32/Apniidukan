import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ScheduleModule } from '@nestjs/schedule';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './auth/auth.module';
import { AdminAuthModule } from './admin-auth/admin-auth.module';
import { RetailersModule } from './retailers/retailers.module';
import { CategoriesModule } from './categories/categories.module';
import { ProductsModule } from './products/products.module';
import { SchemesModule } from './schemes/schemes.module';
import { BannersModule } from './banners/banners.module';
import { DeliverySlotsModule } from './delivery-slots/delivery-slots.module';
import { CartModule } from './cart/cart.module';
import { OrdersModule } from './orders/orders.module';
import { PaymentsModule } from './payments/payments.module';
import { PricingModule } from './pricing/pricing.module';
import { DashboardModule } from './dashboard/dashboard.module';
import { NotificationsModule } from './notifications/notifications.module';
import { ExpiryModule } from './expiry/expiry.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    ScheduleModule.forRoot(),
    PrismaModule,
    PricingModule,
    NotificationsModule,
    ExpiryModule,
    AuthModule,
    AdminAuthModule,
    RetailersModule,
    CategoriesModule,
    ProductsModule,
    SchemesModule,
    BannersModule,
    DeliverySlotsModule,
    CartModule,
    OrdersModule,
    PaymentsModule,
    DashboardModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
