# 커뮤니티 기능 구현 계획

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** ETF Canvas에 게시글/댓글/좋아요/포트폴리오 첨부 기반 커뮤니티 기능 추가

**Architecture:** NestJS API에 CommunityModule 추가 (Controller → Service → Prisma). Next.js 프론트에 community-view 컴포넌트 추가, Zustand currentView에 'community' 추가. 기존 패턴(UserModule, PortfolioModule)을 그대로 따름.

**Tech Stack:** NestJS, Prisma, PostgreSQL, Next.js, React Query, Zustand, shadcn/ui, Tailwind CSS

---

## 파일 구조

### API (apps/api)

| 파일 | 역할 |
|------|------|
| `prisma/schema.prisma` | PostCategory, Post, Comment, PostLike, CommentLike, PostView 모델 추가 |
| `prisma/migrations/20260311100000_add_community/migration.sql` | 마이그레이션 SQL |
| `src/community/community.module.ts` | NestJS 모듈 |
| `src/community/community.controller.ts` | REST 엔드포인트 |
| `src/community/community.service.ts` | 비즈니스 로직 |
| `src/app.module.ts` | CommunityModule import 추가 |

### Web (apps/web)

| 파일 | 역할 |
|------|------|
| `src/components/community-view.tsx` | 메인 커뮤니티 피드 (목록 + 탭 + 주간베스트) |
| `src/components/community-post-detail.tsx` | 글 상세 + 댓글 영역 |
| `src/components/community-write.tsx` | 글 작성/수정 폼 |
| `src/components/community-comment.tsx` | 댓글/대댓글 아이템 |
| `src/lib/api.ts` | 커뮤니티 API 함수 추가 |
| `src/lib/store.ts` | currentView에 'community' 추가 |
| `src/components/icon-sidebar.tsx` | 커뮤니티 버튼 추가 |
| `src/app/page.tsx` | CommunityView 라우팅 추가 |

### Helm

| 파일 | 역할 |
|------|------|
| `apps/api/helm/etf-canvas-api/Chart.yaml` | appVersion bump |
| `apps/web/helm/etf-canvas-web/Chart.yaml` | appVersion bump |

---

## Chunk 1: 데이터베이스 스키마 & API

### Task 1: Prisma 스키마 추가

**Files:**
- Modify: `apps/api/prisma/schema.prisma`

- [ ] **Step 1: User 모델에 relation 추가**

```prisma
// User 모델 하단에 추가
posts       Post[]
comments    Comment[]
```

- [ ] **Step 2: PostCategory 모델 추가**

```prisma
model PostCategory {
  id        Int      @id @default(autoincrement())
  slug      String   @unique @db.VarChar(50)
  name      String   @db.VarChar(50)
  sortOrder Int      @default(0) @map("sort_order")

  posts Post[]

  @@map("post_category")
}
```

- [ ] **Step 3: Post 모델 추가**

```prisma
model Post {
  id           String       @id @default(uuid()) @db.Uuid
  authorId     String       @map("author_id")
  categoryId   Int          @map("category_id")
  title        String       @db.VarChar(200)
  content      String       @db.VarChar(5000)
  portfolioId  String?      @map("portfolio_id") @db.Uuid
  likeCount    Int          @default(0) @map("like_count")
  commentCount Int          @default(0) @map("comment_count")
  viewCount    Int          @default(0) @map("view_count")
  isHidden     Boolean      @default(false) @map("is_hidden")
  createdAt    DateTime     @default(now()) @map("created_at")
  updatedAt    DateTime     @updatedAt @map("updated_at")

  author    User         @relation(fields: [authorId], references: [keycloakId])
  category  PostCategory @relation(fields: [categoryId], references: [id])
  comments  Comment[]
  likes     PostLike[]
  views     PostView[]

  @@index([categoryId, createdAt(sort: Desc)])
  @@index([createdAt(sort: Desc)])
  @@index([likeCount(sort: Desc)])
  @@index([authorId])
  @@map("post")
}
```

- [ ] **Step 4: Comment 모델 추가**

