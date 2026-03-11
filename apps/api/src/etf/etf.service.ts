import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { RedisService } from '../redis/redis.service';
import { NaverService } from '../naver/naver.service';
import { SeibroService } from '../seibro/seibro.service';
import type {
  ETFSummary,
  ETFDetail,
  ETFDailyPrice,
  ETFDividend,
  CompareRequest,
  SimulateRequest,
  SimulateResult,
  ETFSortBy,
} from '@etf-canvas/shared';
import { getMarketDataCutoff, getNaverFetchCutoffDate } from '../common/market-time';

@Injectable()
export class EtfService {
  private readonly logger = new Logger(EtfService.name);
  private fetchLocks = new Map<string, Promise<void>>();

  constructor(
    private prisma: PrismaService,
    private redis: RedisService,
    private naver: NaverService,
    private seibro: SeibroService,
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
      // 공백 제거 + 소문자 비교 (e.g. "acekrx 금현물" → "ACE KRX금현물" 매칭)
      const normalized = query.replace(/\s+/g, '').toLowerCase();
      const matchingCodes: { code: string }[] = await this.prisma.$queryRawUnsafe(
        `SELECT code FROM "etf" WHERE LOWER(REPLACE(name, ' ', '')) LIKE $1 OR code LIKE $2`,
        `%${normalized}%`,
        `${normalized}%`,
      );
      if (matchingCodes.length > 0) {
        where.code = { in: matchingCodes.map((r) => r.code) };
      } else {
        where.code = { in: [] }; // 결과 없음
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
      : sort === 'expenseRatio' ? 'expenseRatio'
      : 'aum';
    const sortDir = sort === 'expenseRatio' ? 'asc' as const : 'desc' as const;
    const orderBy = { [sortField]: { sort: sortDir, nulls: 'last' as const } };

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
      dividendYield: e.dividendYield ? Number(e.dividendYield) : null,
      listedDate: e.listedDate?.toISOString().split('T')[0] || null,
    }));

    await this.redis.setJson(cacheKey, result, 300);
    return result;
  }

  async getDetail(code: string): Promise<ETFDetail> {
    const cacheKey = `etf:detail:${code}`;

    const cached = await this.redis.getJson<ETFDetail>(cacheKey);
    if (cached) return cached;

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
      dividendYield: (etf as any).dividendYield ? Number((etf as any).dividendYield) : null,
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
    const cutoff = getMarketDataCutoff();
    const cacheKey = `etf:prices:v4:${code}:${period}:${cutoff.cacheKey}`;

    const cached = await this.redis.getJson<ETFDailyPrice[]>(cacheKey);
    if (cached) return cached;

    const days = this.periodToDays(period);
    const since = new Date();
    since.setDate(since.getDate() - days);

    // cutoff.cutoffDate: 16시 전 → 오늘 UTC자정(어제까지), 16시 후 → 내일 UTC자정(오늘까지)
    // DB 먼저 조회
    let prices = await this.prisma.etfDailyPrice.findMany({
      where: { etfCode: code, date: { gte: since, lt: cutoff.cutoffDate } },
      orderBy: { date: 'asc' },
    });

    // DB 마지막 날짜 vs 최근 거래일 비교 → 빠진 날이 있으면 네이버에서 fetch
    const lastDbDate = prices.length > 0 ? prices[prices.length - 1].date : null;
    const needsFetch = this.isMissingTradingDays(lastDbDate, cutoff.isPostClose);

    if (needsFetch) {
      const fetchKey = `etf:daily_synced:${code}:${cutoff.cacheKey}`;
      const alreadySynced = await this.redis.getJson<boolean>(fetchKey);

      if (!alreadySynced) {
        if (!this.fetchLocks.has(code)) {
          const fetchDays = lastDbDate
            ? Math.ceil((Date.now() - new Date(lastDbDate).getTime()) / 86400_000) + 5
            : 1095;
          const fetchPromise = (async () => {
            await this.fetchAndStoreDailyPricesFromNaver(code, fetchDays);
            await this.redis.deletePattern(`etf:prices:v4:${code}:*`);
            await this.redis.setJson(fetchKey, true, cutoff.ttl);
          })().finally(() => {
            this.fetchLocks.delete(code);
          });
          this.fetchLocks.set(code, fetchPromise);
        }
        await this.fetchLocks.get(code);
      }

      prices = await this.prisma.etfDailyPrice.findMany({
        where: { etfCode: code, date: { gte: since, lt: cutoff.cutoffDate } },
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

    await this.redis.setJson(cacheKey, result, cutoff.ttl);
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

    // ETF 이름을 DB에서 조회
    const etfNames = await this.prisma.etf.findMany({
      where: { code: { in: req.codes } },
      select: { code: true, name: true },
    });
    const nameMap = new Map(etfNames.map((e) => [e.code, e.name]));

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
      startPrices: Object.fromEntries(req.codes.map((code, i) => [code, basePrices[i]])),
      perEtf: req.codes.map((code, i) => {
        const basePrice = basePrices[i];
        // 종목별 일별 가치 계산
        const etfDailyValues = commonDates.map((date) => {
          const close = priceMaps[i].get(date) || basePrice;
          return close / basePrice;
        });
        const lastRatio = etfDailyValues[etfDailyValues.length - 1] || 1;
        const returnRate = Math.round((lastRatio - 1) * 10000) / 100;
        // 종목별 MDD
        let etfPeak = -Infinity;
        let etfMdd = 0;
        for (const ratio of etfDailyValues) {
          if (ratio > etfPeak) etfPeak = ratio;
          const dd = ((etfPeak - ratio) / etfPeak) * 100;
          if (dd > etfMdd) etfMdd = dd;
        }
        // 종목별 변동성
        let etfVol = 0;
        if (etfDailyValues.length > 2) {
          const rets: number[] = [];
          for (let j = 1; j < etfDailyValues.length; j++) {
            if (etfDailyValues[j - 1] > 0) rets.push((etfDailyValues[j] - etfDailyValues[j - 1]) / etfDailyValues[j - 1]);
          }
          if (rets.length > 1) {
            const m = rets.reduce((a, b) => a + b, 0) / rets.length;
            const v = rets.reduce((s, r) => s + (r - m) ** 2, 0) / (rets.length - 1);
            etfVol = Math.round(Math.sqrt(v) * Math.sqrt(252) * 10000) / 100;
          }
        }
        return {
          code,
          name: nameMap.get(code) || code,
          weight: req.weights[i],
          returnRate,
          maxDrawdown: Math.round(etfMdd * 100) / 100,
          volatility: etfVol,
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
          part.split(/(?<=[a-zA-Z0-9&])(?=[가-힣])|(?<=[가-힣])(?=[a-zA-Z0-9&])|(?<=[a-zA-Z])(?=[0-9])|(?<=[0-9])(?=[a-zA-Z])/)
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

  async getDividends(code: string): Promise<ETFDividend[]> {
    const cacheKey = `etf:dividends:${code}`;
    const cached = await this.redis.getJson<ETFDividend[]>(cacheKey);
    if (cached) return cached;

    // DB에 있으면 반환 + Redis 캐시
    const existing = await this.prisma.etfDividend.findMany({
      where: { etfCode: code },
      orderBy: { date: 'desc' },
    });
    if (existing.length > 0) {
      const result = existing.map((d: any) => ({
        date: d.date.toISOString().split('T')[0],
        payDate: d.payDate.toISOString().split('T')[0],
        amount: d.amount,
        rate: Number(d.rate),
      }));
      await this.redis.setJson(cacheKey, result, 86400);
      return result;
    }

    // DB에 없으면 세이브로에서 가져와서 영구 저장
    const records = await this.seibro.fetchDividendHistory(code);
    if (records.length > 0) {
      await this.prisma.etfDividend.createMany({
        data: records.map((r) => ({
          etfCode: code,
          date: new Date(r.date),
          payDate: new Date(r.payDate),
          amount: r.amount,
          rate: r.rate,
        })),
        skipDuplicates: true,
      });
    }

    if (records.length > 0) {
      await this.redis.setJson(cacheKey, records, 86400);
    }
    return records;
  }

  async seed(): Promise<number> {
    const count = await this.naver.seedAllEtfs();
    // 시딩 후 캐시 초기화 (카테고리 변경 등 반영)
    await this.redis.deletePattern('etf:search:*');
    await this.redis.deletePattern('etf:count:*');
    await this.redis.deletePattern('etf:detail:*');
    await this.redis.deletePattern('etf:prices:v4:*');
    await this.redis.deletePattern('etf:daily_synced:*');
    await this.redis.deletePattern('portfolio:since:*');
    await this.redis.deletePattern('gallery:top:*');

    // 저장된 포트폴리오의 ETF 일별 가격 미리 sync
    await this.syncPortfolioEtfPrices();

    return count;
  }

  /** 저장된 포트폴리오에 포함된 ETF들의 일별 가격을 네이버에서 미리 가져옴 */
  private async syncPortfolioEtfPrices(): Promise<void> {
    const portfolios = await this.prisma.portfolio.findMany({
      where: { isDraft: false },
      select: { items: true, createdAt: true },
    });

    // 모든 포트폴리오의 ETF 코드 수집 (중복 제거)
    const codeSet = new Set<string>();
    let oldestDate = new Date();
    for (const p of portfolios) {
      const items = p.items as { code: string }[];
      for (const item of items) {
        if (item.code) codeSet.add(item.code);
      }
      if (p.createdAt < oldestDate) oldestDate = p.createdAt;
    }

    if (codeSet.size === 0) return;

    // 가장 오래된 포트폴리오부터 지금까지 일수 + 여유분
    const daysSinceOldest = Math.ceil((Date.now() - oldestDate.getTime()) / 86400_000) + 5;
    const codes = [...codeSet];
    this.logger.log(`포트폴리오 ETF ${codes.length}개 일별가격 sync (${daysSinceOldest}일)...`);

    // 동시 5개씩 병렬 fetch (네이버 부하 방지)
    for (let i = 0; i < codes.length; i += 5) {
      const batch = codes.slice(i, i + 5);
      await Promise.all(
        batch.map(async (code) => {
          try {
            await this.fetchAndStoreDailyPricesFromNaver(code, daysSinceOldest);
          } catch (e) {
            this.logger.warn(`ETF ${code} 일별가격 sync 실패: ${e}`);
          }
        }),
      );
    }

    this.logger.log(`포트폴리오 ETF 일별가격 sync 완료`);
  }

  /**
   * DB 마지막 날짜 이후로 거래일이 있는데 데이터가 없는지 확인
   * isPostClose=true면 오늘까지 체크, false면 어제까지 체크
   */
  private isMissingTradingDays(lastDbDate: Date | null, isPostClose: boolean): boolean {
    if (!lastDbDate) return true;
    const kstNow = new Date(Date.now() + 9 * 3600_000);
    // 16시 이후: 오늘까지 데이터 있어야 함, 이전: 어제까지
    const checkUntil = isPostClose
      ? kstNow.toISOString().slice(0, 10)
      : new Date(kstNow.getTime() - 86400_000).toISOString().slice(0, 10);
    const lastDbStr = lastDbDate.toISOString().slice(0, 10);
    const d = new Date(lastDbStr + 'T00:00:00.000Z');
    d.setDate(d.getDate() + 1);
    const checkDate = new Date(checkUntil + 'T23:59:59.999Z');
    while (d <= checkDate) {
      const day = d.getUTCDay();
      if (day !== 0 && day !== 6) return true;
      d.setDate(d.getDate() + 1);
    }
    return false;
  }

  // --- Private ---

  private async fetchAndStoreDailyPricesFromNaver(code: string, days: number): Promise<void> {
    this.logger.log(`ETF ${code} 네이버 일별시세 ${days}일치 조회...`);
    try {
      const rawItems = await this.naver.fetchDailyPrices(code, days);
      // 16시 이후면 오늘 포함, 이전이면 오늘 제외
      const cutoffDate = getNaverFetchCutoffDate();
      const items = rawItems.filter((i) => i.date < cutoffDate);
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
