import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { RedisService } from '../redis/redis.service';
import { KiwoomService } from '../kiwoom/kiwoom.service';
import type {
  ETFSummary,
  ETFDetail,
  ETFDailyPrice,
  CompareRequest,
  SimulateRequest,
  SimulateResult,
} from '@etf-canvas/shared';

@Injectable()
export class EtfService {
  constructor(
    private prisma: PrismaService,
    private redis: RedisService,
    private kiwoom: KiwoomService,
  ) {}

  async search(query: string, category?: string): Promise<ETFSummary[]> {
    const cacheKey = `etf:search:${query}:${category || 'all'}`;
    const cached = await this.redis.getJson<ETFSummary[]>(cacheKey);
    if (cached) return cached;

    const where: Record<string, unknown> = {};
    if (query) {
      where.OR = [
        { name: { contains: query, mode: 'insensitive' } },
        { code: { startsWith: query } },
      ];
    }
    if (category) {
      where.category = category;
    }

    const etfs = await this.prisma.etf.findMany({
      where,
      take: 50,
      orderBy: { aum: 'desc' },
    });

    const result: ETFSummary[] = etfs.map((e) => ({
      code: e.code,
      name: e.name,
      category: e.category || '기타',
      issuer: e.issuer || '',
      price: 0,
      changeRate: 0,
      aum: e.aum ? Number(e.aum) : null,
      expenseRatio: e.expenseRatio ? Number(e.expenseRatio) : null,
      nav: null,
    }));

    await this.redis.setJson(cacheKey, result, 300);
    return result;
  }

  async getDetail(code: string): Promise<ETFDetail> {
    const etf = await this.prisma.etf.findUniqueOrThrow({
      where: { code },
      include: {
        holdings: { orderBy: { weight: 'desc' }, take: 20 },
        returns: true,
      },
    });

    return {
      code: etf.code,
      name: etf.name,
      category: etf.category || '기타',
      issuer: etf.issuer || '',
      benchmark: etf.benchmark || '',
      listedDate: etf.listedDate?.toISOString().split('T')[0] || '',
      price: 0,
      changeRate: 0,
      aum: etf.aum ? Number(etf.aum) : null,
      expenseRatio: etf.expenseRatio ? Number(etf.expenseRatio) : null,
      nav: null,
      holdings: etf.holdings.map((h) => ({
        stockCode: h.stockCode || '',
        stockName: h.stockName || '',
        weight: Number(h.weight),
      })),
      returns: etf.returns.map((r) => ({
        period: r.period,
        returnRate: Number(r.returnRate),
      })),
    };
  }

  async getDailyPrices(code: string, period: string): Promise<ETFDailyPrice[]> {
    const days = this.periodToDays(period);
    const since = new Date();
    since.setDate(since.getDate() - days);

    const prices = await this.prisma.etfDailyPrice.findMany({
      where: { etfCode: code, date: { gte: since } },
      orderBy: { date: 'asc' },
    });

    return prices.map((p) => ({
      date: p.date.toISOString().split('T')[0],
      close: p.close,
      open: p.open,
      high: p.high,
      low: p.low,
      volume: Number(p.volume),
      nav: p.nav ? Number(p.nav) : null,
    }));
  }

  async compare(req: CompareRequest): Promise<ETFDetail[]> {
    const codes = req.codes.slice(0, 3);
    const cacheKey = `etf:compare:${[...codes].sort().join(',')}`;
    const cached = await this.redis.getJson<ETFDetail[]>(cacheKey);
    if (cached) return cached;

    const result = await Promise.all(codes.map((code) => this.getDetail(code)));
    await this.redis.setJson(cacheKey, result, 120);
    return result;
  }

  async simulate(req: SimulateRequest): Promise<SimulateResult> {
    const cacheKey = `etf:simulate:${JSON.stringify(req)}`;
    const cached = await this.redis.getJson<SimulateResult>(cacheKey);
    if (cached) return cached;

    const days = this.periodToDays(req.period);
    const since = new Date();
    since.setDate(since.getDate() - days);

    const allPrices = await Promise.all(
      req.codes.map((code) =>
        this.prisma.etfDailyPrice.findMany({
          where: { etfCode: code, date: { gte: since } },
          orderBy: { date: 'asc' },
        }),
      ),
    );

    const weights = req.weights.map((w) => w / 100);
    const dailyValues: { date: string; value: number }[] = [];
    const basePrices = allPrices.map((prices) => prices[0]?.close || 1);
    const etfAmounts = weights.map((w) => req.amount * w);

    const dates = allPrices[0]?.map((p) => p.date) || [];
    for (const date of dates) {
      let totalValue = 0;
      for (let i = 0; i < req.codes.length; i++) {
        const price = allPrices[i]?.find(
          (p) => p.date.getTime() === date.getTime(),
        );
        if (price) {
          totalValue += etfAmounts[i] * (price.close / basePrices[i]);
        }
      }
      dailyValues.push({
        date: date.toISOString().split('T')[0],
        value: Math.round(totalValue),
      });
    }

    const lastValue = dailyValues[dailyValues.length - 1]?.value || req.amount;
    const totalReturn = ((lastValue - req.amount) / req.amount) * 100;

    let peak = -Infinity;
    let maxDrawdown = 0;
    for (const dv of dailyValues) {
      if (dv.value > peak) peak = dv.value;
      const dd = ((peak - dv.value) / peak) * 100;
      if (dd > maxDrawdown) maxDrawdown = dd;
    }

    const annualizedReturn = totalReturn * (365 / days);

    const result: SimulateResult = {
      totalReturn: Math.round(totalReturn * 100) / 100,
      annualizedReturn: Math.round(annualizedReturn * 100) / 100,
      maxDrawdown: Math.round(maxDrawdown * 100) / 100,
      sharpeRatio: null,
      dailyValues,
      perEtf: req.codes.map((code, i) => {
        const prices = allPrices[i];
        const lastPrice = prices?.[prices.length - 1]?.close || 0;
        const basePrice = basePrices[i];
        return {
          code,
          name: '',
          weight: req.weights[i],
          returnRate: Math.round(((lastPrice - basePrice) / basePrice) * 10000) / 100,
        };
      }),
    };

    await this.redis.setJson(cacheKey, result, 600);
    return result;
  }

  private periodToDays(period: string): number {
    const map: Record<string, number> = {
      '1m': 30, '3m': 90, '6m': 180, '1y': 365, '3y': 1095,
    };
    return map[period] || 365;
  }
}