```prisma
model Comment {
  id         String    @id @default(uuid()) @db.Uuid
  postId     String    @map("post_id") @db.Uuid
  authorId   String    @map("author_id")
  parentId   String?   @map("parent_id") @db.Uuid
  content    String    @db.VarChar(1000)
  likeCount  Int       @default(0) @map("like_count")
  replyCount Int       @default(0) @map("reply_count")
  isDeleted  Boolean   @default(false) @map("is_deleted")
  createdAt  DateTime  @default(now()) @map("created_at")

  post    Post          @relation(fields: [postId], references: [id], onDelete: Cascade)
  author  User          @relation(fields: [authorId], references: [keycloakId])
  parent  Comment?      @relation("CommentReplies", fields: [parentId], references: [id])
  replies Comment[]     @relation("CommentReplies")
  likes   CommentLike[]

  @@index([postId, createdAt])
  @@index([parentId])
  @@index([authorId])
  @@map("comment")
}
```

- [ ] **Step 5: PostLike, CommentLike, PostView 모델 추가**

```prisma
model PostLike {
  id        Int      @id @default(autoincrement())
  postId    String   @map("post_id") @db.Uuid
  userId    String   @map("user_id")
  createdAt DateTime @default(now()) @map("created_at")

  post Post @relation(fields: [postId], references: [id], onDelete: Cascade)

  @@unique([postId, userId])
  @@map("post_like")
}

model CommentLike {
  id        Int      @id @default(autoincrement())
  commentId String   @map("comment_id") @db.Uuid
  userId    String   @map("user_id")
  createdAt DateTime @default(now()) @map("created_at")

  comment Comment @relation(fields: [commentId], references: [id], onDelete: Cascade)

  @@unique([commentId, userId])
  @@map("comment_like")
}

model PostView {
  id        Int      @id @default(autoincrement())
  postId    String   @map("post_id") @db.Uuid
  userId    String   @map("user_id")
  createdAt DateTime @default(now()) @map("created_at")

  @@unique([postId, userId])
  @@map("post_view")
}
```

- [ ] **Step 6: 마이그레이션 SQL 생성**

Run: `cd apps/api && npx prisma migrate dev --name add_community --create-only`

SQL 파일이 자동 생성되지 않으면 수동 작성:
- Create: `apps/api/prisma/migrations/20260311100000_add_community/migration.sql`

SQL 내용은 위 스키마 기반으로 작성. 카테고리 초기 데이터 INSERT 포함:

```sql
INSERT INTO post_category (slug, name, sort_order) VALUES
  ('general', '일반', 0),
  ('portfolio-review', '포트폴리오 리뷰', 1);
```

- [ ] **Step 7: 마이그레이션 적용**

Run: `cd apps/api && npx prisma migrate deploy`

- [ ] **Step 8: Prisma client 재생성**

Run: `cd apps/api && npx prisma generate`

---

### Task 2: CommunityService 구현

**Files:**
- Create: `apps/api/src/community/community.service.ts`

- [ ] **Step 1: 서비스 뼈대 + 카테고리 조회**

```typescript
import { Injectable, NotFoundException, ForbiddenException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class CommunityService {
  constructor(private readonly prisma: PrismaService) {}

  async getCategories() {
    return this.prisma.postCategory.findMany({ orderBy: { sortOrder: 'asc' } });
  }
}
```

- [ ] **Step 2: 게시글 목록 (최신순/인기순 + 카테고리 필터 + 커서 페이지네이션)**

```typescript
async listPosts(params: {
  cursor?: string;
  limit?: number;
  sort?: 'latest' | 'popular';
  categoryId?: number;
}) {
  const { cursor, limit = 20, sort = 'latest', categoryId } = params;
  const where: any = { isHidden: false };
  if (categoryId) where.categoryId = categoryId;

  const orderBy = sort === 'popular'
    ? [{ likeCount: 'desc' as const }, { createdAt: 'desc' as const }]
    : [{ createdAt: 'desc' as const }];

  const posts = await this.prisma.post.findMany({
    where,
    orderBy,
    take: limit + 1,
    ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
    include: {
      author: { select: { nickname: true, investExp: true, investStyle: true, showInvestExp: true, showInvestStyle: true } },
      category: { select: { slug: true, name: true } },
    },
  });

  const hasMore = posts.length > limit;
  if (hasMore) posts.pop();

  return {
    posts: posts.map(p => ({
      ...p,
      contentPreview: p.content.slice(0, 150),
      content: undefined, // 목록에서 본문 제외
    })),
    nextCursor: hasMore ? posts[posts.length - 1].id : null,
  };
}
```

