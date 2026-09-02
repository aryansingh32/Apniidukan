import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { BannersController } from './banners.controller';
import { AdminBannersController } from './admin-banners.controller';
import { BannersService } from './banners.service';
import { AdminAuthGuard } from '../common/guards/admin-auth.guard';

@Module({
  imports: [JwtModule.register({})],
  controllers: [BannersController, AdminBannersController],
  providers: [BannersService, AdminAuthGuard],
})
export class BannersModule {}
