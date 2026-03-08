import { Module } from '@nestjs/common';
import { NaverModule } from '../naver/naver.module';
import { SeibroModule } from '../seibro/seibro.module';
import { EtfController } from './etf.controller';
import { EtfService } from './etf.service';

@Module({
  imports: [NaverModule, SeibroModule],
  controllers: [EtfController],
  providers: [EtfService],
  exports: [EtfService],
})
export class EtfModule {}
