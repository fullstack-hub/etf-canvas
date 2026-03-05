import { Module } from '@nestjs/common';
import { KrxController } from './krx.controller';
import { KrxService } from './krx.service';

@Module({
  controllers: [KrxController],
  providers: [KrxService],
})
export class KrxModule {}
