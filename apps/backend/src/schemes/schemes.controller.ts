import { Controller, Get, UseGuards } from '@nestjs/common';
import { SchemesService } from './schemes.service';
import { RetailerAuthGuard } from '../common/guards/retailer-auth.guard';
import { RetailerApprovedGuard } from '../common/guards/retailer-approved.guard';

@Controller('schemes')
@UseGuards(RetailerAuthGuard, RetailerApprovedGuard)
export class SchemesController {
  constructor(private service: SchemesService) {}

  @Get()
  list() {
    return this.service.listActive();
  }
}
