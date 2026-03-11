'use client';

import { useState } from 'react';
import { useSession } from 'next-auth/react';
import Link from 'next/link';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ChevronLeft, Heart, MessageCircle, Eye, Trash2, Pencil, Briefcase, Clock, MoreHorizontal, ExternalLink, TrendingUp, TrendingDown } from 'lucide-react';
import { api } from '@/lib/api';
import type { CommunityPostDetail as PostDetailType, CommunityComment } from '@/lib/api';
import { getCatColor } from '@/lib/category-colors';
import { CommunityCommentItem } from '@/components/community-comment';
import { CommunityWrite } from '@/components/community-write';

function timeAgo(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return '방금';
  if (m < 60) return `${m}분 전`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}시간 전`;
  const d = Math.floor(h / 24);
  if (d < 30) return `${d}일 전`;
  return new Date(dateStr).toLocaleDateString('ko-KR');
}

function formatCount(n: number) {
  if (n >= 10000) return `${(n / 10000).toFixed(1)}만`;
  if (n >= 1000) return `${(n / 1000).toFixed(1)}K`;
  return String(n);
}

export function CommunityPostDetail({ postId, onBack }: { postId: string; onBack: () => void }) {
  const { data: session } = useSession();
  const queryClient = useQueryClient();
  const [showEdit, setShowEdit] = useState(false);
  const [commentText, setCommentText] = useState('');
  const [showNicknameModal, setShowNicknameModal] = useState(false);
  const [showMenu, setShowMenu] = useState(false);

  const { data: post, isLoading } = useQuery({
    queryKey: ['community-post', postId],
    queryFn: () => api.communityPost(postId),
  });

  const { data: comments } = useQuery({
    queryKey: ['community-comments', postId],
    queryFn: () => api.communityComments(postId),
    enabled: !!post,
  });

  const { data: me } = useQuery({
    queryKey: ['user-me'],
    queryFn: () => api.getMe(),
    enabled: !!session?.user,
  });

  const likeMutation = useMutation({
    mutationFn: () => api.communityToggleLike(postId),
    onMutate: async () => {
      await queryClient.cancelQueries({ queryKey: ['community-post', postId] });
      const prev = queryClient.getQueryData<PostDetailType>(['community-post', postId]);
      if (prev) {
        queryClient.setQueryData(['community-post', postId], {
          ...prev,
          liked: !prev.liked,
          likeCount: prev.liked ? prev.likeCount - 1 : prev.likeCount + 1,
        });
      }
      return { prev };
    },
    onError: (_err, _vars, ctx) => {
      if (ctx?.prev) queryClient.setQueryData(['community-post', postId], ctx.prev);
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['community-post', postId] });
      queryClient.invalidateQueries({ queryKey: ['community-posts'] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: () => api.communityDeletePost(postId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['community-posts'] });
      onBack();
    },
  });

  const commentMutation = useMutation({
    mutationFn: (data: { content: string; parentId?: string }) => api.communityCreateComment(postId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['community-comments', postId] });
      queryClient.invalidateQueries({ queryKey: ['community-post', postId] });
      setCommentText('');
    },
  });

  const handleCommentSubmit = () => {
    if (!session?.user) return;
    if (!me?.nickname) { setShowNicknameModal(true); return; }
    if (!commentText.trim()) return;
    commentMutation.mutate({ content: commentText.trim() });
  };

  if (showEdit && post) {
    return (
      <CommunityWrite
        editPost={post}
        onClose={() => setShowEdit(false)}
        onCreated={() => {
          setShowEdit(false);
          queryClient.invalidateQueries({ queryKey: ['community-post', postId] });
        }}
      />
    );
  }

  if (isLoading || !post) {
    return (
      <div className="flex-1 overflow-auto">
        <div className="max-w-4xl mx-auto px-6 py-8 animate-pulse">
          <div className="h-4 bg-muted rounded w-24 mb-6" />
          <div className="h-7 bg-muted rounded w-3/4 mb-4" />
          <div className="h-3.5 bg-muted rounded w-40 mb-8" />
          <div className="space-y-3">
            <div className="h-4 bg-muted rounded w-full" />
            <div className="h-4 bg-muted rounded w-5/6" />
            <div className="h-4 bg-muted rounded w-2/3" />
          </div>
        </div>
      </div>
    );
  }

  const isAuthor = session?.user && post.author.keycloakId === (session.user as any).id;
  const badges: string[] = [];
  if (post.author.showInvestExp && post.author.investExp) badges.push(post.author.investExp);
  if (post.author.showInvestStyle && post.author.investStyle) badges.push(post.author.investStyle);

  return (
    <div className="flex-1 overflow-auto">
      <div className="max-w-4xl mx-auto px-6 py-8">
        {/* Breadcrumb */}
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-5">
          <button onClick={onBack} className="hover:text-foreground transition-colors">커뮤니티</button>
          <ChevronLeft className="w-3 h-3 rotate-180" />
          <span className="text-foreground font-medium">{post.category.name}</span>
        </div>

        {/* Title */}
        <h1 className="text-xl font-bold leading-snug mb-4">{post.title}</h1>

        {/* Author + Meta */}
        <div className="mb-6 pb-6 border-b border-border">
          <div className="flex items-center gap-2 text-[13px] mb-2">
            <span className="font-semibold text-sky-400">{post.author.nickname}</span>
            {badges.map((b) => (
              <span key={b} className="text-[10px] px-1.5 py-0.5 rounded bg-muted text-muted-foreground">{b}</span>
            ))}
          </div>
          <div className="flex items-center gap-3 text-xs text-muted-foreground">
            <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{timeAgo(post.createdAt)}</span>
            <span className="flex items-center gap-1"><Eye className="w-3 h-3" />{formatCount(post.viewCount)}</span>
            <span className="flex items-center gap-1"><MessageCircle className="w-3 h-3" />{formatCount(post.commentCount)}</span>
            {isAuthor && (
              <div className="relative">
                <button onClick={() => setShowMenu(!showMenu)} className="p-1 rounded hover:bg-muted transition-colors">
                  <MoreHorizontal className="w-4 h-4" />
                </button>
                {showMenu && (
                  <>
                    <div className="fixed inset-0 z-40" onClick={() => setShowMenu(false)} />
                    <div className="absolute right-0 top-8 z-50 w-28 rounded-lg border border-border bg-card shadow-xl py-1">
                      <button
                        onClick={() => { setShowMenu(false); setShowEdit(true); }}
                        className="w-full text-left px-3 py-2 text-xs hover:bg-muted transition-colors flex items-center gap-2"
                      >
                        <Pencil className="w-3 h-3" /> 수정
                      </button>
                      <button
                        onClick={() => { setShowMenu(false); if (confirm('삭제하시겠어요?')) deleteMutation.mutate(); }}
                        className="w-full text-left px-3 py-2 text-xs text-destructive hover:bg-muted transition-colors flex items-center gap-2"
                      >
                        <Trash2 className="w-3 h-3" /> 삭제
                      </button>
                    </div>
                  </>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Content */}
        <div className="text-[14px] leading-[1.9] whitespace-pre-wrap mb-8 min-h-[120px]">
          {post.content}
        </div>

        {/* Portfolio */}
        {post.portfolio && (
          <AttachedPortfolio portfolio={post.portfolio} />
        )}

        {/* Like + Comment */}
        <div className="flex items-center gap-4 py-4 border-t border-border">
          <button
            onClick={() => session?.user && likeMutation.mutate()}
            className={`flex items-center gap-1.5 text-sm transition-colors ${
              post.liked ? 'text-red-400' : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <Heart className={`w-[18px] h-[18px] ${post.liked ? 'fill-current' : ''}`} />
            <span className="font-medium">{post.likeCount}</span>
          </button>
          <span className="flex items-center gap-1.5 text-sm text-muted-foreground">
            <MessageCircle className="w-[18px] h-[18px]" />
            <span className="font-medium">{post.commentCount}</span>
          </span>
        </div>

        {/* Comments */}
        <section className="border-t border-border pt-6">
          {session?.user && (
            <div className="flex items-center gap-3 mb-6 pb-6 border-b border-border">
              <input
                value={commentText}
                onChange={(e) => setCommentText(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleCommentSubmit(); } }}
                placeholder="댓글을 입력하세요"
                className="flex-1 bg-muted border border-border rounded-lg px-4 py-2.5 text-sm outline-none focus:border-primary transition-colors placeholder:text-muted-foreground"
                maxLength={1000}
              />
              <button
                onClick={handleCommentSubmit}
                disabled={!commentText.trim() || commentMutation.isPending}
                className="px-4 py-2.5 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 disabled:opacity-30 transition-opacity"
              >
                등록
              </button>
            </div>
          )}

          <div>
            {comments?.map((c) => (
              <CommunityCommentItem key={c.id} comment={c} postId={postId} postAuthorId={post.author.keycloakId} depth={0} />
            ))}
            {comments?.length === 0 && (
              <div className="text-center py-12 text-muted-foreground text-xs">아직 댓글이 없습니다</div>
            )}
          </div>
        </section>
      </div>

      {showNicknameModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
          <div className="bg-card rounded-xl border border-border p-6 w-80 shadow-2xl">
            <p className="text-sm font-semibold mb-1">닉네임 설정이 필요합니다</p>
            <p className="text-xs text-muted-foreground mb-5">커뮤니티에 참여하려면 먼저 닉네임을 설정해주세요.</p>
            <div className="flex justify-end gap-2">
              <button onClick={() => setShowNicknameModal(false)} className="px-3 py-1.5 text-xs rounded-lg bg-muted text-foreground hover:opacity-80 transition-opacity">취소</button>
              <Link href="/mypage" onClick={() => setShowNicknameModal(false)} className="px-3 py-1.5 text-xs rounded-lg bg-primary text-primary-foreground hover:opacity-90 transition-opacity">설정하러 가기</Link>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/** 포트폴리오 첨부 카드 — 구성종목 전체 + 실전 수익률 */
function AttachedPortfolio({ portfolio }: { portfolio: NonNullable<PostDetailType['portfolio']> }) {
  const items = portfolio.items as { code: string; name: string; weight: number; category?: string }[];

  const { data: since } = useQuery({
    queryKey: ['portfolio-since-public', portfolio.slug],
    queryFn: () => api.getPublicSince(portfolio.slug),
    staleTime: 60_000 * 5,
  });

  const returnRate = portfolio.returnRate != null ? Number(portfolio.returnRate) : null;
  const sinceReturn = since?.totalReturn;
  const sinceDays = since?.daysSinceSave;
  const sinceMdd = since?.maxDrawdown;

  return (
    <div className="mb-8 rounded-xl border border-border bg-card overflow-hidden">
      {/* Header */}
      <div className="px-5 py-4 border-b border-border flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center">
            <Briefcase className="w-4 h-4 text-chart-5" />
          </div>
          <div>
            <p className="text-[13px] font-semibold leading-tight">{portfolio.name}</p>
            <div className="flex items-center gap-1.5 mt-0.5">
              <span className="text-[10px] text-muted-foreground">{items.length}개 종목</span>
              {portfolio.tags.length > 0 && (
                <>
                  <span className="text-[10px] text-border">·</span>
                  {portfolio.tags.map((tag) => (
                    <span key={tag} className="text-[10px] text-primary/80">#{tag}</span>
                  ))}
                </>
              )}
            </div>
          </div>
        </div>
        <a
          href={`/portfolio/${portfolio.slug}`}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-1 text-[11px] text-muted-foreground hover:text-foreground transition-colors"
        >
          새 탭에서 보기 <ExternalLink className="w-3 h-3" />
        </a>
      </div>

      {/* Stats */}
      {(returnRate != null || sinceReturn != null) && (
        <div className="px-5 py-3 border-b border-border flex items-center gap-6">
          {returnRate != null && (
            <div>
              <p className="text-[10px] text-muted-foreground mb-0.5">백테스트 수익률</p>
              <p className={`text-sm font-bold ${returnRate >= 0 ? 'text-red-400' : 'text-blue-400'}`}>
                {returnRate >= 0 ? '+' : ''}{returnRate.toFixed(1)}%
              </p>
            </div>
          )}
          {sinceReturn != null && (
            <div>
              <p className="text-[10px] text-muted-foreground mb-0.5">
                실전 수익률{sinceDays != null && ` (${sinceDays}일)`}
              </p>
              <div className="flex items-center gap-1">
                {sinceReturn >= 0 ? (
                  <TrendingUp className="w-3.5 h-3.5 text-red-400" />
                ) : (
                  <TrendingDown className="w-3.5 h-3.5 text-blue-400" />
                )}
                <p className={`text-sm font-bold ${sinceReturn >= 0 ? 'text-red-400' : 'text-blue-400'}`}>
                  {sinceReturn >= 0 ? '+' : ''}{sinceReturn.toFixed(2)}%
                </p>
              </div>
            </div>
          )}
          {sinceMdd != null && (
            <div>
              <p className="text-[10px] text-muted-foreground mb-0.5">MDD</p>
              <p className="text-sm font-bold text-muted-foreground">{sinceMdd.toFixed(1)}%</p>
            </div>
          )}
        </div>
      )}

      {/* Items — all */}
      <div className="px-5 py-4 space-y-1.5">
        {items.map((item) => {
          const catColor = getCatColor(item.category);
          return (
            <div key={item.code} className="flex items-center gap-3">
              <div className={`w-1.5 h-1.5 rounded-full shrink-0 ${catColor.dot}`} />
              <span className="text-[11px] w-36 truncate shrink-0">{item.name}</span>
              <div className="flex-1 h-3.5 bg-muted rounded-sm overflow-hidden">
                <div
                  className={`h-full rounded-sm ${catColor.bar}`}
                  style={{ width: `${item.weight}%` }}
                />
              </div>
              <span className="text-[11px] font-medium tabular-nums w-10 text-right shrink-0">{item.weight}%</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
