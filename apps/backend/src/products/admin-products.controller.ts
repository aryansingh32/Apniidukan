import { Body, Controller, Delete, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { BulkSlabDto, ProductsService, UpsertProductDto } from './products.service';
import { AdminAuthGuard } from '../common/guards/admin-auth.guard';

@Controller('admin/products')
@UseGuards(AdminAuthGuard)
export class AdminProductsController {
  constructor(private service: ProductsService) {}

  @Get()
  list() {
    return this.service.list({ onlyActive: false });
  }

  @Get(':id')
  get(@Param('id') id: string) {
    return this.service.get(id);
  }

  @Post()
  create(@Body() dto: UpsertProductDto) {
    return this.service.create(dto);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: Partial<UpsertProductDto>) {
    return this.service.update(id, dto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.service.remove(id);
  }

  @Post(':id/slabs')
  addSlab(@Param('id') id: string, @Body() dto: BulkSlabDto) {
    return this.service.addSlab(id, dto);
  }

  @Delete('slabs/:slabId')
  removeSlab(@Param('slabId') slabId: string) {
    return this.service.removeSlab(slabId);
  }
}
