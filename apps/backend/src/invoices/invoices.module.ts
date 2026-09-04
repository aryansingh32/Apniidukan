import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule } from '@nestjs/config';
import { InvoicesService } from './invoices.service';
import { InvoicesController } from './invoices.controller';
import { AdminInvoicesController } from './admin-invoices.controller';
import { RetailerAuthGuard } from '../common/guards/retailer-auth.guard';
import { RetailerApprovedGuard } from '../common/guards/retailer-approved.guard';
import { AdminAuthGuard } from '../common/guards/admin-auth.guard';

@Module({
  imports: [JwtModule.register({}), ConfigModule],
  controllers: [InvoicesController, AdminInvoicesController],
  providers: [InvoicesService, RetailerAuthGuard, RetailerApprovedGuard, AdminAuthGuard],
  exports: [InvoicesService],
})
export class InvoicesModule {}
