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

    this.logger.log(`네이버 ETF ${items.length}종목 시딩 완료`);
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

  async fetchExpenseRatio(code: string): Promise<number | null> {
    try {
      const url = `https://m.stock.naver.com/api/stock/${code}/integration`;
      const resp = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0' } });
      if (!resp.ok) return null;
      const data: any = await resp.json();
      const infos = data.totalInfos || [];
      const fundPay = infos.find((i: any) => i.code === 'fundPay');
      if (!fundPay?.value) return null;
      // "0.15%" -> 0.0015
      const pct = parseFloat(fundPay.value.replace('%', ''));
      return isNaN(pct) ? null : pct / 100;
    } catch {
      return null;
    }
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
