import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { PrismaService } from '../prisma/prisma.service';
import { KiwoomService } from '../kiwoom/kiwoom.service';

@Injectable()
export class KrxService {
  private readonly logger = new Logger(KrxService.name);

  constructor(
    private prisma: PrismaService,
    private kiwoom: KiwoomService,
  ) {}

  @Cron('0 18 * * 1-5')
  async syncAll() {
    this.logger.log('ETF 데이터 동기화 시작');
    await this.syncEtfList();
    await this.syncDailyPrices();
    await this.syncReturns();
    this.logger.log('ETF 데이터 동기화 완료');
  }

  async syncEtfList() {
    this.logger.log('ETF 전종목 시세 동기화...');
    const response = await this.kiwoom.etf.getETFAllQuote();
    const items = response.etf_all_qt || [];

    for (const item of items) {
      await this.prisma.etf.upsert({
        where: { code: item.stk_cd },
        update: { name: item.stk_nm, updatedAt: new Date() },
        create: { code: item.stk_cd, name: item.stk_nm },
      });
    }
    this.logger.log(`ETF ${items.length}종목 동기화 완료`);
  }

  async syncDailyPrices() {
    const etfs = await this.prisma.etf.findMany({ select: { code: true } });
    this.logger.log(`일별 시세 동기화: ${etfs.length}종목`);

    for (const etf of etfs) {
      try {
        const response = await this.kiwoom.etf.getETFDailyTrend({ stk_cd: etf.code });
        const items = response.etf_dy_stst || [];

        for (const item of items) {
          const date = this.parseDate(item.dt);
          if (!date) continue;

          await this.prisma.etfDailyPrice.upsert({
            where: { etfCode_date: { etfCode: etf.code, date } },
            update: {
              close: Number(item.cls_prc),
              open: Number(item.opn_prc),
              high: Number(item.hgh_prc),
              low: Number(item.low_prc),
              volume: BigInt(item.trde_qty || '0'),
            },
            create: {
              etfCode: etf.code,
              date,
              close: Number(item.cls_prc),
              open: Number(item.opn_prc),
              high: Number(item.hgh_prc),
              low: Number(item.low_prc),
              volume: BigInt(item.trde_qty || '0'),
            },
          });
        }
      } catch (e: unknown) {
        const message = e instanceof Error ? e.message : String(e);
        this.logger.warn(`일별 시세 동기화 실패: ${etf.code} — ${message}`);
      }
    }
  }

  async syncReturns() {
    const etfs = await this.prisma.etf.findMany({ select: { code: true } });
    this.logger.log(`수익률 동기화: ${etfs.length}종목`);

    for (const etf of etfs) {
      try {
        const response = await this.kiwoom.etf.getETFReturn({ stk_cd: etf.code });
        const items = response.etf_rtn || [];
        if (items.length === 0) continue;

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
            where: { etfCode_period: { etfCode: etf.code, period: p.period } },
            update: { returnRate: Number(p.value), updatedAt: new Date() },
            create: { etfCode: etf.code, period: p.period, returnRate: Number(p.value) },
          });
        }
      } catch (e: unknown) {
        const message = e instanceof Error ? e.message : String(e);
        this.logger.warn(`수익률 동기화 실패: ${etf.code} — ${message}`);
      }
    }
  }

  private parseDate(dt: string): Date | null {
    if (!dt || dt.length < 8) return null;
    const y = dt.substring(0, 4);
    const m = dt.substring(4, 6);
    const d = dt.substring(6, 8);
    return new Date(`${y}-${m}-${d}`);
  }
}
