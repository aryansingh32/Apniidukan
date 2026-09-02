import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { CartController } from './cart.controller';
import { CartService } from './cart.service';
import { RetailerAuthGuard } from '../common/guards/retailer-auth.guard';
import { RetailerApprovedGuard } from '../common/guards/retailer-approved.guard';
import { PricingModule } from '../pricing/pricing.module';

@Module({
  imports: [JwtModule.register({}), PricingModule],
  controllers: [CartController],
  providers: [CartService, RetailerAuthGuard, RetailerApprovedGuard],
  exports: [CartService],
})
export class CartModule {}
