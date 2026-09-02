import { createParamDecorator, ExecutionContext } from '@nestjs/common';

export const CurrentRetailer = createParamDecorator((_data: unknown, ctx: ExecutionContext) => {
  const request = ctx.switchToHttp().getRequest();
  return request.retailer;
});

export const CurrentRetailerId = createParamDecorator((_data: unknown, ctx: ExecutionContext) => {
  const request = ctx.switchToHttp().getRequest();
  return request.retailerId;
});

export const CurrentAdmin = createParamDecorator((_data: unknown, ctx: ExecutionContext) => {
  const request = ctx.switchToHttp().getRequest();
  return request.admin;
});
