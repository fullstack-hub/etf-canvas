'use client';

import { useState } from 'react';
import { useSession } from 'next-auth/react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import Link from 'next/link';
import { Heart, MessageCircle, Trash2, Clock, MoreHorizontal } from 'lucide-react';
import { api } from '@/lib/api';
import type { CommunityComment } from '@/lib/api';
import { timeAgo } from '@/lib/utils';

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
  const [showReply, setShowReply] = useState(false);
  const [replyText, setReplyText] = useState('');
  const [showNicknameModal, setShowNicknameModal] = useState(false);
  const [showMenu, setShowMenu] = useState(false);

  const { data: me } = useQuery({
    queryKey: ['user-me'],
    queryFn: () => api.getMe(),
    enabled: !!session?.user,
  });

  const likeMutation = useMutation({
    mutationFn: () => api.communityToggleCommentLike(comment.id),
    onMutate: async () => {
      await queryClient.cancelQueries({ queryKey: ['community-comments', postId] });
      const prev = queryClient.getQueryData<CommunityComment[]>(['community-comments', postId]);
      if (prev) {
        const update = (comments: CommunityComment[]): CommunityComment[] =>
          comments.map((c) => c.id === comment.id
            ? { ...c, liked: !c.liked, likeCount: c.liked ? c.likeCount - 1 : c.likeCount + 1 }
            : { ...c, replies: c.replies ? update(c.replies) : c.replies }
          );
        queryClient.setQueryData(['community-comments', postId], update(prev));
      }
      return { prev };
    },
    onError: (_err, _vars, ctx) => {
      if (ctx?.prev) queryClient.setQueryData(['community-comments', postId], ctx.prev);
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: ['community-comments', postId] }),
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

  const isAuthor = session?.user && comment.author.keycloakId === session.user.id;
  const isPostAuthor = comment.author.keycloakId === postAuthorId;
  const badges: string[] = [];
  if (comment.author.showInvestExp && comment.author.investExp) badges.push(comment.author.investExp);
  if (comment.author.showInvestStyle && comment.author.investStyle) badges.push(comment.author.investStyle);
  const isReply = depth > 0;

  return (
    <>
      {/* Comment - reply uses elevated bg (lighter) */}
      <div className={`${isReply ? 'pl-6 border-l-2 border-border ml-4' : 'border-b border-border'}`}>
        <div className="py-4">
          {/* Author */}
          <div className="flex items-center gap-1.5 mb-1.5">
            {badges.length > 0 && (
              <>
                <span className="text-[11px] font-medium text-primary">{badges[0]}</span>
                <span className="text-muted-foreground">·</span>
              </>
            )}
            <span className="text-[12px] text-sky-400">{comment.author.nickname}</span>
            {isPostAuthor && (
              <span className="text-[10px] px-1.5 py-0.5 rounded bg-muted text-red-400 font-semibold">작성자</span>
            )}
          </div>

          {/* Content */}
          <div className={`text-[13px] leading-[1.75] whitespace-pre-wrap mb-2.5 ${
            comment.isDeleted ? 'text-muted-foreground italic' : ''
          }`}>
            {comment.content}
          </div>

          {/* Actions */}
          {!comment.isDeleted && (
            <div className="flex items-center gap-3 text-[11px] text-muted-foreground">
              <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{timeAgo(comment.createdAt)}</span>
              <button
                onClick={() => session?.user && likeMutation.mutate()}
                className={`flex items-center gap-1 transition-colors ${comment.liked ? 'text-red-400' : 'hover:text-foreground'}`}
              >
                <Heart className={`w-3 h-3 ${comment.liked ? 'fill-current' : ''}`} />
                {comment.likeCount > 0 ? comment.likeCount : '좋아요'}
              </button>
              {depth === 0 && session?.user && (
                <button
                  onClick={() => setShowReply(!showReply)}
                  className={`flex items-center gap-1 transition-colors ${showReply ? 'text-primary' : 'hover:text-foreground'}`}
                >
                  <MessageCircle className="w-3 h-3" />답글
                </button>
              )}
              {isAuthor && (
                <div className="relative ml-auto">
                  <button onClick={() => setShowMenu(!showMenu)} className="p-0.5 rounded hover:bg-muted transition-colors">
                    <MoreHorizontal className="w-3.5 h-3.5" />
                  </button>
                  {showMenu && (
                    <>
                      <div className="fixed inset-0 z-40" onClick={() => setShowMenu(false)} />
                      <div className="absolute right-0 bottom-6 z-50 w-24 rounded-lg border border-border bg-card shadow-xl py-1">
                        <button
                          onClick={() => { setShowMenu(false); if (confirm('댓글을 삭제하시겠어요?')) deleteMutation.mutate(); }}
                          className="w-full text-left px-3 py-1.5 text-xs text-destructive hover:bg-muted transition-colors flex items-center gap-1.5"
                        >
                          <Trash2 className="w-3 h-3" /> 삭제
                        </button>
                      </div>
                    </>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Reply input */}
          {showReply && (
            <div className="flex items-center gap-2 mt-3">
              <input
                value={replyText}
                onChange={(e) => setReplyText(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleReplySubmit(); } }}
                placeholder="답글을 입력하세요"
                className="flex-1 bg-muted border border-border rounded-lg px-3 py-2 text-xs outline-none focus:border-primary transition-colors placeholder:text-muted-foreground"
                maxLength={1000}
                autoFocus
              />
              <button
                onClick={handleReplySubmit}
                disabled={!replyText.trim() || replyMutation.isPending}
                className="px-3 py-2 rounded-lg bg-primary text-primary-foreground text-xs font-medium hover:opacity-90 disabled:opacity-30 transition-opacity"
              >
                등록
              </button>
            </div>
          )}
        </div>
      </div>

      {comment.replies?.map((r) => (
        <CommunityCommentItem key={r.id} comment={r} postId={postId} postAuthorId={postAuthorId} depth={depth + 1} />
      ))}

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
    </>
  );
}
