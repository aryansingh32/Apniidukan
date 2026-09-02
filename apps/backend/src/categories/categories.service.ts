import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

export interface UpsertCategoryDto {
  name: string;
  imageUrl?: string;
  sortOrder?: number;
}

@Injectable()
export class CategoriesService {
  constructor(private prisma: PrismaService) {}

  async list() {
    const categories = await this.prisma.category.findMany({
      orderBy: { sortOrder: 'asc' },
      include: { _count: { select: { products: { where: { status: 'ACTIVE' } } } } },
    });
    return categories.map((c) => ({ ...c, productCount: c._count.products, _count: undefined }));
  }

  create(dto: UpsertCategoryDto) {
    return this.prisma.category.create({ data: dto });
  }

  async update(id: string, dto: Partial<UpsertCategoryDto>) {
    await this.ensureExists(id);
    return this.prisma.category.update({ where: { id }, data: dto });
  }

  async remove(id: string) {
    await this.ensureExists(id);
    await this.prisma.category.delete({ where: { id } });
    return { success: true };
  }

  private async ensureExists(id: string) {
    const category = await this.prisma.category.findUnique({ where: { id } });
    if (!category) throw new NotFoundException('Category not found');
    return category;
  }
}
