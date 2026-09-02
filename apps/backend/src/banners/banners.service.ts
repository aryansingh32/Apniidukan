import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

export interface UpsertBannerDto {
  title: string;
  subtitle?: string;
  imageUrl: string;
  ctaLabel?: string;
  ctaTarget?: string;
  priority?: number;
  startDate?: string;
  endDate?: string;
  active?: boolean;
}

@Injectable()
export class BannersService {
  constructor(private prisma: PrismaService) {}

  async listActive() {
    const now = new Date();
    const banners = await this.prisma.banner.findMany({
      where: {
        active: true,
        OR: [{ startDate: null }, { startDate: { lte: now } }],
        AND: [{ OR: [{ endDate: null }, { endDate: { gte: now } }] }],
      },
      orderBy: { priority: 'desc' },
    });
    return banners;
  }

  listAll() {
    return this.prisma.banner.findMany({ orderBy: { priority: 'desc' } });
  }

  create(dto: UpsertBannerDto) {
    return this.prisma.banner.create({
      data: {
        ...dto,
        startDate: dto.startDate ? new Date(dto.startDate) : undefined,
        endDate: dto.endDate ? new Date(dto.endDate) : undefined,
      },
    });
  }

  async update(id: string, dto: Partial<UpsertBannerDto>) {
    await this.ensureExists(id);
    return this.prisma.banner.update({
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
    await this.prisma.banner.delete({ where: { id } });
    return { success: true };
  }

  private async ensureExists(id: string) {
    const banner = await this.prisma.banner.findUnique({ where: { id } });
    if (!banner) throw new NotFoundException('Banner not found');
    return banner;
  }
}
