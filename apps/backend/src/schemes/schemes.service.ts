import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { SchemeType } from '@prisma/client';

export interface UpsertSchemeDto {
  title: string;
  description: string;
  type: SchemeType;
  minOrderValue?: number;
  discountPercent?: number;
  flatDiscount?: number;
  productId?: string;
  buyQty?: number;
  freeQty?: number;
  startDate: string;
  endDate: string;
  active?: boolean;
  imageUrl?: string;
  maxUsagePerRetailer?: number;
}

@Injectable()
export class SchemesService {
  constructor(private prisma: PrismaService) {}

  async listActive() {
    const now = new Date();
    return this.prisma.scheme.findMany({
      where: { active: true, startDate: { lte: now }, endDate: { gte: now } },
      include: { product: true },
      orderBy: { createdAt: 'desc' },
    });
  }

  listAll() {
    return this.prisma.scheme.findMany({ include: { product: true }, orderBy: { createdAt: 'desc' } });
  }

  create(dto: UpsertSchemeDto) {
    return this.prisma.scheme.create({
      data: { ...dto, startDate: new Date(dto.startDate), endDate: new Date(dto.endDate) },
    });
  }

  async update(id: string, dto: Partial<UpsertSchemeDto>) {
    await this.ensureExists(id);
    return this.prisma.scheme.update({
      where: { id },
      data: {
        ...dto,
        startDate: dto.startDate ? new Date(dto.startDate) : undefined,
        endDate: dto.endDate ? new Date(dto.endDate) : undefined,
      },
    });
  }

  async remove(id: string) {
    await this.ensureExists(id);
    await this.prisma.scheme.delete({ where: { id } });
    return { success: true };
  }

  private async ensureExists(id: string) {
    const scheme = await this.prisma.scheme.findUnique({ where: { id } });
    if (!scheme) throw new NotFoundException('Scheme not found');
    return scheme;
  }
}
