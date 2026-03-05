import { Module } from '@nestjs/common';
import { PrismaModule } from './prisma/prisma.module';
import { RedisModule } from './redis/redis.module';
import { KiwoomModule } from './kiwoom/kiwoom.module';
import { EtfModule } from './etf/etf.module';

@Module({
  imports: [
    PrismaModule,
    RedisModule,
    KiwoomModule,
    EtfModule,
  ],
})
export class AppModule {}
