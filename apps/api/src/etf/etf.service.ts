import { Injectable, Logger } from '@nestjs/common';
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
  private readonly logger = new Logger(EtfService.name);

  constructor(
    private prisma: PrismaService,
    private redis: RedisService,
    private kiwoom: KiwoomService,
  ) {}

  // --- Public API ---

  async search(query: string, category?: string): Promise<ETFSummary[]> {
    const cacheKey = `etf:search:${query}:${category || 'all'}`;

    // 1. Redis
    const cached = await this.redis.getJson<ETFSummary[]>(cacheKey);
    if (cached) return cached;

    // 2. DB (비어있으면 전종목 시딩)
    const count = await this.prisma.etf.count();
    if (count === 0) {
      await this.seedEtfList();
    }

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

    // Redis 저장
    await this.redis.setJson(cacheKey, result, 300);
    return result;
  }

  async getDetail(code: string): Promise<ETFDetail> {
    const cacheKey = `etf:detail:${code}`;

    // 1. Redis
    const cached = await this.redis.getJson<ETFDetail>(cacheKey);
    if (cached) return cached;

    // 2. DB
    let etf = await this.prisma.etf.findUnique({
      where: { code },
      include: {
        holdings: { orderBy: { weight: 'desc' }, take: 20 },
        returns: true,
      },
    });

    // 3. 키움API → DB 저장
    if (!etf) {
      await this.fetchAndStoreEtf(code);
      etf = await this.prisma.etf.findUniqueOrThrow({
        where: { code },
        include: {
          holdings: { orderBy: { weight: 'desc' }, take: 20 },
          returns: true,
        },
      });
    }

    // 수익률 없으면 on-demand
    if (etf.returns.length === 0) {
      await this.fetchAndStoreReturns(code);
      const returns = await this.prisma.etfReturn.findMany({ where: { etfCode: code } });
      etf = { ...etf, returns };
    }

    const result: ETFDetail = {
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

    // Redis 저장
    await this.redis.setJson(cacheKey, result, 600);
    return result;
  }

  async getDailyPrices(code: string, period: string): Promise<ETFDailyPrice[]> {
    const cacheKey = `etf:prices:${code}:${period}`;

    // 1. Redis
    const cached = await this.redis.getJson<ETFDailyPrice[]>(cacheKey);
    if (cached) return cached;

    // 2. DB
    const days = this.periodToDays(period);
    const since = new Date();
    since.setDate(since.getDate() - days);

    let prices = await this.prisma.etfDailyPrice.findMany({
      where: { etfCode: code, date: { gte: since } },
      orderBy: { date: 'asc' },
    });

    // 3. 키움API → DB 저장
    if (prices.length === 0) {
      await this.fetchAndStoreDailyPrices(code);
      prices = await this.prisma.etfDailyPrice.findMany({
        where: { etfCode: code, date: { gte: since } },
        orderBy: { date: 'asc' },
      });
    }

    const result: ETFDailyPrice[] = prices.map((p) => ({
      date: p.date.toISOString().split('T')[0],
      close: p.close,
      open: p.open,
      high: p.high,
      low: p.low,
      volume: Number(p.volume),
      nav: p.nav ? Number(p.nav) : null,
    }));

    // Redis 저장
    await this.redis.setJson(cacheKey, result, 300);
    return result;
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

    const allPricesRaw = await Promise.all(
      req.codes.map((code) => this.getDailyPrices(code, req.period)),
    );

    const days = this.periodToDays(req.period);
    const weights = req.weights.map((w) => w / 100);
    const dailyValues: { date: string; value: number }[] = [];
    const basePrices = allPricesRaw.map((prices) => prices[0]?.close || 1);
    const etfAmounts = weights.map((w) => req.amount * w);

    const dates = allPricesRaw[0]?.map((p) => p.date) || [];
    for (const date of dates) {
      let totalValue = 0;
      for (let i = 0; i < req.codes.length; i++) {
        const price = allPricesRaw[i]?.find((p) => p.date === date);
        if (price) {
          totalValue += etfAmounts[i] * (price.close / basePrices[i]);
        }
      }
      dailyValues.push({ date, value: Math.round(totalValue) });
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
        const prices = allPricesRaw[i];
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

  // --- Private: On-demand 데이터 로딩 ---

  private async seedEtfList(): Promise<void> {
    this.logger.log('ETF 전종목 시딩 시작 (최초)...');
    const response = await this.kiwoom.etf.getETFAllQuote();
    const items = response.etf_all_qt || [];

    for (const item of items) {
      await this.prisma.etf.upsert({
        where: { code: item.stk_cd },
        update: { name: item.stk_nm, updatedAt: new Date() },
        create: { code: item.stk_cd, name: item.stk_nm },
      });
    }
    this.logger.log(`ETF ${items.length}종목 시딩 완료`);
  }

  private async fetchAndStoreEtf(code: string): Promise<void> {
    this.logger.log(`ETF ${code} 기본정보 조회...`);
    try {
      const response = await this.kiwoom.etf.getETFStockInfo({ stk_cd: code });
      await this.prisma.etf.upsert({
        where: { code },
        update: {
          name: response.stk_nm,
          benchmark: response.bnchmk_idx_nm || null,
          updatedAt: new Date(),
        },
        create: {
          code,
          name: response.stk_nm,
          benchmark: response.bnchmk_idx_nm || null,
        },
      });
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : String(e);
      this.logger.warn(`ETF ${code} 기본정보 조회 실패: ${message}`);
      throw e;
    }
  }

  private async fetchAndStoreDailyPrices(code: string): Promise<void> {
    this.logger.log(`ETF ${code} 일별 시세 조회...`);
    try {
      const response = await this.kiwoom.etf.getETFDailyTrend({ stk_cd: code });
      const items = response.etf_dy_stst || [];

      for (const item of items) {
        const date = this.parseDate(item.dt);
        if (!date) continue;

        await this.prisma.etfDailyPrice.upsert({
          where: { etfCode_date: { etfCode: code, date } },
          update: {
            close: Number(item.cls_prc),
            open: Number(item.opn_prc),
            high: Number(item.hgh_prc),
            low: Number(item.low_prc),
            volume: BigInt(item.trde_qty || '0'),
          },
          create: {
            etfCode: code,
            date,
            close: Number(item.cls_prc),
            open: Number(item.opn_prc),
            high: Number(item.hgh_prc),
            low: Number(item.low_prc),
            volume: BigInt(item.trde_qty || '0'),
          },
        });
      }
      this.logger.log(`ETF ${code} 일별 시세 ${items.length}건 저장`);
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : String(e);
      this.logger.warn(`ETF ${code} 일별 시세 조회 실패: ${message}`);
    }
  }

  private async fetchAndStoreReturns(code: string): Promise<void> {
    this.logger.log(`ETF ${code} 수익률 조회...`);
    try {
      const response = await this.kiwoom.etf.getETFReturn({ stk_cd: code });
      const items = response.etf_rtn || [];
      if (items.length === 0) return;

      const item = items[0];
      const periods = [
        { period: '1w', value: item.rt_1w },
        { period: '1m', value: item.rt_1m },
        { period: '3m', value: item.rt_3m },
        { period: '6m', value: item.rt_6m },
        { period: '1y', value: item.rt_1y },
        { period: '3y', value: item.rt_3y },
        { period: 'ytd', value: item.rt_ytd },
      ];

      for (const p of periods) {
        if (!p.value) continue;
        await this.prisma.etfReturn.upsert({
          where: { etfCode_period: { etfCode: code, period: p.period } },
          update: { returnRate: Number(p.value), updatedAt: new Date() },
          create: { etfCode: code, period: p.period, returnRate: Number(p.value) },
        });
      }
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : String(e);
      this.logger.warn(`ETF ${code} 수익률 조회 실패: ${message}`);
    }
  }

  private parseDate(dt: string): Date | null {
    if (!dt || dt.length < 8) return null;
    return new Date(`${dt.substring(0, 4)}-${dt.substring(4, 6)}-${dt.substring(6, 8)}`);
  }

  private periodToDays(period: string): number {
    const map: Record<string, number> = {
      '1m': 30, '3m': 90, '6m': 180, '1y': 365, '3y': 1095,
    };
    return map[period] || 365;
  }
}