- [ ] **Step 3: 주간 베스트**

```typescript
async weeklyBest(limit = 5) {
  const weekAgo = new Date();
  weekAgo.setDate(weekAgo.getDate() - 7);

  return this.prisma.post.findMany({
    where: { isHidden: false, createdAt: { gte: weekAgo } },
    orderBy: { likeCount: 'desc' },
    take: limit,
    include: {
      author: { select: { nickname: true } },
      category: { select: { slug: true, name: true } },
    },
  });
}
```

- [ ] **Step 4: 게시글 상세 + 조회수**

```typescript
async getPost(id: string, userId?: string) {
  const post = await this.prisma.post.findUnique({
    where: { id },
    include: {
      author: { select: { keycloakId: true, nickname: true, investExp: true, investStyle: true, showInvestExp: true, showInvestStyle: true } },
      category: { select: { slug: true, name: true } },
    },
  });
  if (!post || post.isHidden) throw new NotFoundException();

  // 조회수 (유저별 1회)
  if (userId) {
    await this.prisma.postView.upsert({
      where: { postId_userId: { postId: id, userId } },
      create: { postId: id, userId },
      update: {},
    }).catch(() => {}); // ignore duplicate
    await this.prisma.post.update({ where: { id }, data: { viewCount: { increment: 1 } } }).catch(() => {});
  }

  // 좋아요 여부
  let liked = false;
  if (userId) {
    liked = !!(await this.prisma.postLike.findUnique({
      where: { postId_userId: { postId: id, userId } },
    }));
  }

  return { ...post, liked };
}
```

주의: 조회수는 upsert로 중복 방지하되, viewCount는 단순 increment로 처리 (정확한 unique count는 PostView 테이블에서 COUNT로 별도 조회 가능).

- [ ] **Step 5: 게시글 작성**

```typescript
async createPost(userId: string, data: {
  title: string;
  content: string;
  portfolioId?: string;
}) {
  if (!data.title?.trim() || !data.content?.trim()) throw new BadRequestException();

  // 닉네임 체크
  const user = await this.prisma.user.findUnique({ where: { keycloakId: userId } });
  if (!user?.nickname) throw new BadRequestException('닉네임을 먼저 설정해주세요');

  // 포트폴리오 첨부 시 카테고리 자동 결정
  let categoryId = 1; // general
  if (data.portfolioId) {
    const portfolio = await this.prisma.portfolio.findFirst({
      where: { id: data.portfolioId, userId },
    });
    if (!portfolio) throw new BadRequestException('포트폴리오를 찾을 수 없습니다');
    categoryId = 2; // portfolio-review
  }

  return this.prisma.post.create({
    data: {
      authorId: userId,
      categoryId,
      title: data.title.trim(),
      content: data.content.trim(),
      portfolioId: data.portfolioId || null,
    },
    include: {
      author: { select: { nickname: true } },
      category: { select: { slug: true, name: true } },
    },
  });
}
```

- [ ] **Step 6: 게시글 수정/삭제**

```typescript
async updatePost(id: string, userId: string, data: { title?: string; content?: string }) {
  const post = await this.prisma.post.findUnique({ where: { id } });
  if (!post) throw new NotFoundException();
  if (post.authorId !== userId) throw new ForbiddenException();

  return this.prisma.post.update({
    where: { id },
    data: {
      ...(data.title ? { title: data.title.trim() } : {}),
      ...(data.content ? { content: data.content.trim() } : {}),
    },
  });
}

async deletePost(id: string, userId: string) {
  const post = await this.prisma.post.findUnique({ where: { id } });
  if (!post) throw new NotFoundException();
  if (post.authorId !== userId) throw new ForbiddenException();

  await this.prisma.post.delete({ where: { id } });
  return { ok: true };
}
```

- [ ] **Step 7: 좋아요 토글**

