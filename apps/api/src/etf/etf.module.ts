import { Module, forwardRef } from '@nestjs/common';
import { NaverModule } from '../naver/naver.module';
import { SeibroModule } from '../seibro/seibro.module';
import { PortfolioModule } from '../portfolio/portfolio.module';
import { EtfController } from './etf.controller';
import { EtfService } from './etf.service';

@Module({
  imports: [NaverModule, SeibroModule, forwardRef(() => PortfolioModule)],
  controllers: [EtfController],
  providers: [EtfService],
  exports: [EtfService],
})
export class EtfModule {}
