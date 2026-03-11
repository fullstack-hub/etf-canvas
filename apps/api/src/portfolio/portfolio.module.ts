import { Module, forwardRef } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { EtfModule } from '../etf/etf.module';
import { RedisModule } from '../redis/redis.module';
import { GeminiModule } from '../gemini/gemini.module';
import { PortfolioController } from './portfolio.controller';
import { PortfolioService } from './portfolio.service';

@Module({
  imports: [PrismaModule, forwardRef(() => EtfModule), RedisModule, GeminiModule],
  controllers: [PortfolioController],
  providers: [PortfolioService],
  exports: [PortfolioService],
})
export class PortfolioModule {}