```typescript
async togglePostLike(postId: string, userId: string) {
  const existing = await this.prisma.postLike.findUnique({
    where: { postId_userId: { postId, userId } },
  });

  if (existing) {
    await this.prisma.$transaction([
      this.prisma.postLike.delete({ where: { id: existing.id } }),
      this.prisma.post.update({ where: { id: postId }, data: { likeCount: { decrement: 1 } } }),
    ]);
    return { liked: false };
  } else {
    await this.prisma.$transaction([
      this.prisma.postLike.create({ data: { postId, userId } }),
      this.prisma.post.update({ where: { id: postId }, data: { likeCount: { increment: 1 } } }),
    ]);
    return { liked: true };
  }
}
```

- [ ] **Step 8: 댓글 목록**

```typescript
async listComments(postId: string, userId?: string) {
  const comments = await this.prisma.comment.findMany({
    where: { postId, parentId: null },
    orderBy: { createdAt: 'asc' },
    include: {
      author: { select: { keycloakId: true, nickname: true, investExp: true, investStyle: true, showInvestExp: true, showInvestStyle: true } },
      replies: {
        where: { isDeleted: false },
        orderBy: { createdAt: 'asc' },
        include: {
          author: { select: { keycloakId: true, nickname: true, investExp: true, investStyle: true, showInvestExp: true, showInvestStyle: true } },
        },
      },
    },
  });

  // 삭제된 댓글: 답글이 있으면 "삭제된 댓글입니다"로 표시, 없으면 제외
  const result = comments
    .filter(c => !c.isDeleted || c.replies.length > 0)
    .map(c => ({
      ...c,
      content: c.isDeleted ? '삭제된 댓글입니다' : c.content,
    }));

  // 좋아요 여부 (한번에 조회)
  if (userId) {
    const allIds = result.flatMap(c => [c.id, ...c.replies.map(r => r.id)]);
    const liked = await this.prisma.commentLike.findMany({
      where: { commentId: { in: allIds }, userId },
      select: { commentId: true },
    });
    const likedSet = new Set(liked.map(l => l.commentId));
    return result.map(c => ({
      ...c,
      liked: likedSet.has(c.id),
      replies: c.replies.map(r => ({ ...r, liked: likedSet.has(r.id) })),
    }));
  }

  return result.map(c => ({ ...c, liked: false, replies: c.replies.map(r => ({ ...r, liked: false })) }));
}
```

- [ ] **Step 9: 댓글 작성/삭제 + 댓글 좋아요**

```typescript
async createComment(postId: string, userId: string, data: { content: string; parentId?: string }) {
  if (!data.content?.trim()) throw new BadRequestException();

  const user = await this.prisma.user.findUnique({ where: { keycloakId: userId } });
  if (!user?.nickname) throw new BadRequestException('닉네임을 먼저 설정해주세요');

  const post = await this.prisma.post.findUnique({ where: { id: postId } });
  if (!post) throw new NotFoundException();

  // 대댓글인 경우 부모 댓글 확인
  if (data.parentId) {
    const parent = await this.prisma.comment.findUnique({ where: { id: data.parentId } });
    if (!parent || parent.postId !== postId || parent.parentId !== null) {
      throw new BadRequestException('잘못된 부모 댓글입니다');
    }
  }

  const [comment] = await this.prisma.$transaction([
    this.prisma.comment.create({
      data: {
        postId,
        authorId: userId,
        parentId: data.parentId || null,
        content: data.content.trim(),
      },
      include: {
        author: { select: { keycloakId: true, nickname: true } },
      },
    }),
    this.prisma.post.update({ where: { id: postId }, data: { commentCount: { increment: 1 } } }),
    ...(data.parentId
      ? [this.prisma.comment.update({ where: { id: data.parentId }, data: { replyCount: { increment: 1 } } })]
      : []),
  ]);

  return comment;
}

async deleteComment(commentId: string, userId: string) {
  const comment = await this.prisma.comment.findUnique({ where: { id: commentId } });
  if (!comment) throw new NotFoundException();
  if (comment.authorId !== userId) throw new ForbiddenException();

  // soft delete
  await this.prisma.$transaction([
    this.prisma.comment.update({ where: { id: commentId }, data: { isDeleted: true } }),
    this.prisma.post.update({ where: { id: comment.postId }, data: { commentCount: { decrement: 1 } } }),
    ...(comment.parentId
      ? [this.prisma.comment.update({ where: { id: comment.parentId }, data: { replyCount: { decrement: 1 } } })]
      : []),
  ]);
  return { ok: true };
}

async toggleCommentLike(commentId: string, userId: string) {
  const existing = await this.prisma.commentLike.findUnique({
    where: { commentId_userId: { commentId, userId } },
  });

  if (existing) {
    await this.prisma.$transaction([
      this.prisma.commentLike.delete({ where: { id: existing.id } }),
      this.prisma.comment.update({ where: { id: commentId }, data: { likeCount: { decrement: 1 } } }),
    ]);
    return { liked: false };
  } else {
    await this.prisma.$transaction([
      this.prisma.commentLike.create({ data: { commentId, userId } }),
      this.prisma.comment.update({ where: { id: commentId }, data: { likeCount: { increment: 1 } } }),
    ]);
    return { liked: true };
  }
}
```

