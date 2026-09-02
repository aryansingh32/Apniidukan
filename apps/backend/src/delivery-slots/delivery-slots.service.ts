import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

export interface UpsertDeliverySlotDto {
  label: string;
  windowStart: string;
  windowEnd: string;
  cutoffTime: string;
  active?: boolean;
}

@Injectable()
export class DeliverySlotsService {
  constructor(private prisma: PrismaService) {}

  listActive() {
    return this.prisma.deliverySlot.findMany({ where: { active: true }, orderBy: { windowStart: 'asc' } });
  }

  listAll() {
    return this.prisma.deliverySlot.findMany({ orderBy: { windowStart: 'asc' } });
  }

  create(dto: UpsertDeliverySlotDto) {
    return this.prisma.deliverySlot.create({ data: dto });
  }

  async update(id: string, dto: Partial<UpsertDeliverySlotDto>) {
    await this.ensureExists(id);
    return this.prisma.deliverySlot.update({ where: { id }, data: dto });
  }

  async remove(id: string) {
    await this.ensureExists(id);
    return this.prisma.deliverySlot.update({ where: { id }, data: { active: false } });
  }

  private async ensureExists(id: string) {
    const slot = await this.prisma.deliverySlot.findUnique({ where: { id } });
    if (!slot) throw new NotFoundException('Delivery slot not found');
    return slot;
  }
}
