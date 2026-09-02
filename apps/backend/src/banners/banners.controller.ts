import { Controller, Get } from '@nestjs/common';
import { BannersService } from './banners.service';

@Controller('banners')
export class BannersController {
  constructor(private service: BannersService) {}

  @Get()
  list() {
    return this.service.listActive();
  }
}
