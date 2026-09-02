import { Body, Controller, Delete, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { CartService } from './cart.service';
import { RetailerAuthGuard } from '../common/guards/retailer-auth.guard';
import { RetailerApprovedGuard } from '../common/guards/retailer-approved.guard';
import { CurrentRetailerId } from '../common/decorators/current-retailer.decorator';

@Controller('cart')
@UseGuards(RetailerAuthGuard, RetailerApprovedGuard)
export class CartController {
  constructor(private service: CartService) {}

  @Get()
  get(@CurrentRetailerId() retailerId: string) {
    return this.service.getComputedCart(retailerId);
  }

  @Post('items')
  addItem(
    @CurrentRetailerId() retailerId: string,
    @Body('productId') productId: string,
    @Body('caseQty') caseQty: number,
  ) {
    return this.service.addItem(retailerId, productId, Number(caseQty));
  }

  @Patch('items/:productId')
  updateItem(
    @CurrentRetailerId() retailerId: string,
    @Param('productId') productId: string,
    @Body('caseQty') caseQty: number,
  ) {
    return this.service.updateItem(retailerId, productId, Number(caseQty));
  }

  @Delete('items/:productId')
  removeItem(@CurrentRetailerId() retailerId: string, @Param('productId') productId: string) {
    return this.service.removeItem(retailerId, productId);
  }

  @Delete()
  clear(@CurrentRetailerId() retailerId: string) {
    return this.service.clear(retailerId);
  }

  @Post('reorder/:orderId')
  reorder(@CurrentRetailerId() retailerId: string, @Param('orderId') orderId: string) {
    return this.service.addOrderToCart(retailerId, orderId);
  }
}
