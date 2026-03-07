import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

interface NaverETFItem {
  itemcode: string;
  etfTabCode: number;
  itemname: string;
  nowVal: number;
  changeVal: number;
  changeRate: number;
  nav: number;
  threeMonthEarnRate: number;
  quant: number;
  amonut: number;
  marketSum: number;
}

interface NaverETFResponse {
  resultCode: string;
  result: {
    etfItemList: NaverETFItem[];
    totalCount: number;
  };
}

const ETF_TAB_CODE_TO_CATEGORY: Record<number, string> = {
  1: '국내 대표지수',
  2: '섹터/테마',
  3: '레버리지/인버스',
  4: '해외 대표지수',
  5: '원자재',
  6: '채권',
  7: '혼합',
};

@Injectable()
export class NaverService {
  private readonly logger = new Logger(NaverService.name);

  constructor(private prisma: PrismaService) {}

  async seedAllEtfs(): Promise<number> {
    this.logger.log('네이버 금융 ETF 전종목 시딩 시작...');

    const response = await fetch(
      'https://finance.naver.com/api/sise/etfItemList.nhn?etfType=0&targetColumn=market_sum&sortOrder=desc',
      { headers: { 'User-Agent': 'Mozilla/5.0' } },
    );

    const buffer = await response.arrayBuffer();
    const text = new TextDecoder('euc-kr').decode(buffer);
    const data: NaverETFResponse = JSON.parse(text);

    const items = data.result.etfItemList;
    this.logger.log(`네이버 API 응답: ${items.length}종목`);

    for (const item of items) {
      const categories = this.buildCategories(item);
      const issuer = this.extractIssuer(item.itemname);

      await this.prisma.etf.upsert({
        where: { code: item.itemcode },
        update: {
          name: item.itemname,
          categories,
          etfTabCode: item.etfTabCode,
          issuer,
          price: item.nowVal,
          changeRate: item.changeRate,
          nav: item.nav,
          threeMonthEarnRate: item.threeMonthEarnRate,
          volume: BigInt(item.quant || 0),
          aum: BigInt(item.marketSum || 0),
          updatedAt: new Date(),
        },
        create: {
          code: item.itemcode,
          name: item.itemname,
          categories,
          etfTabCode: item.etfTabCode,
          issuer,
          price: item.nowVal,
          changeRate: item.changeRate,
          nav: item.nav,
          threeMonthEarnRate: item.threeMonthEarnRate,
          volume: BigInt(item.quant || 0),
          aum: BigInt(item.marketSum || 0),
        },
      });
    }

    // 네이버 목록에 없는 종목 삭제 (상폐/합병 등) — 연관 데이터 먼저 삭제
    const activeCodes = items.map((i) => i.itemcode);
    const staleFilter = { where: { etfCode: { notIn: activeCodes } } };
    await this.prisma.etfHolding.deleteMany(staleFilter);
    await this.prisma.etfDailyPrice.deleteMany(staleFilter);
    await this.prisma.etfReturn.deleteMany(staleFilter);
    const deleted = await this.prisma.etf.deleteMany({
      where: { code: { notIn: activeCodes } },
    });
    if (deleted.count > 0) {
      this.logger.log(`상폐/제거 ETF ${deleted.count}건 삭제`);
    }

    this.logger.log(`네이버 ETF ${items.length}종목 기본 시딩 완료. 통합정보 전종목 조회 시작...`);

    // 전종목 integration 호출 (수익률 매일 갱신) — 10개씩 병렬
    const allCodes = items.map((i) => i.itemcode);
    const BATCH = 10;
    let updatedCount = 0;
    for (let i = 0; i < allCodes.length; i += BATCH) {
      const batch = allCodes.slice(i, i + BATCH);
      const results = await Promise.allSettled(
        batch.map(async (code: string) => {
          const { benchmark, expenseRatio, issuer, oneMonthEarnRate, sixMonthEarnRate, oneYearEarnRate } = await this.fetchIntegrationData(code);
          const update: Record<string, unknown> = {};
          if (benchmark) update.benchmark = benchmark;
          if (expenseRatio != null) update.expenseRatio = expenseRatio;
          if (issuer) update.issuer = issuer;
          if (oneMonthEarnRate != null) update.oneMonthEarnRate = oneMonthEarnRate;
          if (sixMonthEarnRate != null) update.sixMonthEarnRate = sixMonthEarnRate;
          if (oneYearEarnRate != null) update.oneYearEarnRate = oneYearEarnRate;
          if (Object.keys(update).length > 0) {
            await this.prisma.etf.update({ where: { code }, data: update });
            return true;
          }
          return false;
        }),
      );
      updatedCount += results.filter((r) => r.status === 'fulfilled' && r.value).length;
      if (i % 100 === 0 && i > 0) {
        this.logger.log(`통합정보 진행: ${i}/${allCodes.length}`);
      }
      await new Promise((r) => setTimeout(r, 200));
    }

    this.logger.log(`네이버 ETF ${items.length}종목 시딩 완료 (통합정보 ${updatedCount}건 업데이트)`);
    return items.length;
  }

