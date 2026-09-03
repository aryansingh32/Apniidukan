import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { SchemesController } from './schemes.controller';
import { AdminSchemesController } from './admin-schemes.controller';
import { SchemesService } from './schemes.service';
import { RetailerAuthGuard } from '../common/guards/retailer-auth.guard';
import { RetailerApprovedGuard } from '../common/guards/retailer-approved.guard';
import { AdminAuthGuard } from '../common/guards/admin-auth.guard';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
  imports: [JwtModule.register({}), NotificationsModule],
  controllers: [SchemesController, AdminSchemesController],
  providers: [SchemesService, RetailerAuthGuard, RetailerApprovedGuard, AdminAuthGuard],
  exports: [SchemesService],
})
export class SchemesModule {}
