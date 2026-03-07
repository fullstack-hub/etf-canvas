import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class PortfolioService {
  constructor(private readonly prisma: PrismaService) {}

  async create(
    userId: string,
    name: string,
    items: { code: string; name: string; weight: number }[],
    returnRate?: number,
    mdd?: number,
  ) {
    return this.prisma.portfolio.create({
      data: { userId, name, items, returnRate, mdd },
    });
  }

  async list(userId: string, sort?: string) {
    let orderBy: any;
    switch (sort) {
      case 'return': orderBy = { returnRate: 'desc' }; break;
      case 'mdd': orderBy = { mdd: 'asc' }; break;
      default: orderBy = { createdAt: 'desc' };
    }
    return this.prisma.portfolio.findMany({
      where: { userId },
      orderBy,
    });
  }

  async get(userId: string, id: string) {
    const p = await this.prisma.portfolio.findFirst({
      where: { id, userId },
    });
    if (!p) throw new NotFoundException();
    return p;
  }

  async delete(userId: string, id: string) {
    const p = await this.prisma.portfolio.findFirst({
      where: { id, userId },
    });
    if (!p) throw new NotFoundException();
    await this.prisma.portfolio.delete({ where: { id } });
    return { ok: true };
  }
}
