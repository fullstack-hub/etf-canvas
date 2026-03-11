'use client';

import { useState } from 'react';
import { useSession } from 'next-auth/react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ChevronLeft, Heart, MessageCircle, Eye, Trash2, Pencil, Briefcase } from 'lucide-react';
import { api } from '@/lib/api';
import type { CommunityPostDetail as PostDetailType, CommunityComment } from '@/lib/api';
import { useCanvasStore } from '@/lib/store';
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

export function CommunityPostDetail({ postId, onBack }: { postId: string; onBack: () => void }) {
  const { data: session } = useSession();
  const queryClient = useQueryClient();
  const { setCurrentView } = useCanvasStore();
  const [showEdit, setShowEdit] = useState(false);
  const [commentText, setCommentText] = useState('');
  const [showNicknameModal, setShowNicknameModal] = useState(false);

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
    onSuccess: () => {
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
        <div className="max-w-2xl mx-auto px-6 py-8">
          <div className="animate-pulse space-y-4">
            <div className="h-6 bg-card rounded w-20" />
            <div className="h-8 bg-card rounded w-3/4" />
            <div className="h-40 bg-card rounded" />
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
      <div className="max-w-2xl mx-auto px-6 py-8">
        {/* Back */}
        <button onClick={onBack} className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-4 transition-colors">
          <ChevronLeft className="w-4 h-4" />
          목록으로
        </button>

        {/* Post */}
        <article>
          <div className="flex items-center gap-2 mb-2">
            {post.category.slug === 'portfolio-review' && (
              <span className="flex items-center gap-0.5 text-[10px] px-1.5 py-0.5 rounded bg-chart-5/15 text-chart-5">
                <Briefcase className="w-2.5 h-2.5" />
                포트폴리오 리뷰
              </span>
            )}
            <span className="text-xs text-muted-foreground">{timeAgo(post.createdAt)}</span>
          </div>

          <h1 className="text-lg font-bold mb-3">{post.title}</h1>

          <div className="flex items-center gap-2 mb-4 pb-4 border-b border-border/50">
            <span className="text-sm font-medium">{post.author.nickname}</span>
            {badges.map((b) => (
              <span key={b} className="text-[10px] px-1.5 py-0.5 rounded bg-muted text-muted-foreground">{b}</span>
            ))}
          </div>

          <div className="text-sm leading-relaxed whitespace-pre-wrap mb-6">{post.content}</div>

          {/* Portfolio card */}
          {post.portfolioId && <PortfolioCard portfolioId={post.portfolioId} />}

          {/* Actions */}
          <div className="flex items-center gap-4 py-3 border-t border-b border-border/50">
            <button
              onClick={() => session?.user && likeMutation.mutate()}
              className={`flex items-center gap-1.5 text-sm transition-colors ${post.liked ? 'text-red-500' : 'text-muted-foreground hover:text-foreground'}`}
            >
              <Heart className={`w-4 h-4 ${post.liked ? 'fill-current' : ''}`} />
              {post.likeCount}
            </button>
            <span className="flex items-center gap-1.5 text-sm text-muted-foreground">
              <MessageCircle className="w-4 h-4" />{post.commentCount}
            </span>
            <span className="flex items-center gap-1.5 text-sm text-muted-foreground">
              <Eye className="w-4 h-4" />{post.viewCount}
            </span>
            {isAuthor && (
              <div className="ml-auto flex items-center gap-2">
                <button onClick={() => setShowEdit(true)} className="text-xs text-muted-foreground hover:text-foreground transition-colors">
                  <Pencil className="w-3.5 h-3.5" />
                </button>
                <button onClick={() => { if (confirm('삭제하시겠어요?')) deleteMutation.mutate(); }} className="text-xs text-destructive/60 hover:text-destructive transition-colors">
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            )}
          </div>
        </article>

        {/* Comments */}
        <section className="mt-6">
          <h2 className="text-sm font-semibold mb-4">댓글 {post.commentCount}</h2>

          {session?.user && (
            <div className="flex gap-2 mb-5">
              <input
                value={commentText}
                onChange={(e) => setCommentText(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleCommentSubmit(); } }}
                placeholder="댓글을 입력하세요"
                className="flex-1 bg-background/50 border border-border rounded-lg px-3 py-2 text-sm outline-none focus:border-primary/50 transition-colors placeholder:text-muted-foreground/40"
                maxLength={1000}
              />
              <button
                onClick={handleCommentSubmit}
                disabled={!commentText.trim() || commentMutation.isPending}
                className="px-3 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 disabled:opacity-50 transition-all"
              >
                등록
              </button>
            </div>
          )}

          <div className="space-y-1">
            {comments?.map((c) => (
              <CommunityCommentItem
                key={c.id}
                comment={c}
                postId={postId}
                postAuthorId={post.author.keycloakId}
                depth={0}
              />
            ))}
          </div>
        </section>
      </div>

      {/* Nickname modal */}
      {showNicknameModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-card rounded-xl border border-border p-6 w-80 shadow-xl">
            <p className="text-sm font-medium mb-4">닉네임 설정이 필요합니다</p>
            <div className="flex justify-end gap-2">
              <button onClick={() => setShowNicknameModal(false)} className="px-3 py-1.5 text-xs rounded-lg bg-muted hover:bg-muted/80 transition-colors">취소</button>
              <button onClick={() => { setShowNicknameModal(false); setCurrentView('mypage'); }} className="px-3 py-1.5 text-xs rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-colors">설정하러 가기</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function PortfolioCard({ portfolioId }: { portfolioId: string }) {
  // portfolioId로 직접 조회할 수 없으므로 (slug 기반 public API만 있음)
  // 간단히 링크만 표시
  return (
    <div className="mb-6 p-3 rounded-xl border border-chart-5/30 bg-chart-5/5">
      <div className="flex items-center gap-2 text-xs text-chart-5">
        <Briefcase className="w-3.5 h-3.5" />
        <span className="font-medium">첨부된 포트폴리오</span>
      </div>
    </div>
  );
}
