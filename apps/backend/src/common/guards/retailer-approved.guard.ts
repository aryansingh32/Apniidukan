import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class RetailerApprovedGuard implements CanActivate {
  constructor(private prisma: PrismaService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const retailer = await this.prisma.retailer.findUnique({ where: { id: request.retailerId } });
    if (!retailer) throw new ForbiddenException('Retailer not found');
    if (retailer.status !== 'APPROVED') {
      throw new ForbiddenException(`Your account is ${retailer.status.toLowerCase()}. Marketplace access requires admin approval.`);
    }
    request.retailer = retailer;
    return true;
  }
}
