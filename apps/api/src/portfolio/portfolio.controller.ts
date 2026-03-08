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
import { ApiBearerAuth } from '@nestjs/swagger';
import { PortfolioService } from './portfolio.service';
import { JwtGuard } from '../auth/jwt.guard';

@Controller('portfolio')
export class PortfolioController {
  constructor(private readonly svc: PortfolioService) {}

  @Post('feedback')
  feedback(
    @Body() body: { items: { code: string; name: string; weight: number; category: string }[] },
  ) {
    if (!Array.isArray(body?.items) || body.items.length === 0) {
      return { feedback: '피드백을 생성할 수 없어요.', actions: [] };
    }
    return this.svc.feedback(body.items);
  }

  @Post()
  @UseGuards(JwtGuard)
  @ApiBearerAuth('jwt')
  create(
    @Req() req: any,
    @Body() body: { name: string; items: { code: string; name: string; weight: number; category?: string }[] },
  ) {
    return this.svc.create(req.userId, body.name, body.items);
  }

  @Get()
  @UseGuards(JwtGuard)
  @ApiBearerAuth('jwt')
  list(@Req() req: any, @Query('sort') sort?: string) {
    return this.svc.list(req.userId, sort);
  }

  @Get(':id')
  @UseGuards(JwtGuard)
  @ApiBearerAuth('jwt')
  get(@Req() req: any, @Param('id') id: string) {
    return this.svc.get(req.userId, id);
  }

  @Get(':id/since')
  @UseGuards(JwtGuard)
  @ApiBearerAuth('jwt')
  since(@Req() req: any, @Param('id') id: string) {
    return this.svc.since(req.userId, id);
  }

  @Delete(':id')
  @UseGuards(JwtGuard)
  @ApiBearerAuth('jwt')
  delete(@Req() req: any, @Param('id') id: string) {
    return this.svc.delete(req.userId, id);
  }
}
