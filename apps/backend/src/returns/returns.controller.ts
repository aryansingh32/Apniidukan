import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { ReturnsService } from './returns.service';
import { RetailerAuthGuard } from '../common/guards/retailer-auth.guard';
import { RetailerApprovedGuard } from '../common/guards/retailer-approved.guard';
import { CurrentRetailerId } from '../common/decorators/current-retailer.decorator';
import { ReturnReason } from '@prisma/client';

@Controller('returns')
@UseGuards(RetailerAuthGuard, RetailerApprovedGuard)
export class ReturnsController {
  constructor(private service: ReturnsService) {}

  @Post()
  submit(
    @CurrentRetailerId() retailerId: string,
    @Body('orderItemId') orderItemId: string,
    @Body('qty') qty: number,
    @Body('reason') reason: ReturnReason,
    @Body('note') note?: string,
    @Body('photoUrl') photoUrl?: string,
  ) {
    return this.service.submit(retailerId, orderItemId, Number(qty), reason, note, photoUrl);
  }

  @Get()
  list(@CurrentRetailerId() retailerId: string) {
    return this.service.list(retailerId);
  }

  @Get(':id')
  get(@CurrentRetailerId() retailerId: string, @Param('id') id: string) {
    return this.service.get(retailerId, id);
  }
}

@Controller('credit-notes')
@UseGuards(RetailerAuthGuard, RetailerApprovedGuard)
export class CreditNotesController {
  constructor(private service: ReturnsService) {}

  @Get()
  list(@CurrentRetailerId() retailerId: string) {
    return this.service.listCreditNotes(retailerId);
  }
}
