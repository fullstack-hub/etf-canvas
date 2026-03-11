import { Controller, Get, Post, Patch, Delete, Body, Param, Query, Req, UseGuards } from '@nestjs/common';
import { ApiBearerAuth } from '@nestjs/swagger';
import { CommunityService } from './community.service';
import { JwtGuard } from '../auth/jwt.guard';
import { OptionalJwtGuard } from '../auth/optional-jwt.guard';
import { CreatePostDto, UpdatePostDto, CreateCommentDto } from './community.dto';

@Controller('community')
export class CommunityController {
  constructor(private readonly svc: CommunityService) {}

  @Get('categories')
  getCategories() {
    return this.svc.getCategories();
  }

  @Get('posts')
  listPosts(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('sort') sort?: 'latest' | 'popular',
    @Query('categoryId') categoryId?: string,
  ) {
    return this.svc.listPosts({
      page: page ? parseInt(page, 10) : undefined,
      limit: limit ? parseInt(limit, 10) : undefined,
      sort,
      categoryId: categoryId ? parseInt(categoryId, 10) : undefined,
    });
  }

  @Get('posts/weekly-best')
  weeklyBest(@Query('limit') limit?: string) {
    return this.svc.weeklyBest(limit ? parseInt(limit, 10) : undefined);
  }

  @Get('posts/:id')
  @UseGuards(OptionalJwtGuard)
  getPost(@Param('id') id: string, @Req() req: any) {
    return this.svc.getPost(id, req.userId);
  }

  @Post('posts')
  @UseGuards(JwtGuard)
  @ApiBearerAuth('jwt')
  createPost(@Req() req: any, @Body() body: CreatePostDto) {
    return this.svc.createPost(req.userId, body);
  }

  @Patch('posts/:id')
  @UseGuards(JwtGuard)
  @ApiBearerAuth('jwt')
  updatePost(@Param('id') id: string, @Req() req: any, @Body() body: UpdatePostDto) {
    return this.svc.updatePost(id, req.userId, body);
  }

  @Delete('posts/:id')
  @UseGuards(JwtGuard)
  @ApiBearerAuth('jwt')
  deletePost(@Param('id') id: string, @Req() req: any) {
    return this.svc.deletePost(id, req.userId);
  }

  @Post('posts/:id/like')
  @UseGuards(JwtGuard)
  @ApiBearerAuth('jwt')
  toggleLike(@Param('id') id: string, @Req() req: any) {
    return this.svc.togglePostLike(id, req.userId);
  }

  @Get('posts/:id/comments')
  @UseGuards(OptionalJwtGuard)
  listComments(@Param('id') id: string, @Req() req: any) {
    return this.svc.listComments(id, req.userId);
  }

  @Post('posts/:id/comments')
  @UseGuards(JwtGuard)
  @ApiBearerAuth('jwt')
  createComment(@Param('id') id: string, @Req() req: any, @Body() body: CreateCommentDto) {
    return this.svc.createComment(id, req.userId, body);
  }

  @Delete('comments/:id')
  @UseGuards(JwtGuard)
  @ApiBearerAuth('jwt')
  deleteComment(@Param('id') id: string, @Req() req: any) {
    return this.svc.deleteComment(id, req.userId);
  }

  @Post('comments/:id/like')
  @UseGuards(JwtGuard)
  @ApiBearerAuth('jwt')
  toggleCommentLike(@Param('id') id: string, @Req() req: any) {
    return this.svc.toggleCommentLike(id, req.userId);
  }
}