- [ ] **Step 10: Commit**

```bash
git add apps/api/prisma/ apps/api/src/community/community.service.ts
git commit -m "feat(api): add community service with posts, comments, likes"
```

---

### Task 3: CommunityController + Module

**Files:**
- Create: `apps/api/src/community/community.controller.ts`
- Create: `apps/api/src/community/community.module.ts`
- Modify: `apps/api/src/app.module.ts`

- [ ] **Step 1: Controller 구현**

```typescript
import { Controller, Get, Post, Patch, Delete, Body, Param, Query, Req, UseGuards } from '@nestjs/common';
import { ApiBearerAuth } from '@nestjs/swagger';
import { CommunityService } from './community.service';
import { JwtGuard } from '../auth/jwt.guard';

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
  getPost(@Param('id') id: string, @Req() req: any) {
    // userId는 optional (비로그인도 조회 가능)
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
```

주의: `GET /posts/:id`, `GET /posts/:id/comments`는 비로그인도 접근 가능해야 함. JwtGuard를 메서드 레벨로만 적용. 비로그인 시 `req.userId`가 undefined인데, 이를 위해 Optional JWT 처리가 필요:

`getPost`와 `listComments`에 Optional JWT 적용을 위해 별도 guard 또는 미들웨어로 토큰이 있으면 파싱하되 없으면 통과시키는 로직 필요. 가장 간단한 방법:

```typescript
// community.controller.ts 상단에 OptionalJwtGuard 인라인
import { CanActivate, ExecutionContext } from '@nestjs/common';
import { createRemoteJWKSet, jwtVerify } from 'jose';

const KEYCLOAK_ISSUER = process.env.KEYCLOAK_ISSUER!;
const JWKS = createRemoteJWKSet(new URL(`${KEYCLOAK_ISSUER}/protocol/openid-connect/certs`));

class OptionalJwtGuard implements CanActivate {
  async canActivate(context: ExecutionContext): Promise<boolean> {
    const req = context.switchToHttp().getRequest();
    const auth: string | undefined = req.headers?.authorization;
    if (!auth?.startsWith('Bearer ')) return true; // 토큰 없으면 통과
    try {
      const { payload } = await jwtVerify(auth.slice(7), JWKS, { issuer: KEYCLOAK_ISSUER });
      req.userId = payload.sub;
    } catch { /* 토큰 무효해도 통과 */ }
    return true;
  }
}
```

`getPost`, `listComments`에 `@UseGuards(OptionalJwtGuard)` 적용.

- [ ] **Step 2: Module 구현**

```typescript
import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { CommunityController } from './community.controller';
import { CommunityService } from './community.service';

@Module({
  imports: [PrismaModule],
  controllers: [CommunityController],
  providers: [CommunityService],
})
export class CommunityModule {}
```

- [ ] **Step 3: AppModule에 import 추가**

`apps/api/src/app.module.ts`의 imports 배열에 `CommunityModule` 추가.

```typescript
import { CommunityModule } from './community/community.module';
// ...
imports: [
  PrismaModule,
  RedisModule,
  NaverModule,
  EtfModule,
  PortfolioModule,
  UserModule,
  CommunityModule,
],
```

- [ ] **Step 4: API 빌드 확인**

Run: `pnpm turbo build --filter=@etf-canvas/api`

- [ ] **Step 5: Commit**

```bash
git add apps/api/src/community/ apps/api/src/app.module.ts
git commit -m "feat(api): add community controller and module"
```

---

## Chunk 2: 프론트엔드

