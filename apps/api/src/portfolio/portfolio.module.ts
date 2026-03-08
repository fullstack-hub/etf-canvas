import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { EtfModule } from '../etf/etf.module';
import { RedisModule } from '../redis/redis.module';
import { GeminiModule } from '../gemini/gemini.module';
import { PortfolioController } from './portfolio.controller';
import { PortfolioService } from './portfolio.service';

@Module({
  imports: [PrismaModule, EtfModule, RedisModule, GeminiModule],
  controllers: [PortfolioController],
  providers: [PortfolioService],
})
export class PortfolioModule {}
