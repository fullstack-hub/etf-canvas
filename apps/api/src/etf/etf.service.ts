import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { RedisService } from '../redis/redis.service';
import { KiwoomService } from '../kiwoom/kiwoom.service';
import { NaverService } from '../naver/naver.service';
import type {
  ETFSummary,
  ETFDetail,
  ETFDailyPrice,
  CompareRequest,
  SimulateRequest,
  SimulateResult,
  ETFSortBy,
} from '@etf-canvas/shared';

@Injectable()
export class EtfService {
  private readonly logger = new Logger(EtfService.name);
  private fetchLocks = new Map<string, Promise<void>>();

  constructor(
    private prisma: PrismaService,
    private redis: RedisService,
    private kiwoom: KiwoomService,
    private naver: NaverService,
  ) { }

  // --- Public API ---

  async search(query: string, category?: string, sort: ETFSortBy = 'aum', benchmark?: string): Promise<ETFSummary[]> {
    const cacheKey = `etf:search:${query}:${category || 'all'}:${sort}:${benchmark || ''}`;

    // 1. Redis
    const cached = await this.redis.getJson<ETFSummary[]>(cacheKey);
    if (cached) return cached;

    // 2. DB (empty -> seed from Naver)
    const count = await this.prisma.etf.count();
    if (count === 0) {
      await this.naver.seedAllEtfs();
    }

    const where: Record<string, unknown> = {};
    if (query) {
      where.OR = [
        { name: { contains: query, mode: 'insensitive' } },
        { code: { startsWith: query } },
      ];
    }
    if (benchmark) {
      where.benchmark = benchmark;
    } else if (category === 'New') {
      const twoMonthsAgo = new Date();
      twoMonthsAgo.setMonth(twoMonthsAgo.getMonth() - 2);
      where.listedDate = { gte: twoMonthsAgo };
    } else if (category) {
      where.categories = { has: category };
    }

    const orderBy = sort === 'returnRate'
      ? { threeMonthEarnRate: 'desc' as const }
      : { aum: 'desc' as const };

    const etfs = await this.prisma.etf.findMany({
      where,
      take: 50,
      orderBy,
    });

    const result: ETFSummary[] = etfs.map((e: any) => ({
      code: e.code,
      name: e.name,
      categories: e.categories,
      issuer: e.issuer || '',
      price: e.price || 0,
      changeRate: e.changeRate ? Number(e.changeRate) : 0,
      aum: e.aum ? Number(e.aum) : null,
      expenseRatio: e.expenseRatio ? Number(e.expenseRatio) : null,
      nav: e.nav ? Number(e.nav) : null,
      threeMonthEarnRate: e.threeMonthEarnRate ? Number(e.threeMonthEarnRate) : null,
      listedDate: e.listedDate?.toISOString().split('T')[0] || null,
    }));

    await this.redis.setJson(cacheKey, result, 300);
    return result;
  }

  async getDetail(code: string): Promise<ETFDetail> {
    const cacheKey = `etf:detail:${code}`;

    const cached = await this.redis.getJson<ETFDetail>(cacheKey);
    if (cached && cached.benchmark) return cached;

    let etf = await this.prisma.etf.findUnique({
      where: { code },
      include: {
        holdings: { orderBy: { weight: 'desc' }, take: 20 },
        returns: true,
      },
    });

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

    // 수익률은 네이버 일별시세 기반 simulate API로 계산하므로 키움 호출 생략

    // 운용보수 없으면 네이버에서 on-demand 조회
    if (!etf.expenseRatio) {
      const ratio = await this.naver.fetchExpenseRatio(code);
      if (ratio != null) {
        await this.prisma.etf.update({
          where: { code },
          data: { expenseRatio: ratio },
        });
        etf = { ...etf, expenseRatio: ratio as any };
      }
    }

    // 구성종목: DB → 네이버 HTML fallback (가져오면 DB에 저장)
    let holdings = etf.holdings.map((h: any) => ({
      stockCode: h.stockCode || '',
      stockName: h.stockName || '',
      weight: Number(h.weight),
    }));
    if (holdings.length === 0) {
      const naverHoldings = await this.naver.fetchHoldings(code);
      if (naverHoldings.length > 0) {
        holdings = naverHoldings.map((h) => ({ stockCode: '', stockName: h.stockName, weight: h.weight }));
        // DB에 저장
        await this.prisma.etfHolding.deleteMany({ where: { etfCode: code } });
        await this.prisma.etfHolding.createMany({
          data: naverHoldings.map((h) => ({
            etfCode: code,
            stockName: h.stockName,
            weight: h.weight,
          })),
        });
      }
    }

    const result: ETFDetail = {
      code: etf.code,
      name: etf.name,
      categories: etf.categories,
      issuer: etf.issuer || '',
      benchmark: etf.benchmark || '',
      listedDate: etf.listedDate?.toISOString().split('T')[0] || '',
      price: etf.price || 0,
      changeRate: etf.changeRate ? Number(etf.changeRate) : 0,
      aum: etf.aum ? Number(etf.aum) : null,
      expenseRatio: etf.expenseRatio ? Number(etf.expenseRatio) : null,
      nav: etf.nav ? Number(etf.nav) : null,
      threeMonthEarnRate: etf.threeMonthEarnRate ? Number(etf.threeMonthEarnRate) : null,
      holdings,
      returns: etf.returns.map((r: any) => ({
        period: r.period,
        returnRate: Number(r.returnRate),
      })),
    };

    await this.redis.setJson(cacheKey, result, 600);
    return result;
  }

