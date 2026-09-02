import { Body, Controller, Delete, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { CategoriesService, UpsertCategoryDto } from './categories.service';
import { AdminAuthGuard } from '../common/guards/admin-auth.guard';

@Controller('admin/categories')
@UseGuards(AdminAuthGuard)
export class AdminCategoriesController {
  constructor(private service: CategoriesService) {}

  @Post()
  create(@Body() dto: UpsertCategoryDto) {
    return this.service.create(dto);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: Partial<UpsertCategoryDto>) {
    return this.service.update(id, dto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.service.remove(id);
  }
}
