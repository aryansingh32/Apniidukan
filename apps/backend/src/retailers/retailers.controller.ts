import { Body, Controller, Get, Patch, UseGuards } from '@nestjs/common';
import { RetailersService, RegisterRetailerDto } from './retailers.service';
import { RetailerAuthGuard } from '../common/guards/retailer-auth.guard';
import { CurrentRetailerId } from '../common/decorators/current-retailer.decorator';

@Controller('retailers')
@UseGuards(RetailerAuthGuard)
export class RetailersController {
  constructor(private service: RetailersService) {}

  @Get('me')
  getMe(@CurrentRetailerId() retailerId: string) {
    return this.service.getMe(retailerId);
  }

  @Patch('me')
  register(@CurrentRetailerId() retailerId: string, @Body() dto: RegisterRetailerDto) {
    return this.service.register(retailerId, dto);
  }
}
