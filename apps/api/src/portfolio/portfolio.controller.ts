import {
  Controller,
  Get,
  Post,
  Delete,
  Body,
  Param,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { PortfolioService } from './portfolio.service';
import { JwtGuard } from '../auth/jwt.guard';

@Controller('portfolio')
@UseGuards(JwtGuard)
export class PortfolioController {
  constructor(private readonly svc: PortfolioService) {}

  @Post()
  create(
    @Req() req: any,
    @Body() body: { name: string; items: { code: string; name: string; weight: number }[]; returnRate?: number; mdd?: number },
  ) {
    return this.svc.create(req.userId, body.name, body.items, body.returnRate, body.mdd);
  }

  @Get()
  list(@Req() req: any, @Query('sort') sort?: string) {
    return this.svc.list(req.userId, sort);
  }

  @Get(':id')
  get(@Req() req: any, @Param('id') id: string) {
    return this.svc.get(req.userId, id);
  }

  @Delete(':id')
  delete(@Req() req: any, @Param('id') id: string) {
    return this.svc.delete(req.userId, id);
  }
}
