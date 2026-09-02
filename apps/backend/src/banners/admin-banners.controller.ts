import { Body, Controller, Delete, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { BannersService, UpsertBannerDto } from './banners.service';
import { AdminAuthGuard } from '../common/guards/admin-auth.guard';

@Controller('admin/banners')
@UseGuards(AdminAuthGuard)
export class AdminBannersController {
  constructor(private service: BannersService) {}

  @Get()
  list() {
    return this.service.listAll();
  }

  @Post()
  create(@Body() dto: UpsertBannerDto) {
    return this.service.create(dto);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: Partial<UpsertBannerDto>) {
    return this.service.update(id, dto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.service.remove(id);
  }
}