### Task 4: Store + API 클라이언트 + 사이드바

**Files:**
- Modify: `apps/web/src/lib/store.ts`
- Modify: `apps/web/src/lib/api.ts`
- Modify: `apps/web/src/components/icon-sidebar.tsx`
- Modify: `apps/web/src/app/page.tsx`

- [ ] **Step 1: Zustand store에 'community' view 추가**

`store.ts`에서 `currentView` 타입에 `'community'` 추가 (3곳: interface, 초기값 주석, setCurrentView 파라미터).

```typescript
currentView: 'canvas' | 'portfolio' | 'gallery' | 'settings' | 'mypage' | 'community';
setCurrentView: (view: 'canvas' | 'portfolio' | 'gallery' | 'settings' | 'mypage' | 'community') => void;
```

- [ ] **Step 2: api.ts에 커뮤니티 함수 추가**

```typescript
// Community
communityCategories: () =>
  fetcher<{ id: number; slug: string; name: string }[]>('/community/categories'),

communityPosts: (params: { cursor?: string; limit?: number; sort?: 'latest' | 'popular'; categoryId?: number }) => {
  const sp = new URLSearchParams();
  if (params.cursor) sp.set('cursor', params.cursor);
  if (params.limit) sp.set('limit', String(params.limit));
  if (params.sort) sp.set('sort', params.sort);
  if (params.categoryId) sp.set('categoryId', String(params.categoryId));
  return fetcher<{
    posts: CommunityPost[];
    nextCursor: string | null;
  }>(`/community/posts?${sp}`);
},

communityWeeklyBest: (limit = 5) =>
  fetcher<CommunityPost[]>(`/community/posts/weekly-best?limit=${limit}`),

communityPost: (id: string) =>
  fetcher<CommunityPostDetail>(`/community/posts/${id}`),

communityCreatePost: (data: { title: string; content: string; portfolioId?: string }) =>
  fetcher<CommunityPostDetail>('/community/posts', { method: 'POST', body: JSON.stringify(data) }),

communityUpdatePost: (id: string, data: { title?: string; content?: string }) =>
  fetcher<CommunityPostDetail>(`/community/posts/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),

communityDeletePost: (id: string) =>
  fetcher<{ ok: boolean }>(`/community/posts/${id}`, { method: 'DELETE' }),

communityToggleLike: (id: string) =>
  fetcher<{ liked: boolean }>(`/community/posts/${id}/like`, { method: 'POST' }),

communityComments: (postId: string) =>
  fetcher<CommunityComment[]>(`/community/posts/${postId}/comments`),

communityCreateComment: (postId: string, data: { content: string; parentId?: string }) =>
  fetcher<CommunityComment>(`/community/posts/${postId}/comments`, { method: 'POST', body: JSON.stringify(data) }),

communityDeleteComment: (id: string) =>
  fetcher<{ ok: boolean }>(`/community/comments/${id}`, { method: 'DELETE' }),

communityToggleCommentLike: (id: string) =>
  fetcher<{ liked: boolean }>(`/community/comments/${id}/like`, { method: 'POST' }),
```

타입 정의 (api.ts 상단 또는 인라인):

```typescript
interface CommunityPost {
  id: string;
  title: string;
  contentPreview: string;
  portfolioId: string | null;
  likeCount: number;
  commentCount: number;
  viewCount: number;
  createdAt: string;
  author: { nickname: string; investExp?: string; investStyle?: string; showInvestExp?: boolean; showInvestStyle?: boolean };
  category: { slug: string; name: string };
}

interface CommunityPostDetail extends Omit<CommunityPost, 'contentPreview'> {
  content: string;
  liked: boolean;
  author: CommunityPost['author'] & { keycloakId: string };
}

interface CommunityComment {
  id: string;
  postId: string;
  authorId: string;
  parentId: string | null;
  content: string;
  likeCount: number;
  replyCount: number;
  isDeleted: boolean;
  liked: boolean;
  createdAt: string;
  author: { keycloakId: string; nickname: string; investExp?: string; investStyle?: string; showInvestExp?: boolean; showInvestStyle?: boolean };
  replies?: CommunityComment[];
}
```

- [ ] **Step 3: 사이드바에 커뮤니티 버튼 추가**

`icon-sidebar.tsx`에서 Trophy(TOP) 버튼과 Settings 버튼 사이에 커뮤니티 버튼 추가:

```tsx
import { MessageSquare } from 'lucide-react';
// ...
// Trophy 버튼 아래에:
<button
  onClick={() => navigate('community')}
  className={`w-9 h-9 rounded-lg flex items-center justify-center transition-colors ${currentView === 'community' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:bg-accent hover:text-foreground'}`}
  title="커뮤니티"
