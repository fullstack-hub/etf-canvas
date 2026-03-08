import { Module } from '@nestjs/common';
import { SeibroService } from './seibro.service';

@Module({
  providers: [SeibroService],
  exports: [SeibroService],
})
export class SeibroModule {}
