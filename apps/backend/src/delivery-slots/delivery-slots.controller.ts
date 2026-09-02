import { Controller, Get } from '@nestjs/common';
import { DeliverySlotsService } from './delivery-slots.service';

@Controller('delivery-slots')
export class DeliverySlotsController {
  constructor(private service: DeliverySlotsService) {}

  @Get()
  list() {
    return this.service.listActive();
  }
}
