import { Global, Module } from '@nestjs/common';
import { KiwoomService } from './kiwoom.service';

@Global()
@Module({
  providers: [KiwoomService],
  exports: [KiwoomService],
})
export class KiwoomModule {}
