import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { PrismaModule } from './prisma/prisma.module';
import { RedisModule } from './redis/redis.module';
import { KiwoomModule } from './kiwoom/kiwoom.module';
import { EtfModule } from './etf/etf.module';
import { KrxModule } from './krx/krx.module';

@Module({
  imports: [
    ScheduleModule.forRoot(),
    PrismaModule,
    RedisModule,
    KiwoomModule,
    EtfModule,
    KrxModule,
  ],
})
export class AppModule {}
