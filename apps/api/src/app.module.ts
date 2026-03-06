import { Module, Controller, Get } from '@nestjs/common';
import { PrismaModule } from './prisma/prisma.module';
import { RedisModule } from './redis/redis.module';
import { KiwoomModule } from './kiwoom/kiwoom.module';
import { NaverModule } from './naver/naver.module';
import { EtfModule } from './etf/etf.module';

@Controller()
class HealthController {
  @Get()
  health() {
    return { status: 'ok' };
  }
}

@Module({
  imports: [
    PrismaModule,
    RedisModule,
    KiwoomModule,
    NaverModule,
    EtfModule,
  ],
  controllers: [HealthController],
})
export class AppModule {}
