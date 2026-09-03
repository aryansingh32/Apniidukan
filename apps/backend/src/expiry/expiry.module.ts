import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { AdminProductBatchesController, AdminBatchesController } from './admin-product-batches.controller';
import { AdminExpiryCenterController } from './admin-expiry-center.controller';
import { AdminExpiryClaimsController } from './admin-expiry-claims.controller';
import { ExpiryClaimsController } from './expiry-claims.controller';
import { ProductBatchesService } from './product-batches.service';
import { FefoAllocationService } from './fefo-allocation.service';
import { InventoryLedgerService } from './inventory-ledger.service';
import { ExpiryPolicyService } from './expiry-policy.service';
import { ExpiryClaimsService } from './expiry-claims.service';
import { ExpiryCenterService } from './expiry-center.service';
import { ExpiryNotificationSweepService } from './expiry-notification-sweep.service';
import { RetailerAuthGuard } from '../common/guards/retailer-auth.guard';
import { RetailerApprovedGuard } from '../common/guards/retailer-approved.guard';
import { AdminAuthGuard } from '../common/guards/admin-auth.guard';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
  imports: [JwtModule.register({}), NotificationsModule],
  controllers: [
    AdminProductBatchesController,
    AdminBatchesController,
    AdminExpiryCenterController,
    AdminExpiryClaimsController,
    ExpiryClaimsController,
  ],
  providers: [
    ProductBatchesService,
    FefoAllocationService,
    InventoryLedgerService,
    ExpiryPolicyService,
    ExpiryClaimsService,
    ExpiryCenterService,
    ExpiryNotificationSweepService,
    RetailerAuthGuard,
    RetailerApprovedGuard,
    AdminAuthGuard,
  ],
  exports: [ProductBatchesService, FefoAllocationService, InventoryLedgerService, ExpiryPolicyService],
})
export class ExpiryModule {}
