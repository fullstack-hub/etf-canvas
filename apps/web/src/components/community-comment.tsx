'use client';

import { useState } from 'react';
import { useSession } from 'next-auth/react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Heart, Reply, Trash2 } from 'lucide-react';
import { api } from '@/lib/api';
import type { CommunityComment } from '@/lib/api';
import { useCanvasStore } from '@/lib/store';

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

export function CommunityCommentItem({
  comment,
  postId,
  postAuthorId,
  depth = 0,
}: {
  comment: CommunityComment;
  postId: string;
  postAuthorId: string;
  depth?: number;
}) {
  const { data: session } = useSession();
  const queryClient = useQueryClient();
  const { setCurrentView } = useCanvasStore();
  const [showReply, setShowReply] = useState(false);
  const [replyText, setReplyText] = useState('');
  const [showNicknameModal, setShowNicknameModal] = useState(false);

  const { data: me } = useQuery({
    queryKey: ['user-me'],
    queryFn: () => api.getMe(),
    enabled: !!session?.user,
  });

  const likeMutation = useMutation({
    mutationFn: () => api.communityToggleCommentLike(comment.id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['community-comments', postId] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: () => api.communityDeleteComment(comment.id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['community-comments', postId] });
      queryClient.invalidateQueries({ queryKey: ['community-post', postId] });
    },
  });

  const replyMutation = useMutation({
    mutationFn: (content: string) => api.communityCreateComment(postId, { content, parentId: comment.id }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['community-comments', postId] });
      queryClient.invalidateQueries({ queryKey: ['community-post', postId] });
      setReplyText('');
      setShowReply(false);
    },
  });

  const handleReplySubmit = () => {
    if (!session?.user) return;
    if (!me?.nickname) { setShowNicknameModal(true); return; }
    if (!replyText.trim()) return;
    replyMutation.mutate(replyText.trim());
  };

  const isAuthor = session?.user && comment.author.keycloakId === (session.user as any).id;
  const isPostAuthor = comment.author.keycloakId === postAuthorId;

  const badges: string[] = [];
  if (comment.author.showInvestExp && comment.author.investExp) badges.push(comment.author.investExp);
  if (comment.author.showInvestStyle && comment.author.investStyle) badges.push(comment.author.investStyle);

  return (
    <>
      <div className={`py-3 ${depth > 0 ? 'ml-8 border-l-2 border-border/30 pl-4' : ''}`}>
        <div className="flex items-center gap-2 mb-1">
          <span className="text-xs font-medium">{comment.author.nickname}</span>
          {isPostAuthor && (
            <span className="text-[9px] px-1 py-0.5 rounded bg-primary/15 text-primary">글쓴이</span>
          )}
          {badges.map((b) => (
            <span key={b} className="text-[9px] px-1 py-0.5 rounded bg-muted text-muted-foreground">{b}</span>
          ))}
          <span className="text-[10px] text-muted-foreground/50">{timeAgo(comment.createdAt)}</span>
        </div>

        <p className={`text-sm mb-2 ${comment.isDeleted ? 'text-muted-foreground/40 italic' : ''}`}>
          {comment.content}
        </p>

        {!comment.isDeleted && (
          <div className="flex items-center gap-3">
            <button
              onClick={() => session?.user && likeMutation.mutate()}
              className={`flex items-center gap-1 text-[11px] transition-colors ${comment.liked ? 'text-red-500' : 'text-muted-foreground hover:text-foreground'}`}
            >
              <Heart className={`w-3 h-3 ${comment.liked ? 'fill-current' : ''}`} />
              {comment.likeCount > 0 && comment.likeCount}
            </button>
            {depth === 0 && session?.user && (
              <button
                onClick={() => setShowReply(!showReply)}
                className="flex items-center gap-1 text-[11px] text-muted-foreground hover:text-foreground transition-colors"
              >
                <Reply className="w-3 h-3" />
                답글
              </button>
            )}
            {isAuthor && (
              <button
                onClick={() => { if (confirm('댓글을 삭제하시겠어요?')) deleteMutation.mutate(); }}
                className="flex items-center gap-1 text-[11px] text-destructive/50 hover:text-destructive transition-colors"
              >
                <Trash2 className="w-3 h-3" />
              </button>
            )}
          </div>
        )}

        {/* Reply input */}
        {showReply && (
          <div className="flex gap-2 mt-3">
            <input
              value={replyText}
              onChange={(e) => setReplyText(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleReplySubmit(); } }}
              placeholder="답글을 입력하세요"
              className="flex-1 bg-background/50 border border-border rounded-lg px-3 py-1.5 text-xs outline-none focus:border-primary/50 transition-colors placeholder:text-muted-foreground/40"
              maxLength={1000}
              autoFocus
            />
            <button
              onClick={handleReplySubmit}
              disabled={!replyText.trim() || replyMutation.isPending}
              className="px-2.5 py-1.5 rounded-lg bg-primary text-primary-foreground text-xs font-medium hover:bg-primary/90 disabled:opacity-50 transition-all"
            >
              등록
            </button>
          </div>
        )}
      </div>

      {/* Replies */}
      {comment.replies?.map((r) => (
        <CommunityCommentItem
          key={r.id}
          comment={r}
          postId={postId}
          postAuthorId={postAuthorId}
          depth={depth + 1}
        />
      ))}

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
    </>
  );
}
