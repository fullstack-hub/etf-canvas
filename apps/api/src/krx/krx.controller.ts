import { Controller, Post } from '@nestjs/common';
import { KrxService } from './krx.service';

@Controller('krx')
export class KrxController {
  constructor(private krxService: KrxService) {}

  @Post('sync')
  async sync() {
    await this.krxService.syncAll();
    return { status: 'ok', message: 'Sync completed' };
  }
}
