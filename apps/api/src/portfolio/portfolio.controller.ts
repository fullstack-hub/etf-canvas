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
export class PortfolioController {
  constructor(private readonly svc: PortfolioService) {}

  @Post('feedback')
  feedback(
    @Body() body: { items: { code: string; name: string; weight: number; category: string }[] },
  ) {
    return this.svc.feedback(body.items);
  }

  @Post()
  @UseGuards(JwtGuard)
  create(
    @Req() req: any,
    @Body() body: { name: string; items: { code: string; name: string; weight: number; category?: string }[] },
  ) {
    return this.svc.create(req.userId, body.name, body.items);
  }

  @Get()
  @UseGuards(JwtGuard)
  list(@Req() req: any, @Query('sort') sort?: string) {
    return this.svc.list(req.userId, sort);
  }

  @Get(':id')
  @UseGuards(JwtGuard)
  get(@Req() req: any, @Param('id') id: string) {
    return this.svc.get(req.userId, id);
  }

  @Get(':id/since')
  @UseGuards(JwtGuard)
  since(@Req() req: any, @Param('id') id: string) {
    return this.svc.since(req.userId, id);
  }

  @Delete(':id')
  @UseGuards(JwtGuard)
  delete(@Req() req: any, @Param('id') id: string) {
    return this.svc.delete(req.userId, id);
  }
}
