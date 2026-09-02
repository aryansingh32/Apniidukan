import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { ProductsController } from './products.controller';
import { AdminProductsController } from './admin-products.controller';
import { ProductsService } from './products.service';
import { RetailerAuthGuard } from '../common/guards/retailer-auth.guard';
import { RetailerApprovedGuard } from '../common/guards/retailer-approved.guard';
import { AdminAuthGuard } from '../common/guards/admin-auth.guard';
import { PricingModule } from '../pricing/pricing.module';

@Module({
  imports: [JwtModule.register({}), PricingModule],
  controllers: [ProductsController, AdminProductsController],
  providers: [ProductsService, RetailerAuthGuard, RetailerApprovedGuard, AdminAuthGuard],
  exports: [ProductsService],
})
export class ProductsModule {}
