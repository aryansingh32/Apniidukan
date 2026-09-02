import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { DeliverySlotsController } from './delivery-slots.controller';
import { AdminDeliverySlotsController } from './admin-delivery-slots.controller';
import { DeliverySlotsService } from './delivery-slots.service';
import { AdminAuthGuard } from '../common/guards/admin-auth.guard';

@Module({
  imports: [JwtModule.register({})],
  controllers: [DeliverySlotsController, AdminDeliverySlotsController],
  providers: [DeliverySlotsService, AdminAuthGuard],
  exports: [DeliverySlotsService],
})
export class DeliverySlotsModule {}
