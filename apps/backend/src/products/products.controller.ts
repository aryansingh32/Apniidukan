import { Controller, Get, Param, Query, UseGuards } from '@nestjs/common';
import { ProductsService } from './products.service';
import { RetailerAuthGuard } from '../common/guards/retailer-auth.guard';
import { RetailerApprovedGuard } from '../common/guards/retailer-approved.guard';

@Controller('products')
@UseGuards(RetailerAuthGuard, RetailerApprovedGuard)
export class ProductsController {
  constructor(private service: ProductsService) {}

  @Get()
  list(@Query('categoryId') categoryId?: string, @Query('search') search?: string, @Query('brand') brand?: string) {
    return this.service.list({ categoryId, search, brand });
  }

  @Get('barcode/:code')
  getByBarcode(@Param('code') code: string) {
    return this.service.getByBarcode(code);
  }

  @Get(':id')
  get(@Param('id') id: string) {
    return this.service.get(id);
  }
}
