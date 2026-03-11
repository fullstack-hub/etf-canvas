import { Controller, Get, Post, Param, Query, Body, UseGuards } from '@nestjs/common';
import { ApiSecurity } from '@nestjs/swagger';
import { EtfService } from './etf.service';
import { PortfolioService } from '../portfolio/portfolio.service';
import { AdminGuard } from '../auth/admin.guard';
import type { CompareRequest, SimulateRequest, ETFSortBy } from '@etf-canvas/shared';

@Controller('etf')
export class EtfController {
  constructor(
    private etfService: EtfService,
    private portfolioService: PortfolioService,
  ) {}

  @Get('search')
  search(
    @Query('q') q: string,
    @Query('category') category?: string,
    @Query('sort') sort?: ETFSortBy,
    @Query('benchmark') benchmark?: string,
    @Query('offset') offset?: string,
    @Query('limit') limit?: string,
  ) {
    return this.etfService.search(q || '', category, sort, benchmark, Number(offset) || 0, Number(limit) || 50);
  }

  @Get('list')
  list(
    @Query('category') category?: string,
    @Query('sort') sort?: ETFSortBy,
    @Query('benchmark') benchmark?: string,
    @Query('offset') offset?: string,
    @Query('limit') limit?: string,
  ) {
    return this.etfService.search('', category, sort, benchmark, Number(offset) || 0, Number(limit) || 50);
  }

  @Get('count')
  count(@Query('q') q?: string, @Query('category') category?: string) {
    return this.etfService.count(q, category);
  }

  @Post('seed')
  @UseGuards(AdminGuard)
  @ApiSecurity('api-key')
  async seed() {
    const count = await this.etfService.seed();
    // 갤러리 캐시 워밍 (수익률/MDD/분배금 TOP)
    await Promise.all([
      this.portfolioService.getTop(6, 'return'),
      this.portfolioService.getTop(6, 'mdd'),
      this.portfolioService.getTop(6, 'dividend'),
    ]);
    return count;
  }

  @Get(':code')
  getDetail(@Param('code') code: string) {
    return this.etfService.getDetail(code);
  }

  @Get(':code/dividends')
  getDividends(@Param('code') code: string) {
    return this.etfService.getDividends(code);
  }

  @Get(':code/prices')
  getDailyPrices(
    @Param('code') code: string,
    @Query('period') period: string = '1y',
  ) {
    return this.etfService.getDailyPrices(code, period);
  }

  @Post('compare')
  compare(@Body() body: CompareRequest) {
    return this.etfService.compare(body);
  }

  @Post('simulate')
  simulate(@Body() body: SimulateRequest) {
    return this.etfService.simulate(body);
  }
}
