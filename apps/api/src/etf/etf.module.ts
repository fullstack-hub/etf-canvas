import { Module } from '@nestjs/common';
import { EtfController } from './etf.controller';
import { EtfService } from './etf.service';

@Module({
  controllers: [EtfController],
  providers: [EtfService],
})
export class EtfModule {}
