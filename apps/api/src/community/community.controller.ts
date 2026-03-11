import { Controller, Get, Post, Patch, Delete, Body, Param, Query, Req, UseGuards, CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { ApiBearerAuth } from '@nestjs/swagger';
import { createRemoteJWKSet, jwtVerify } from 'jose';
import { CommunityService } from './community.service';
import { JwtGuard } from '../auth/jwt.guard';

const KEYCLOAK_ISSUER = process.env.KEYCLOAK_ISSUER!;
const JWKS = createRemoteJWKSet(new URL(`${KEYCLOAK_ISSUER}/protocol/openid-connect/certs`));

@Injectable()
class OptionalJwtGuard implements CanActivate {
  async canActivate(context: ExecutionContext): Promise<boolean> {
    const req = context.switchToHttp().getRequest();
    const auth: string | undefined = req.headers?.authorization;
    if (!auth?.startsWith('Bearer ')) return true;
    try {
      const { payload } = await jwtVerify(auth.slice(7), JWKS, { issuer: KEYCLOAK_ISSUER });
      req.userId = payload.sub;
    } catch {}
    return true;
  }
}

@Controller('community')
export class CommunityController {
  constructor(private readonly svc: CommunityService) {}

  @Get('categories')
  getCategories() {
    return this.svc.getCategories();
  }

  @Get('posts')
  listPosts(
    @Query('cursor') cursor?: string,
    @Query('limit') limit?: string,
    @Query('sort') sort?: 'latest' | 'popular',
    @Query('categoryId') categoryId?: string,
  ) {
    return this.svc.listPosts({
      cursor,
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
  createPost(@Req() req: any, @Body() body: { title: string; content: string; portfolioId?: string }) {
    return this.svc.createPost(req.userId, body);
  }

  @Patch('posts/:id')
  @UseGuards(JwtGuard)
  @ApiBearerAuth('jwt')
  updatePost(@Param('id') id: string, @Req() req: any, @Body() body: { title?: string; content?: string }) {
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
  createComment(@Param('id') id: string, @Req() req: any, @Body() body: { content: string; parentId?: string }) {
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
