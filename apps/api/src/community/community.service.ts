import { Injectable, NotFoundException, ForbiddenException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

const AUTHOR_SELECT = {
  keycloakId: true,
  nickname: true,
  investExp: true,
  investStyle: true,
  showInvestExp: true,
  showInvestStyle: true,
} as const;

@Injectable()
export class CommunityService {
  constructor(private readonly prisma: PrismaService) {}

  getCategories() {
    return this.prisma.postCategory.findMany({ orderBy: { sortOrder: 'asc' } });
  }

  async listPosts(params: {
    page?: number;
    limit?: number;
    sort?: 'latest' | 'popular';
    categoryId?: number;
  }) {
    const { page = 1, limit = 20, sort = 'latest', categoryId } = params;
    const where: any = { isHidden: false };
    if (categoryId) where.categoryId = categoryId;

    const orderBy =
      sort === 'popular'
        ? [{ likeCount: 'desc' as const }, { createdAt: 'desc' as const }]
        : [{ createdAt: 'desc' as const }];

    const [posts, total] = await Promise.all([
      this.prisma.post.findMany({
        where,
        orderBy,
        take: limit,
        skip: (page - 1) * limit,
        include: {
          author: { select: AUTHOR_SELECT },
          category: { select: { slug: true, name: true } },
        },
      }),
      this.prisma.post.count({ where }),
    ]);

    return {
      posts: posts.map((p) => ({
        id: p.id,
        title: p.title,
        contentPreview: p.content.slice(0, 150),
        portfolioId: p.portfolioId,
        likeCount: p.likeCount,
        commentCount: p.commentCount,
        viewCount: p.viewCount,
        createdAt: p.createdAt,
        author: p.author,
        category: p.category,
      })),
      total,
      page,
      totalPages: Math.ceil(total / limit),
    };
  }

  async weeklyBest(limit = 5) {
    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 7);

    return this.prisma.post.findMany({
      where: { isHidden: false, createdAt: { gte: weekAgo }, likeCount: { gte: 1 } },
      orderBy: { likeCount: 'desc' },
      take: limit,
      include: {
        author: { select: { nickname: true } },
        category: { select: { slug: true, name: true } },
      },
    });
  }

  async getPost(id: string, userId?: string) {
    const post = await this.prisma.post.findUnique({
      where: { id },
      include: {
        author: { select: AUTHOR_SELECT },
        category: { select: { slug: true, name: true } },
        portfolio: { select: { name: true, slug: true, items: true, returnRate: true, tags: true } },
      },
    });
    if (!post || post.isHidden) throw new NotFoundException();

    if (userId) {
      const existingView = await this.prisma.postView.findUnique({
        where: { postId_userId: { postId: id, userId } },
      });
      if (!existingView) {
        await this.prisma.$transaction([
          this.prisma.postView.create({ data: { postId: id, userId } }),
          this.prisma.post.update({ where: { id }, data: { viewCount: { increment: 1 } } }),
        ]).catch(() => {});
      }
    }

    let liked = false;
    if (userId) {
      liked = !!(await this.prisma.postLike.findUnique({
        where: { postId_userId: { postId: id, userId } },
      }));
    }

    return { ...post, liked };
  }

  async createPost(userId: string, data: { title: string; content: string; portfolioId?: string }) {
    if (!data.title?.trim() || !data.content?.trim()) throw new BadRequestException();

    const user = await this.prisma.user.findUnique({ where: { keycloakId: userId } });
    if (!user?.nickname) throw new BadRequestException('닉네임을 먼저 설정해주세요');

    let category;
    if (data.portfolioId) {
      const portfolio = await this.prisma.portfolio.findFirst({
        where: { id: data.portfolioId, userId },
      });
      if (!portfolio) throw new BadRequestException('포트폴리오를 찾을 수 없습니다');
      category = await this.prisma.postCategory.findFirst({ where: { slug: 'portfolio-review' } });
    } else {
      category = await this.prisma.postCategory.findFirst({ where: { slug: 'general' } });
    }
    if (!category) throw new BadRequestException('카테고리를 찾을 수 없습니다');
    const categoryId = category.id;

    return this.prisma.post.create({
      data: {
        authorId: userId,
        categoryId,
        title: data.title.trim(),
        content: data.content.trim(),
        portfolioId: data.portfolioId || null,
      },
      include: {
        author: { select: AUTHOR_SELECT },
        category: { select: { slug: true, name: true } },
      },
    });
  }

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
    }

    await this.prisma.$transaction([
      this.prisma.postLike.create({ data: { postId, userId } }),
      this.prisma.post.update({ where: { id: postId }, data: { likeCount: { increment: 1 } } }),
    ]);
    return { liked: true };
  }

  async listComments(postId: string, userId?: string) {
    const comments = await this.prisma.comment.findMany({
      where: { postId, parentId: null },
      orderBy: { createdAt: 'asc' },
      include: {
        author: { select: AUTHOR_SELECT },
        replies: {
          where: { isDeleted: false },
          orderBy: { createdAt: 'asc' },
          include: { author: { select: AUTHOR_SELECT } },
        },
      },
    });

    const result = comments
      .filter((c) => !c.isDeleted || c.replies.length > 0)
      .map((c) => ({
        ...c,
        content: c.isDeleted ? '삭제된 댓글입니다' : c.content,
      }));

    if (userId) {
      const allIds = result.flatMap((c) => [c.id, ...c.replies.map((r) => r.id)]);
      const liked = await this.prisma.commentLike.findMany({
        where: { commentId: { in: allIds }, userId },
        select: { commentId: true },
      });
      const likedSet = new Set(liked.map((l) => l.commentId));
      return result.map((c) => ({
        ...c,
        liked: likedSet.has(c.id),
        replies: c.replies.map((r) => ({ ...r, liked: likedSet.has(r.id) })),
      }));
    }

    return result.map((c) => ({
      ...c,
      liked: false,
      replies: c.replies.map((r) => ({ ...r, liked: false })),
    }));
  }

  async createComment(postId: string, userId: string, data: { content: string; parentId?: string }) {
    if (!data.content?.trim()) throw new BadRequestException();

    const user = await this.prisma.user.findUnique({ where: { keycloakId: userId } });
    if (!user?.nickname) throw new BadRequestException('닉네임을 먼저 설정해주세요');

    const post = await this.prisma.post.findUnique({ where: { id: postId } });
    if (!post) throw new NotFoundException();

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
        include: { author: { select: AUTHOR_SELECT } },
      }),
      this.prisma.post.update({ where: { id: postId }, data: { commentCount: { increment: 1 } } }),
      ...(data.parentId
        ? [this.prisma.comment.update({ where: { id: data.parentId }, data: { replyCount: { increment: 1 } } })]
        : []),
    ]);

    return comment;
  }

  async deleteComment(commentId: string, userId: string) {
    const comment = await this.prisma.comment.findFirst({ where: { id: commentId, isDeleted: false } });
    if (!comment) throw new NotFoundException();
    if (comment.authorId !== userId) throw new ForbiddenException();

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
    }

    await this.prisma.$transaction([
      this.prisma.commentLike.create({ data: { commentId, userId } }),
      this.prisma.comment.update({ where: { id: commentId }, data: { likeCount: { increment: 1 } } }),
    ]);
    return { liked: true };
  }
}
