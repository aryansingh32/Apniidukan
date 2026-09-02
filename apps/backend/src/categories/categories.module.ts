import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { CategoriesController } from './categories.controller';
import { AdminCategoriesController } from './admin-categories.controller';
import { CategoriesService } from './categories.service';
import { AdminAuthGuard } from '../common/guards/admin-auth.guard';

@Module({
  imports: [JwtModule.register({})],
  controllers: [CategoriesController, AdminCategoriesController],
  providers: [CategoriesService, AdminAuthGuard],
})
export class CategoriesModule {}
