import {
  Controller,
  Get,
  Post,
  Patch,
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

  @Get('public/slugs')
  listSlugs() {
    return this.svc.listSlugs();
  }

  @Get('public/top')
  getTop(@Query('limit') limit?: string, @Query('sort') sort?: string) {
    const validSort = ['latest', 'return', 'mdd', 'dividend'].includes(sort || '') ? sort as 'latest' | 'return' | 'mdd' | 'dividend' : 'latest';
    return this.svc.getTop(Number(limit) || 20, validSort);
  }

  @Get('public/tags')
  listTags() {
    return this.svc.listTags();
  }

  @Get('public/by-tag/:tag')
  getByTag(@Param('tag') tag: string) {
    return this.svc.getByTag(tag);
  }

  @Get('public/:slug/since')
  publicSince(@Param('slug') slug: string) {
    return this.svc.publicSince(slug);
  }

  @Get('public/:slug')
  getPublic(@Param('slug') slug: string) {
    return this.svc.getPublic(slug);
  }

  @Post('backfill-snapshots')
  backfillSnapshots() {
    return this.svc.backfillSnapshots();
  }

  @Post('auto-save')
  @UseGuards(JwtGuard)
  @ApiBearerAuth('jwt')
  autoSave(
    @Req() req: any,
    @Body() body: {
      items: { code: string; name: string; weight: number; category?: string }[];
      feedback: { feedback: string; actions: { category: string; label: string }[]; tags: string[]; snippet: string } | null;
      totalAmount?: number;
    },
  ) {
    return this.svc.autoSave(req.userId, body.items, body.feedback, body.totalAmount);
  }

  @Post()
  @UseGuards(JwtGuard)
  @ApiBearerAuth('jwt')
  create(
    @Req() req: any,
    @Body() body: { name: string; items: { code: string; name: string; weight: number; category?: string }[]; feedback?: { feedback: string; actions: { category: string; label: string }[]; tags: string[]; snippet: string } | null; totalAmount?: number },
  ) {
    return this.svc.create(req.userId, body.name, body.items, body.feedback || null, body.totalAmount);
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

  @Patch(':id/name')
  @UseGuards(JwtGuard)
  @ApiBearerAuth('jwt')
  rename(
    @Req() req: any,
    @Param('id') id: string,
    @Body() body: { name: string },
  ) {
    return this.svc.rename(req.userId, id, body.name);
  }

  @Delete(':id')
  @UseGuards(JwtGuard)
  @ApiBearerAuth('jwt')
  delete(@Req() req: any, @Param('id') id: string) {
    return this.svc.delete(req.userId, id);
  }
}