  async getDailyPrices(code: string, period: string): Promise<ETFDailyPrice[]> {
    const cacheKey = `etf:prices:v3:${code}:${period}`;

    const cached = await this.redis.getJson<ETFDailyPrice[]>(cacheKey);
    if (cached) return cached;

    const greedyKey = `etf:greedy_fetched:${code}`;
    const hasGreedyFetched = await this.redis.getJson<boolean>(greedyKey);

    if (!hasGreedyFetched) {
      if (!this.fetchLocks.has(code)) {
        const fetchPromise = (async () => {
          const PREFETCH_DAYS = 1095;
          await this.fetchAndStoreDailyPricesFromNaver(code, PREFETCH_DAYS);
          await this.redis.setJson(greedyKey, true, 86400); // cache flag for 24h
        })().finally(() => {
          this.fetchLocks.delete(code);
        });
        this.fetchLocks.set(code, fetchPromise);
      }
      await this.fetchLocks.get(code); // Wait until the fetch finishes
    }

    const days = this.periodToDays(period);
    const since = new Date();
    since.setDate(since.getDate() - days);

    let prices = await this.prisma.etfDailyPrice.findMany({
      where: { etfCode: code, date: { gte: since } },
      orderBy: { date: 'asc' },
    });

    const result: ETFDailyPrice[] = prices.map((p: any) => ({
      date: p.date.toISOString().split('T')[0],
      close: p.close,
      open: p.open,
      high: p.high,
      low: p.low,
      volume: Number(p.volume),
      nav: p.nav ? Number(p.nav) : null,
    }));

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
    const cacheKey = `etf:simulate:v3:${JSON.stringify(req)}`;

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

  async seed(): Promise<number> {
    return this.naver.seedAllEtfs();
  }

  async seedBenchmarks(): Promise<number> {
    return this.naver.seedBenchmarks();
  }

  // --- Private: On-demand ---

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
          categories: [],
          benchmark: response.bnchmk_idx_nm || null,
        },
      });
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : String(e);
      this.logger.warn(`ETF ${code} 기본정보 조회 실패: ${message}`);
      throw e;
    }
  }

  private async fetchAndStoreDailyPricesFromNaver(code: string, days: number): Promise<void> {
    this.logger.log(`ETF ${code} 네이버 일별시세 ${days}일치 조회...`);
    try {
      const items = await this.naver.fetchDailyPrices(code, days);
      if (items.length === 0) return;

      // Bulk: delete existing rows for this ETF, then bulk insert
      const dates = items.map((i) => new Date(i.date));
      await this.prisma.etfDailyPrice.deleteMany({
        where: { etfCode: code, date: { in: dates } },
      });
      await this.prisma.etfDailyPrice.createMany({
        data: items.map((item) => ({
          etfCode: code,
          date: new Date(item.date),
          close: item.close,
          open: item.open,
          high: item.high,
          low: item.low,
          volume: BigInt(item.volume),
        })),
      });
      this.logger.log(`ETF ${code} 네이버 일별시세 ${items.length}건 저장`);
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : String(e);
      this.logger.warn(`ETF ${code} 네이버 일별시세 조회 실패: ${message}`);
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
    if (period === 'ytd') {
      const now = new Date();
      const jan1 = new Date(now.getFullYear(), 0, 1);
      return Math.ceil((now.getTime() - jan1.getTime()) / (1000 * 60 * 60 * 24));
    }
    const map: Record<string, number> = {
      '1w': 7, '1m': 30, '3m': 90, '6m': 180, '1y': 365, '3y': 1095,
    };
    return map[period] || 365;
  }
}