  private buildCategories(item: NaverETFItem): string[] {
    const cats: string[] = [];

    // 네이버 etfTabCode 기본 카테고리
    const primary = ETF_TAB_CODE_TO_CATEGORY[item.etfTabCode];
    if (primary) cats.push(primary);

    // 종목명에 "액티브" 포함 시 액티브 카테고리 추가
    if (item.itemname.includes('액티브')) {
      cats.push('액티브');
    }

    return cats;
  }

  async fetchDailyPrices(code: string, days: number): Promise<{ date: string; open: number; high: number; low: number; close: number; volume: number }[]> {
    const end = new Date();
    const start = new Date();
    start.setDate(start.getDate() - days - 10); // buffer for holidays

    const startStr = start.toISOString().slice(0, 10).replace(/-/g, '');
    const endStr = end.toISOString().slice(0, 10).replace(/-/g, '');

    const url = `https://api.finance.naver.com/siseJson.naver?symbol=${code}&requestType=1&startTime=${startStr}&endTime=${endStr}&timeframe=day`;
    const response = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0' } });
    const text = await response.text();

    // Response is JS array literal, not valid JSON — parse it
    const cleaned = text.trim().replace(/'/g, '"').replace(/,\s*]/g, ']');
    const parsed: (string | number)[][] = JSON.parse(cleaned);

    // Skip header row
    return parsed.slice(1).map((row) => ({
      date: `${String(row[0]).slice(0, 4)}-${String(row[0]).slice(4, 6)}-${String(row[0]).slice(6, 8)}`,
      open: Number(row[1]),
      high: Number(row[2]),
      low: Number(row[3]),
      close: Number(row[4]),
      volume: Number(row[5]),
    }));
  }

  async fetchIntegrationData(code: string): Promise<{
    benchmark: string | null;
    expenseRatio: number | null;
    issuer: string | null;
    oneMonthEarnRate: number | null;
    sixMonthEarnRate: number | null;
    oneYearEarnRate: number | null;
  }> {
    const empty = { benchmark: null, expenseRatio: null, issuer: null, oneMonthEarnRate: null, sixMonthEarnRate: null, oneYearEarnRate: null };
    try {
      const data = await this.fetchIntegration(code);
      if (!data) return empty;

      const indicator = data.etfKeyIndicator || {};
      const infos = data.totalInfos || [];

      const baseIdx = infos.find((i: any) => i.code === 'etfBaseIdx');
      const benchmark = baseIdx?.value || null;

      let expenseRatio: number | null = null;
      if (indicator.totalFee != null) {
        expenseRatio = indicator.totalFee / 100;
      } else {
        const fundPay = infos.find((i: any) => i.code === 'fundPay');
        if (fundPay?.value) {
          const pct = parseFloat(fundPay.value.replace('%', ''));
          expenseRatio = isNaN(pct) ? null : pct / 100;
        }
      }

      const issuer = indicator.issuerName?.replace('(ETF)', '').trim() || null;

      const oneMonthEarnRate = indicator.returnRate1m ?? null;
      const sixMonthEarnRate = indicator.returnRate6m ?? null;
      const oneYearEarnRate = indicator.returnRate1y ?? null;

      return { benchmark, expenseRatio, issuer, oneMonthEarnRate, sixMonthEarnRate, oneYearEarnRate };
    } catch {
      return empty;
    }
  }

  async fetchExpenseRatio(code: string): Promise<number | null> {
    return (await this.fetchIntegrationData(code)).expenseRatio;
  }

  async fetchBenchmark(code: string): Promise<string | null> {
    return (await this.fetchIntegrationData(code)).benchmark;
  }

  async fetchHoldings(code: string): Promise<{ stockName: string; weight: number }[]> {
    try {
      const url = `https://finance.naver.com/item/main.naver?code=${encodeURIComponent(code)}`;
      const resp = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0' } });
      if (!resp.ok) return [];
      const html = await resp.text();

      const sectionMatch = html.match(/etf_asset[\s\S]*?<\/table>/);
      if (!sectionMatch) return [];

      const tdRegex = /<td[^>]*>([\s\S]*?)<\/td>/g;
      const cells: string[] = [];
      let m: RegExpExecArray | null;
      while ((m = tdRegex.exec(sectionMatch[0])) !== null) {
        cells.push(m[1].replace(/<[^>]+>/g, '').trim());
      }

      const holdings: { stockName: string; weight: number }[] = [];
      for (let i = 0; i < cells.length; i++) {
        const pct = cells[i].match(/^(\d+\.?\d*)%$/);
        if (pct) {
          const name = cells[i - 2] || '';
          if (name) {
            holdings.push({ stockName: name, weight: parseFloat(pct[1]) });
          }
        }
      }

      return holdings;
    } catch {
      return [];
    }
  }

  private async fetchIntegration(code: string): Promise<any | null> {
    const url = `https://m.stock.naver.com/api/stock/${code}/integration`;
    const resp = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0' } });
    if (!resp.ok) return null;
    return resp.json();
  }

  private extractIssuer(name: string): string {
    const prefixes = [
      'KODEX', 'TIGER', 'KINDEX', 'ACE', 'KOSEF', 'ARIRANG',
      'SOL', 'HANARO', 'KBSTAR', 'TIMEFOLIO', 'PLUS', 'WOORI',
      'BNK', 'FOCUS', 'TREX', 'VITA',
    ];
    for (const prefix of prefixes) {
      if (name.startsWith(prefix)) return prefix;
    }
    return '';
  }
}
