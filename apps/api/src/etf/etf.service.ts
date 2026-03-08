import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { RedisService } from '../redis/redis.service';
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
    private naver: NaverService,
  ) { }

  // --- Public API ---

  async search(query: string, category?: string, sort: ETFSortBy = 'aum', benchmark?: string, offset = 0, limit = 50): Promise<ETFSummary[]> {
    const cacheKey = `etf:search:${query}:${category || 'all'}:${sort}:${benchmark || ''}:${offset}:${limit}`;

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
      // 영문/숫자 ↔ 한글 경계 + 공백에서 토큰 분리
      // e.g. "TIGER코리아" → ["TIGER", "코리아"], "KODEX 미국S&P500" → ["KODEX", "미국", "S&P500"]
      const tokens = query
        .split(/\s+/)
        .flatMap((part) =>
          part.split(/(?<=[a-zA-Z0-9&])(?=[가-힣])|(?<=[가-힣])(?=[a-zA-Z0-9&])/)
        )
        .filter(Boolean);

      if (tokens.length > 1) {
        where.OR = [
          { AND: tokens.map((t) => ({ name: { contains: t, mode: 'insensitive' } })) },
          { code: { startsWith: query.replace(/\s+/g, '') } },
        ];
      } else {
        where.OR = [
          { name: { contains: query, mode: 'insensitive' } },
          { code: { startsWith: query } },
        ];
      }
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

    const sortField = sort === 'returnRate1y' ? 'oneYearEarnRate'
      : sort === 'returnRate3m' ? 'threeMonthEarnRate'
      : 'aum';
    const orderBy = { [sortField]: { sort: 'desc' as const, nulls: 'last' as const } };

    const etfs = await this.prisma.etf.findMany({
      where,
      skip: offset,
      take: limit,
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
      oneYearEarnRate: e.oneYearEarnRate ? Number(e.oneYearEarnRate) : null,
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
      // 네이버에서 시딩 후 재조회
      await this.naver.seedAllEtfs();
      etf = await this.prisma.etf.findUnique({
        where: { code },
        include: {
          holdings: { orderBy: { weight: 'desc' }, take: 20 },
          returns: true,
        },
      });
      if (!etf) throw new Error(`ETF ${code} not found`);
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
      threeMonthEarnRate: (etf as any).threeMonthEarnRate ? Number((etf as any).threeMonthEarnRate) : null,
      oneYearEarnRate: (etf as any).oneYearEarnRate ? Number((etf as any).oneYearEarnRate) : null,
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

    const days = this.periodToDays(period);
    const since = new Date();
    since.setDate(since.getDate() - days);

    // DB 먼저 조회
    let prices = await this.prisma.etfDailyPrice.findMany({
      where: { etfCode: code, date: { gte: since } },
      orderBy: { date: 'asc' },
    });

    // DB에 데이터 없으면 네이버에서 가져온 뒤 재조회
    if (prices.length === 0) {
      const greedyKey = `etf:greedy_fetched:${code}`;
      const hasGreedyFetched = await this.redis.getJson<boolean>(greedyKey);

      if (!hasGreedyFetched) {
        if (!this.fetchLocks.has(code)) {
          const fetchPromise = (async () => {
            const PREFETCH_DAYS = 1095;
            await this.fetchAndStoreDailyPricesFromNaver(code, PREFETCH_DAYS);
            await this.redis.setJson(greedyKey, true, 86400);
          })().finally(() => {
            this.fetchLocks.delete(code);
          });
          this.fetchLocks.set(code, fetchPromise);
        }
        await this.fetchLocks.get(code);
      }

      prices = await this.prisma.etfDailyPrice.findMany({
        where: { etfCode: code, date: { gte: since } },
        orderBy: { date: 'asc' },
      });
    }

    const result: ETFDailyPrice[] = prices.map((p: any) => ({
      date: p.date.toISOString().split('T')[0],
      close: p.close,
      open: p.open,
      high: p.high,
      low: p.low,
      volume: Number(p.volume),
      nav: p.nav ? Number(p.nav) : null,
    }));

    await this.redis.setJson(cacheKey, result, 86400);
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
    const cacheKey = `etf:simulate:v4:${JSON.stringify(req)}`;

    const cached = await this.redis.getJson<SimulateResult>(cacheKey);
    if (cached) return cached;

    const allPricesRaw = await Promise.all(
      req.codes.map((code) => this.getDailyPrices(code, req.period)),
    );

    const days = this.periodToDays(req.period);
    const weights = req.weights.map((w) => w / 100);
    const dailyValues: { date: string; value: number }[] = [];

    // 각 ETF 가격을 date→close 맵으로 변환
    const priceMaps = allPricesRaw.map((prices) => {
      const map = new Map<string, number>();
      for (const p of prices) map.set(p.date, p.close);
      return map;
    });

    // 모든 ETF가 데이터를 가진 날짜만 사용 (교집합)
    const allDateSets = allPricesRaw.map((prices) => new Set(prices.map((p) => p.date)));
    let commonDates = allPricesRaw[0]
      ?.map((p) => p.date)
      .filter((d) => allDateSets.every((s) => s.has(d))) || [];

    if (req.endDate) {
      commonDates = commonDates.filter(d => new Date(d) <= new Date(req.endDate!));
    }

    // 교집합 첫 날 기준 basePrices
    const basePrices = priceMaps.map((m) => m.get(commonDates[0]) || 1);
    const etfAmounts = weights.map((w) => req.amount * w);

    for (const date of commonDates) {
      let totalValue = 0;
      for (let i = 0; i < req.codes.length; i++) {
        const close = priceMaps[i].get(date);
        if (close) {
          totalValue += etfAmounts[i] * (close / basePrices[i]);
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

    const calendarDays = commonDates.length > 1
      ? (new Date(commonDates[commonDates.length - 1]).getTime() - new Date(commonDates[0]).getTime()) / (1000 * 60 * 60 * 24)
      : days;
    const annualizedReturn = calendarDays > 0
      ? (Math.pow(1 + totalReturn / 100, 365 / calendarDays) - 1) * 100
      : totalReturn;

    // 평균 변동성 (일별 수익률 표준편차 * sqrt(252))
    let volatility = 0;
    if (dailyValues.length > 1) {
      const dailyReturns: number[] = [];
      for (let i = 1; i < dailyValues.length; i++) {
        const prev = dailyValues[i - 1].value;
        const curr = dailyValues[i].value;
        if (prev > 0) dailyReturns.push((curr - prev) / prev);
      }
      if (dailyReturns.length > 1) {
        const mean = dailyReturns.reduce((a, b) => a + b, 0) / dailyReturns.length;
        const variance = dailyReturns.reduce((sum, r) => sum + (r - mean) ** 2, 0) / (dailyReturns.length - 1);
        volatility = Math.round(Math.sqrt(variance) * Math.sqrt(252) * 10000) / 100;
      }
    }

    const result: SimulateResult = {
      totalReturn: Math.round(totalReturn * 100) / 100,
      annualizedReturn: Math.round(annualizedReturn * 100) / 100,
      maxDrawdown: Math.round(maxDrawdown * 100) / 100,
      volatility,
      sharpeRatio: null,
      dailyValues,
      perEtf: req.codes.map((code, i) => {
        const lastDate = commonDates[commonDates.length - 1];
        const lastPrice = priceMaps[i].get(lastDate) || 0;
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

  async count(query?: string, category?: string): Promise<{ total: number; filtered: number }> {
    const cacheKey = `etf:count:${query || ''}:${category || 'all'}`;
    const cached = await this.redis.getJson<{ total: number; filtered: number }>(cacheKey);
    if (cached) return cached;

    const total = await this.prisma.etf.count();

    const where: Record<string, unknown> = {};
    if (query) {
      const tokens = query
        .split(/\s+/)
        .flatMap((part) =>
          part.split(/(?<=[a-zA-Z0-9&])(?=[가-힣])|(?<=[가-힣])(?=[a-zA-Z0-9&])/)
        )
        .filter(Boolean);
      if (tokens.length > 1) {
        where.OR = [
          { AND: tokens.map((t) => ({ name: { contains: t, mode: 'insensitive' } })) },
          { code: { startsWith: query.replace(/\s+/g, '') } },
        ];
      } else {
        where.OR = [
          { name: { contains: query, mode: 'insensitive' } },
          { code: { startsWith: query } },
        ];
      }
    }
    if (category === 'New') {
      const twoMonthsAgo = new Date();
      twoMonthsAgo.setMonth(twoMonthsAgo.getMonth() - 2);
      where.listedDate = { gte: twoMonthsAgo };
    } else if (category) {
      where.categories = { has: category };
    }

    const filtered = Object.keys(where).length > 0
      ? await this.prisma.etf.count({ where })
      : total;

    const result = { total, filtered };
    await this.redis.setJson(cacheKey, result, 300);
    return result;
  }

  async seed(): Promise<number> {
    const count = await this.naver.seedAllEtfs();
    // 시딩 후 가격 캐시 초기화
    await this.redis.deletePattern('etf:prices:*');
    await this.redis.deletePattern('etf:greedy_fetched:*');
    return count;
  }

  // --- Private ---

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
