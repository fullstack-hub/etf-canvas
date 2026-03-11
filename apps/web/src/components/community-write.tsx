'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useSession } from 'next-auth/react';
import { ChevronLeft, Briefcase, X } from 'lucide-react';
import { api } from '@/lib/api';
import type { CommunityPostDetail } from '@/lib/api';

export function CommunityWrite({
  editPost,
  onClose,
  onCreated,
}: {
  editPost?: CommunityPostDetail;
  onClose: () => void;
  onCreated: (id: string) => void;
}) {
  const { data: session } = useSession();
  const queryClient = useQueryClient();
  const [title, setTitle] = useState(editPost?.title || '');
  const [content, setContent] = useState(editPost?.content || '');
  const [portfolioId, setPortfolioId] = useState<string | undefined>(editPost?.portfolioId ?? undefined);
  const [showPortfolioPicker, setShowPortfolioPicker] = useState(false);

  const { data: myPortfolios } = useQuery({
    queryKey: ['my-portfolios'],
    queryFn: () => api.listPortfolios(),
    enabled: !!session?.user && !editPost,
  });

  const createMutation = useMutation({
    mutationFn: () => api.communityCreatePost({ title: title.trim(), content: content.trim(), portfolioId }),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['community-posts'] });
      queryClient.invalidateQueries({ queryKey: ['community-weekly-best'] });
      onCreated(data.id);
    },
  });

  const updateMutation = useMutation({
    mutationFn: () => api.communityUpdatePost(editPost!.id, { title: title.trim(), content: content.trim() }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['community-posts'] });
      queryClient.invalidateQueries({ queryKey: ['community-post', editPost!.id] });
      onCreated(editPost!.id);
    },
  });

  const handleSubmit = () => {
    if (!title.trim() || !content.trim()) return;
    if (editPost) updateMutation.mutate();
    else createMutation.mutate();
  };

  const isPending = createMutation.isPending || updateMutation.isPending;
  const selectedPortfolio = myPortfolios?.find((p) => p.id === portfolioId);

  return (
    <div className="flex-1 overflow-auto">
      <div className="max-w-4xl mx-auto px-6 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <button onClick={onClose} className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors">
            <ChevronLeft className="w-4 h-4" />
            {editPost ? '수정 취소' : '돌아가기'}
          </button>
          <button
            onClick={handleSubmit}
            disabled={!title.trim() || !content.trim() || isPending}
            className="px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 disabled:opacity-30 transition-opacity"
          >
            {isPending ? '저장 중...' : editPost ? '수정' : '등록'}
          </button>
        </div>

        {/* Editor - elevated surface = bg-card */}
        <div className="rounded-xl border border-border bg-card overflow-hidden">
          {/* Title */}
          <div className="px-6 pt-6">
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="제목을 입력하세요"
              className="w-full text-lg font-semibold bg-transparent outline-none placeholder:text-muted-foreground"
              maxLength={200}
            />
          </div>

          <div className="mx-6 my-4 border-t border-border" />

          {/* Content */}
          <div className="px-6 pb-6">
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="내용을 입력하세요"
              className="w-full min-h-[300px] bg-transparent outline-none text-sm leading-[1.8] resize-none placeholder:text-muted-foreground"
              maxLength={5000}
            />
          </div>

          {/* Footer - highest elevation = bg-muted */}
          <div className="px-6 py-3 bg-muted border-t border-border flex items-center justify-between">
            {!editPost ? (
              <div>
                {portfolioId && selectedPortfolio ? (
                  <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-border bg-card">
                    <Briefcase className="w-3.5 h-3.5 text-chart-5 shrink-0" />
                    <span className="text-[11px] font-medium text-chart-5 truncate max-w-40">{selectedPortfolio.name}</span>
                    <button onClick={() => setPortfolioId(undefined)} className="text-muted-foreground hover:text-foreground transition-colors ml-1">
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => setShowPortfolioPicker(!showPortfolioPicker)}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] transition-colors ${
                      showPortfolioPicker ? 'bg-card text-foreground' : 'text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    <Briefcase className="w-3.5 h-3.5" />
                    포트폴리오 첨부
                  </button>
                )}
              </div>
            ) : <div />}

            <span className={`text-[10px] tabular-nums ${content.length > 4500 ? 'text-amber-400' : 'text-muted-foreground'}`}>
              {content.length.toLocaleString()}/5,000
            </span>
          </div>
        </div>

        {/* Portfolio picker dropdown - elevated = bg-card */}
        {showPortfolioPicker && !portfolioId && (
          <div className="mt-2 rounded-xl border border-border bg-card overflow-hidden">
            <div className="max-h-48 overflow-y-auto">
              {myPortfolios?.map((p) => (
                <button
                  key={p.id}
                  onClick={() => { setPortfolioId(p.id); setShowPortfolioPicker(false); }}
                  className="w-full text-left px-4 py-3 hover:bg-muted transition-colors border-b border-border last:border-b-0"
                >
                  <p className="text-xs font-medium">{p.name}</p>
                  <p className="text-[10px] text-muted-foreground truncate mt-0.5">
                    {p.items.slice(0, 3).map((i) => i.name).join(', ')}
                  </p>
                </button>
              ))}
              {(!myPortfolios || myPortfolios.length === 0) && (
                <p className="text-xs text-muted-foreground py-6 text-center">저장된 포트폴리오가 없습니다</p>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
