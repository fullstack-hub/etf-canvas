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
import { AdminGuard } from '../auth/admin.guard';
import { FeedbackRequestDto, AutoSaveDto, CreatePortfolioDto, RenamePortfolioDto } from './portfolio.dto';

@Controller('portfolio')
export class PortfolioController {
  constructor(private readonly svc: PortfolioService) {}

  @Post('feedback')
  feedback(@Body() body: FeedbackRequestDto) {
    return this.svc.feedback(body.items);
  }

  @Get('public/slugs')
  listSlugs(@Query('page') page?: string, @Query('limit') limit?: string) {
    return this.svc.listSlugs(
      page ? parseInt(page, 10) : undefined,
      limit ? parseInt(limit, 10) : undefined,
    );
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
  @UseGuards(AdminGuard)
  backfillSnapshots() {
    return this.svc.backfillSnapshots();
  }

  @Post('auto-save')
  @UseGuards(JwtGuard)
  @ApiBearerAuth('jwt')
  autoSave(@Req() req: any, @Body() body: AutoSaveDto) {
    return this.svc.autoSave(req.userId, body.items, body.feedback, body.totalAmount);
  }

  @Post()
  @UseGuards(JwtGuard)
  @ApiBearerAuth('jwt')
  create(@Req() req: any, @Body() body: CreatePortfolioDto) {
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
    @Body() body: RenamePortfolioDto,
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
