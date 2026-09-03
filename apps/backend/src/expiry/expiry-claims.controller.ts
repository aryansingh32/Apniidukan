import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { ExpiryClaimsService, SubmitClaimDto } from './expiry-claims.service';
import { RetailerAuthGuard } from '../common/guards/retailer-auth.guard';
import { RetailerApprovedGuard } from '../common/guards/retailer-approved.guard';
import { CurrentRetailerId } from '../common/decorators/current-retailer.decorator';

@Controller('expiry')
@UseGuards(RetailerAuthGuard, RetailerApprovedGuard)
export class ExpiryClaimsController {
  constructor(private service: ExpiryClaimsService) {}

  @Get('my-stock')
  myStock(@CurrentRetailerId() retailerId: string) {
    return this.service.myStock(retailerId);
  }

  @Get('claims')
  list(@CurrentRetailerId() retailerId: string) {
    return this.service.retailerList(retailerId);
  }

  @Post('claims')
  submit(@CurrentRetailerId() retailerId: string, @Body() dto: SubmitClaimDto) {
    return this.service.submit(retailerId, dto);
  }

  @Get('claims/:id')
  get(@CurrentRetailerId() retailerId: string, @Param('id') id: string) {
    return this.service.retailerGet(retailerId, id);
  }
}
