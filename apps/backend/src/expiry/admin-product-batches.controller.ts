import { Body, Controller, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { CreateBatchDto, ProductBatchesService, UpdateBatchDto } from './product-batches.service';
import { AdminAuthGuard } from '../common/guards/admin-auth.guard';
import { CurrentAdmin } from '../common/decorators/current-retailer.decorator';

@Controller('admin/products/:productId/batches')
@UseGuards(AdminAuthGuard)
export class AdminProductBatchesController {
  constructor(private service: ProductBatchesService) {}

  @Get()
  list(@Param('productId') productId: string) {
    return this.service.adminList(productId);
  }

  @Post()
  create(@Param('productId') productId: string, @Body() dto: CreateBatchDto, @CurrentAdmin() admin: { sub: string }) {
    return this.service.adminCreate(productId, dto, admin.sub);
  }
}

@Controller('admin/batches')
@UseGuards(AdminAuthGuard)
export class AdminBatchesController {
  constructor(private service: ProductBatchesService) {}

  @Get(':id')
  get(@Param('id') id: string) {
    return this.service.adminGet(id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateBatchDto, @CurrentAdmin() admin: { sub: string }) {
    return this.service.adminUpdate(id, dto, admin.sub);
  }
}
