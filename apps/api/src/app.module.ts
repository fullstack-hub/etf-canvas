import { Module, Controller, Get } from '@nestjs/common';
import { PrismaModule } from './prisma/prisma.module';
import { RedisModule } from './redis/redis.module';
import { NaverModule } from './naver/naver.module';
import { EtfModule } from './etf/etf.module';
import { PortfolioModule } from './portfolio/portfolio.module';
import { UserModule } from './user/user.module';
import { NaverUserinfoProxyController } from './auth/naver-userinfo-proxy.controller';

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
    NaverModule,
    EtfModule,
    PortfolioModule,
    UserModule,
  ],
  controllers: [HealthController, NaverUserinfoProxyController],
})
export class AppModule {}
