import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { KiwoomAPI } from '@fullstack-hub/kiwoom-restapi';

@Injectable()
export class KiwoomService implements OnModuleInit, OnModuleDestroy {
  private api: KiwoomAPI;

  constructor() {
    this.api = new KiwoomAPI({
      appKey: process.env.KIWOOM_APP_KEY!,
      secretKey: process.env.KIWOOM_APP_SECRET!,
      env: (process.env.KIWOOM_ENV as 'production' | 'paper') || 'paper',
    });
  }

  async onModuleInit() {
    await this.api.connect();
  }

  async onModuleDestroy() {
    await this.api.disconnect();
  }

  get etf() { return this.api.etf; }
  get stock() { return this.api.stock; }
  get ranking() { return this.api.ranking; }
}