>
  <MessageSquare className="w-[18px] h-[18px]" />
</button>
```

navigate 함수 타입에도 `'community'` 추가.

- [ ] **Step 4: page.tsx에 CommunityView 라우팅 추가**

```tsx
import { CommunityView } from '@/components/community-view';
// ...
// currentView 분기에 추가:
{currentView === 'community' ? (
  <CommunityView />
) : currentView === 'mypage' ? (
```

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/lib/ apps/web/src/components/icon-sidebar.tsx apps/web/src/app/page.tsx
git commit -m "feat(web): add community routing, api client, sidebar button"
```

---

### Task 5: CommunityView (메인 피드)

**Files:**
- Create: `apps/web/src/components/community-view.tsx`

- [ ] **Step 1: 피드 뼈대 (탭 + 카테고리 필터 + 무한스크롤)**

주요 구성:
- 상단: "커뮤니티" 제목 + 글쓰기 버튼
- 탭: 최신순 | 인기순
- 카테고리 필터: 전체 | 일반 | 포트폴리오 리뷰
- 주간 베스트 캐러셀 (최신순 탭에서만 표시)
- 게시글 카드 목록 (무한스크롤)

```tsx
'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useInfiniteQuery, useQuery } from '@tanstack/react-query';
import { Pencil, Heart, MessageCircle, Eye, Trophy, ChevronLeft } from 'lucide-react';
import { api } from '@/lib/api';
import { CommunityPostDetail } from '@/components/community-post-detail';
import { CommunityWrite } from '@/components/community-write';
```

State:
- `tab`: 'latest' | 'popular'
- `categoryId`: number | undefined (undefined = 전체)
- `selectedPostId`: string | null (선택 시 상세 표시)
- `showWrite`: boolean (글쓰기 모드)

useInfiniteQuery로 `communityPosts` 호출, `getNextPageParam`에서 `nextCursor` 사용.

무한스크롤: IntersectionObserver로 마지막 카드 감지 → fetchNextPage.

게시글 카드 내용:
- 카테고리 뱃지
- 제목
- contentPreview (1줄)
- 작성자 닉네임 + 공개 뱃지 (투자경험, 투자성향)
- 좋아요 수, 댓글 수, 조회수
- 작성 시간 (상대 시간: "3시간 전", "2일 전")

주간 베스트: 수평 스크롤 카드 리스트, 순위 번호 표시.

닉네임 게이트: 글쓰기 버튼 클릭 시 닉네임 체크 → 미설정이면 모달 표시 → 확인 시 `setCurrentView('mypage')`.

`selectedPostId`가 set되면 `<CommunityPostDetail>` 렌더링, 아니면 피드 렌더링.

- [ ] **Step 2: Commit**

```bash
git add apps/web/src/components/community-view.tsx
git commit -m "feat(web): add community feed view with tabs, filters, infinite scroll"
```

---

### Task 6: CommunityPostDetail (글 상세 + 댓글)

**Files:**
- Create: `apps/web/src/components/community-post-detail.tsx`
- Create: `apps/web/src/components/community-comment.tsx`

- [ ] **Step 1: 글 상세 컴포넌트**

Props: `{ postId: string; onBack: () => void }`

구성:
- 뒤로가기 버튼 (← 목록으로)
- 카테고리 뱃지 + 작성 시간
- 제목
- 작성자 닉네임 + 프로필 뱃지
- 본문 (줄바꿈 유지: `whitespace-pre-wrap`)
- 포트폴리오 첨부 카드 (portfolioId가 있으면 `api.getPublicPortfolio` 또는 링크)
- 좋아요 버튼 (토글) + 좋아요 수
- 수정/삭제 버튼 (작성자만)
- 댓글 영역

포트폴리오 카드:
- portfolioId로 portfolio 정보를 별도 쿼리 (slug 기반으로 `/portfolio/${slug}` 링크)
- 종목 구성 상위 3개 + 수익률 표시

좋아요: `useMutation` + optimistic update (likeCount ±1, liked 토글).

수정 모드: `showEdit` state → CommunityWrite를 edit 모드로 렌더링.

- [ ] **Step 2: 댓글 컴포넌트**

`community-comment.tsx` — 재귀적 댓글 아이템

Props: `{ comment: CommunityComment; postAuthorId: string; postId: string; depth?: number }`

구성:
- 닉네임 + "글쓴이" 뱃지 (comment.author.keycloakId === postAuthorId)
- 공개 뱃지 (투자경험, 투자성향)
- 댓글 내용 (삭제됐으면 "삭제된 댓글입니다" 회색)
- 좋아요 버튼 + 좋아요 수
- 답글 버튼 (depth === 0일 때만, 대대댓글 방지)
- 삭제 버튼 (작성자만)
- 답글 작성 인풋 (showReply state)
- 답글 목록 (replies 재귀 렌더링, depth + 1, 들여쓰기)

닉네임 게이트: 댓글/답글 작성 시도 시 닉네임 체크 → 미설정이면 모달.

- [ ] **Step 3: Commit**

```bash
git add apps/web/src/components/community-post-detail.tsx apps/web/src/components/community-comment.tsx
git commit -m "feat(web): add post detail view with comments and replies"
```

---

### Task 7: CommunityWrite (글 작성/수정)

**Files:**
- Create: `apps/web/src/components/community-write.tsx`

- [ ] **Step 1: 글 작성/수정 폼**

Props: `{ onClose: () => void; editPost?: CommunityPostDetail }`

구성:
- 제목 input (maxLength 200)
- 본문 textarea (maxLength 5000, 높이 자동 조절)
- 포트폴리오 첨부 선택 (내 포트폴리오 목록 드롭다운)
  - `api.listPortfolios()`로 목록 가져오기
  - 선택 시 미리보기 카드 표시
  - 수정 모드에서는 포트폴리오 변경 불가 (카테고리 변경 방지)
- 작성/수정 버튼
- useMutation으로 `communityCreatePost` / `communityUpdatePost`

성공 시: queryClient.invalidateQueries로 목록 갱신 → onClose.

- [ ] **Step 2: Commit**

```bash
git add apps/web/src/components/community-write.tsx
git commit -m "feat(web): add community write/edit form with portfolio attachment"
```

---

### Task 8: 빌드 확인 + 버전 bump

**Files:**
- Modify: `apps/api/helm/etf-canvas-api/Chart.yaml` — appVersion bump
- Modify: `apps/web/helm/etf-canvas-web/Chart.yaml` — appVersion bump

- [ ] **Step 1: API 빌드**

Run: `pnpm turbo build --filter=@etf-canvas/api`

- [ ] **Step 2: Web 빌드**

Run: `pnpm turbo build --filter=web`

- [ ] **Step 3: 빌드 에러 수정 (있으면)**

타입 에러나 import 누락 수정.

- [ ] **Step 4: appVersion bump**

API Chart.yaml: 현재 버전 확인 후 +1
Web Chart.yaml: 현재 버전 확인 후 +1

- [ ] **Step 5: 최종 Commit**

```bash
git add -A
git commit -m "feat: 커뮤니티 기능 (게시글/댓글/좋아요/포트폴리오 첨부) — API x.x.x, Web x.x.x"
```

---

## 주의사항

### DB 마이그레이션
- `prisma migrate dev` 사용 금지 (shadow DB 에러)
- `prisma migrate dev --create-only`로 SQL만 생성 → `prisma migrate deploy`로 적용
- kubefwd 연결 필수, `?sslmode=disable` 확인

### 배포
- 코드 변경 시 반드시 appVersion bump를 같은 커밋에 포함
- push 전 로컬 빌드 필수

### 기존 패턴 준수
- NestJS: Module/Controller/Service 패턴 (UserModule, PortfolioModule 참고)
- 프론트: React Query + Zustand + api.ts fetcher 패턴
- JwtGuard: `req.userId = payload.sub` (keycloakId)
- 프론트 뷰 라우팅: `currentView` state → page.tsx 분기
