import { Module } from '@nestjs/common';
import { NaverService } from './naver.service';

@Module({
  providers: [NaverService],
  exports: [NaverService],
})
export class NaverModule {}
