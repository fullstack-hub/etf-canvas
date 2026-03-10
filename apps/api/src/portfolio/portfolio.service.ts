import { Injectable, NotFoundException } from '@nestjs/common';
import { createHash, randomUUID } from 'crypto';
import { PrismaService } from '../prisma/prisma.service';
import { EtfService } from '../etf/etf.service';
import { RedisService } from '../redis/redis.service';
import { GeminiService, FALLBACK_MSG } from '../gemini/gemini.service';
import { generateSlug } from './slug.util';

const PERIODS = ['1w', '1m', '3m', '6m', '1y', '3y'] as const;

export interface PortfolioSnapshot {
  periods: Record<string, {
    totalReturn: number;
    annualizedReturn: number;
    maxDrawdown: number;
  }>;
  avgVolatility: number;
}

@Injectable()
export class PortfolioService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly etfService: EtfService,
    private readonly redis: RedisService,
    private readonly gemini: GeminiService,
  ) {}

  async feedback(items: { code: string; name: string; weight: number; category: string }[]) {
    const today = new Date().toISOString().slice(0, 10);
    const sorted = [...items].sort((a, b) => a.code.localeCompare(b.code));
    const hash = createHash('sha256')
      .update(sorted.map((i) => `${i.code}:${i.weight}`).join(',') + ':' + today)
      .digest('hex')
      .slice(0, 16);
    const cacheKey = `feedback:${hash}`;

    const cached = await this.redis.getJson<any>(cacheKey);
    if (cached) return cached;

    const marketContext = await this.getMarketContext();
    const result = await this.gemini.analyzeFeedback(items, marketContext);
    // fallback(실패) 응답은 캐시하지 않음
    if (result.feedback !== FALLBACK_MSG) {
      await this.redis.setJson(cacheKey, result, 86400);
    }
    return result;
  }

  // 대표 ETF 가격으로 시장 컨텍스트 수집
  private async getMarketContext() {
    const cacheKey = `market:context:${new Date().toISOString().slice(0, 10)}`;
    const cached = await this.redis.getJson<{ kospi1w: number; sp5001w: number; usdkrw: number; gold1w: number }>(cacheKey);
    if (cached) return cached;

    const benchmarks = [
      { code: '069500', key: 'kospi1w' },   // KODEX 200 (코스피)
      { code: '360750', key: 'sp5001w' },   // TIGER 미국S&P500
      { code: '132030', key: 'gold1w' },    // KODEX 골드선물(H)
      { code: '261240', key: 'usdkrw' },    // TIGER 미국달러단기채권
    ];

    const results = await Promise.allSettled(
      benchmarks.map(async (b) => {
        const prices = await this.etfService.getDailyPrices(b.code, '1m');
        if (prices.length < 2) return { key: b.key, value: 0 };
        const recent = prices[prices.length - 1].close;
        // 약 5거래일 전
        const weekIdx = Math.max(0, prices.length - 6);
        const weekAgo = prices[weekIdx].close;
        return { key: b.key, value: ((recent - weekAgo) / weekAgo) * 100 };
      }),
    );

    const context = { kospi1w: 0, sp5001w: 0, usdkrw: 0, gold1w: 0 };
    for (const res of results) {
      if (res.status === 'fulfilled') {
        if (res.value.key === 'usdkrw') {
          // 달러 ETF는 수익률 대신 최근 종가를 환율 근사치로
          const prices = await this.etfService.getDailyPrices('261240', '1m');
          context.usdkrw = prices.length > 0 ? prices[prices.length - 1].close : 0;
        } else {
          context[res.value.key as keyof typeof context] = Math.round(res.value.value * 100) / 100;
        }
      }
    }

    await this.redis.setJson(cacheKey, context, 86400);
    return context;
  }

  /**
   * 합성 시 자동저장 — 유저당 draft 1개만 유지 (upsert)
   */
  async autoSave(
    userId: string,
    items: { code: string; name: string; weight: number; category?: string }[],
    feedbackResult: { feedback: string; actions: { category: string; label: string }[]; tags: string[]; snippet: string } | null,
  ) {
    const codes = items.map((i) => i.code);
    const weights = items.map((i) => i.weight);
    const snapshot = await this.buildSnapshot(codes, weights);
    const yearData = snapshot.periods['1y'];

    const existing = await this.prisma.portfolio.findFirst({
      where: { userId, isDraft: true },
    });

    const data = {
      items,
      snapshot: snapshot as any,
      returnRate: yearData?.totalReturn ?? null,
      mdd: yearData?.maxDrawdown ?? null,
      feedbackText: feedbackResult?.feedback || null,
      feedbackActions: feedbackResult?.actions
        ? (feedbackResult.actions as any)
        : undefined,
      feedbackSnippet: feedbackResult?.snippet || null,
      tags: feedbackResult?.tags || [],
    };

    if (existing) {
      // 기존 draft 업데이트
      return this.prisma.portfolio.update({
        where: { id: existing.id },
        data: {
          ...data,
          slug: generateSlug(items, existing.id),
        },
      });
    }

    // 새 draft 생성
    const uuid = randomUUID();
    return this.prisma.portfolio.create({
      data: {
        id: uuid,
        userId,
        name: '임시 저장',
        slug: generateSlug(items, uuid),
        isDraft: true,
        ...data,
      },
    });
  }

  /**
   * 명시적 저장 — draft를 정식으로 전환하거나 새로 생성
   */
  async create(
    userId: string,
    name: string,
    items: { code: string; name: string; weight: number; category?: string }[],
  ) {
    // draft가 있으면 정식 전환
    const draft = await this.prisma.portfolio.findFirst({
      where: { userId, isDraft: true },
    });

    if (draft) {
      return this.prisma.portfolio.update({
        where: { id: draft.id },
        data: {
          name,
          slug: generateSlug(items, draft.id),
          isDraft: false,
        },
      });
    }

    // draft 없으면 새로 생성 (피드백 포함)
    const codes = items.map((i) => i.code);
    const weights = items.map((i) => i.weight);
    const snapshot = await this.buildSnapshot(codes, weights);
    const yearData = snapshot.periods['1y'];

    const uuid = randomUUID();
    const slug = generateSlug(items, uuid);

    let feedbackResult: { feedback: string; actions: { category: string; label: string }[]; tags: string[]; snippet: string } | null = null;
    try {
      const feedbackItems = items.map((i) => ({
        code: i.code, name: i.name, weight: i.weight, category: i.category || '',
      }));
      feedbackResult = await this.feedback(feedbackItems);
    } catch { /* 피드백 실패해도 저장 진행 */ }

    return this.prisma.portfolio.create({
      data: {
        id: uuid,
        userId,
        name,
        slug,
        items,
        snapshot: snapshot as any,
        returnRate: yearData?.totalReturn ?? null,
        mdd: yearData?.maxDrawdown ?? null,
        feedbackText: feedbackResult?.feedback || null,
        feedbackActions: feedbackResult?.actions
          ? (feedbackResult.actions as any)
          : undefined,
        feedbackSnippet: feedbackResult?.snippet || null,
        tags: feedbackResult?.tags || [],
      },
    });
  }

  private async buildSnapshot(codes: string[], weights: number[]): Promise<PortfolioSnapshot> {
    const periodResults: PortfolioSnapshot['periods'] = {};
    const allDailyReturns: number[] = [];

    // ETF 중 가장 늦게 상장한 날짜 기준으로 가능한 기간만 필터
    const etfs = await Promise.all(codes.map((code) => this.prisma.etf.findUnique({ where: { code }, select: { listedDate: true } })));
    const latestListed = etfs.reduce((max, e) => {
      if (!e?.listedDate) return max;
      return e.listedDate > max ? e.listedDate : max;
    }, new Date(0));
    const daysSinceListed = Math.ceil((Date.now() - latestListed.getTime()) / (1000 * 60 * 60 * 24));

    const PERIOD_DAYS: Record<string, number> = { '1w': 7, '1m': 30, '3m': 90, '6m': 180, '1y': 365, '3y': 1095 };
    const availablePeriods = PERIODS.filter((p) => daysSinceListed >= PERIOD_DAYS[p]);

    const results = await Promise.allSettled(
      availablePeriods.map((period) =>
        this.etfService.simulate({ codes, weights, amount: 10_000_000, period }).then((r) => ({ period, result: r })),
      ),
    );

    for (const res of results) {
      if (res.status !== 'fulfilled') continue;
      const { period, result } = res.value;

      periodResults[period] = {
        totalReturn: result.totalReturn,
        annualizedReturn: result.annualizedReturn,
        maxDrawdown: result.maxDrawdown,
      };

      if (period === '1y' && result.dailyValues.length > 1) {
        for (let i = 1; i < result.dailyValues.length; i++) {
          const prev = result.dailyValues[i - 1].value;
          const curr = result.dailyValues[i].value;
          if (prev > 0) allDailyReturns.push((curr - prev) / prev);
        }
      }
    }

    // 평균 변동성 (일별 수익률 표준편차 * sqrt(252))
    let avgVolatility = 0;
    if (allDailyReturns.length > 1) {
      const mean = allDailyReturns.reduce((a, b) => a + b, 0) / allDailyReturns.length;
      const variance = allDailyReturns.reduce((sum, r) => sum + (r - mean) ** 2, 0) / (allDailyReturns.length - 1);
      avgVolatility = Math.round(Math.sqrt(variance) * Math.sqrt(252) * 10000) / 100;
    }

    return { periods: periodResults, avgVolatility };
  }

  /**
   * 저장일 ~ 오늘 시뮬레이션 ("그때 샀더라면")
   */
  async since(userId: string, id: string) {
    // 일별 캐시 (당일 시딩 후 한번만 계산)
    const today = new Date().toISOString().slice(0, 10);
    const cacheKey = `portfolio:since:${id}:${today}`;
    const cached = await this.redis.getJson<any>(cacheKey);
    if (cached) return cached;

    const p = await this.prisma.portfolio.findFirst({ where: { id, userId } });
    if (!p) throw new NotFoundException();

    const items = p.items as { code: string; name: string; weight: number }[];
    const saveDate = p.createdAt;
    const now = new Date();
    const saveDateStr = saveDate.toISOString().slice(0, 10);
    const todayStr = now.toISOString().slice(0, 10);

    // 저장일과 오늘이 같은 날이면 바로 리턴
    if (saveDateStr === todayStr) {
      const result = { totalReturn: 0, annualizedReturn: 0, maxDrawdown: 0, dailyValues: [], daysSinceSave: 0, message: 'today' };
      await this.redis.setJson(cacheKey, result, 86400);
      return result;
    }

    const daysSinceSave = Math.floor((now.getTime() - saveDate.getTime()) / (1000 * 60 * 60 * 24));

    // 저장일부터의 가격 데이터로 시뮬레이션
    const codes = items.map((i) => i.code);
    const weights = items.map((i) => i.weight);

    // getDailyPrices는 period 기반이므로 충분한 기간을 요청하고 saveDate 이후만 필터
    const periodForDays = daysSinceSave <= 7 ? '1m' : daysSinceSave <= 90 ? '6m' : daysSinceSave <= 365 ? '1y' : '3y';

    const allPrices = await Promise.all(
      codes.map((code) => this.etfService.getDailyPrices(code, periodForDays)),
    );

    // date→close 맵, saveDate 이후만
    const priceMaps = allPrices.map((prices) => {
      const map = new Map<string, number>();
      for (const p of prices) {
        if (p.date >= saveDateStr) map.set(p.date, p.close);
      }
      return map;
    });

    // 공통 날짜 (교집합, saveDate 이후)
    const allDateSets = priceMaps.map((m) => new Set(m.keys()));
    const commonDates = [...(priceMaps[0]?.keys() || [])]
      .filter((d) => allDateSets.every((s) => s.has(d)))
      .sort();

    if (commonDates.length < 2) {
      const result = { totalReturn: 0, annualizedReturn: 0, maxDrawdown: 0, dailyValues: [], daysSinceSave, message: 'no_trading_days' };
      await this.redis.setJson(cacheKey, result, 86400);
      return result;
    }

    const amount = 10_000_000;
    const basePrices = priceMaps.map((m) => m.get(commonDates[0]) || 1);
    const etfAmounts = weights.map((w) => amount * (w / 100));
    const dailyValues: { date: string; value: number }[] = [];

    for (const date of commonDates) {
      let totalValue = 0;
      for (let i = 0; i < codes.length; i++) {
        const close = priceMaps[i].get(date);
        if (close) totalValue += etfAmounts[i] * (close / basePrices[i]);
      }
      dailyValues.push({ date, value: Math.round(totalValue) });
    }

    const lastValue = dailyValues[dailyValues.length - 1]?.value || amount;
    const totalReturn = Math.round(((lastValue - amount) / amount) * 10000) / 100;

    let peak = -Infinity;
    let maxDrawdown = 0;
    for (const dv of dailyValues) {
      if (dv.value > peak) peak = dv.value;
      const dd = ((peak - dv.value) / peak) * 100;
      if (dd > maxDrawdown) maxDrawdown = dd;
    }
    maxDrawdown = Math.round(maxDrawdown * 100) / 100;

    const calendarDays = (new Date(commonDates[commonDates.length - 1]).getTime() - new Date(commonDates[0]).getTime()) / (1000 * 60 * 60 * 24);
    const annualizedReturn = calendarDays > 0
      ? Math.round((Math.pow(1 + totalReturn / 100, 365 / calendarDays) - 1) * 10000) / 100
      : totalReturn;

    const result = {
      totalReturn,
      annualizedReturn,
      maxDrawdown,
      dailyValues,
      daysSinceSave,
    };

    // 86400초 = 1일 캐시
    await this.redis.setJson(cacheKey, result, 86400);
    return result;
  }

  async list(userId: string, sort?: string) {
    let orderBy: any;
    switch (sort) {
      case 'return': orderBy = { returnRate: 'desc' }; break;
      case 'mdd': orderBy = { mdd: 'asc' }; break;
      default: orderBy = { createdAt: 'desc' };
    }
    return this.prisma.portfolio.findMany({
      where: { userId, isDraft: false },
      orderBy,
    });
  }

  async get(userId: string, id: string) {
    const p = await this.prisma.portfolio.findFirst({ where: { id, userId } });
    if (!p) throw new NotFoundException();
    return p;
  }

  async getPublic(slug: string) {
    const p = await this.prisma.portfolio.findUnique({ where: { slug } });
    if (!p) throw new NotFoundException();
    return {
      name: p.name,
      slug: p.slug,
      items: p.items,
      snapshot: p.snapshot,
      returnRate: p.returnRate,
      mdd: p.mdd,
      feedbackText: p.feedbackText,
      feedbackActions: p.feedbackActions,
      feedbackSnippet: p.feedbackSnippet,
      tags: p.tags,
      createdAt: p.createdAt,
    };
  }

  async getTop(limit: number) {
    return this.prisma.portfolio.findMany({
      where: { isDraft: false },
      select: {
        name: true,
        slug: true,
        items: true,
        returnRate: true,
        mdd: true,
        feedbackSnippet: true,
        tags: true,
        createdAt: true,
      },
      orderBy: { createdAt: 'desc' },
      take: Math.min(limit, 50),
    });
  }

  async listTags() {
    const portfolios = await this.prisma.portfolio.findMany({
      where: { isDraft: false },
      select: { tags: true },
    });
    const tagCount = new Map<string, number>();
    for (const p of portfolios) {
      for (const tag of p.tags) {
        tagCount.set(tag, (tagCount.get(tag) || 0) + 1);
      }
    }
    return [...tagCount.entries()]
      .sort((a, b) => b[1] - a[1])
      .map(([tag, count]) => ({ tag, count }));
  }

  async getByTag(tag: string) {
    return this.prisma.portfolio.findMany({
      where: { tags: { has: tag }, isDraft: false },
      select: {
        name: true,
        slug: true,
        items: true,
        returnRate: true,
        feedbackSnippet: true,
        tags: true,
        createdAt: true,
      },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });
  }

  async listSlugs() {
    return this.prisma.portfolio.findMany({
      where: { isDraft: false },
      select: { slug: true, updatedAt: true },
      orderBy: { createdAt: 'desc' },
    });
  }

  async delete(userId: string, id: string) {
    const p = await this.prisma.portfolio.findFirst({ where: { id, userId } });
    if (!p) throw new NotFoundException();
    await this.prisma.portfolio.delete({ where: { id } });
    return { ok: true };
  }
}
