import { Body, Controller, Delete, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { SchemesService, UpsertSchemeDto } from './schemes.service';
import { AdminAuthGuard } from '../common/guards/admin-auth.guard';

@Controller('admin/schemes')
@UseGuards(AdminAuthGuard)
export class AdminSchemesController {
  constructor(private service: SchemesService) {}

  @Get()
  list() {
    return this.service.listAll();
  }

  @Post()
  create(@Body() dto: UpsertSchemeDto) {
    return this.service.create(dto);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: Partial<UpsertSchemeDto>) {
    return this.service.update(id, dto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.service.remove(id);
  }
}
