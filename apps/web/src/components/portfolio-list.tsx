'use client';

import { useState } from 'react';
import { useSession } from 'next-auth/react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { useCanvasStore } from '@/lib/store';
import { Loader2 } from 'lucide-react';

type PortfolioItem = { code: string; name: string; weight: number; category?: string };
type Portfolio = {
  id: string;
  name: string;
  items: PortfolioItem[];
  returnRate: number | null;
  mdd: number | null;
  createdAt: string;
};

const SORT_OPTIONS = [
  { value: 'latest', label: '최신순' },
  { value: 'return', label: '수익률순' },
  { value: 'mdd', label: 'MDD순' },
] as const;

const CATEGORY_COLORS: Record<string, { label: string; border: string; text: string; bg: string }> = {
  '국내 대표지수': { label: '국내', border: 'border-blue-500/40', text: 'text-blue-400', bg: 'bg-blue-500' },
  '해외 대표지수': { label: '해외', border: 'border-cyan-500/40', text: 'text-cyan-400', bg: 'bg-cyan-500' },
  '섹터/테마': { label: '섹터', border: 'border-violet-500/40', text: 'text-violet-400', bg: 'bg-violet-500' },
  '액티브': { label: '액티브', border: 'border-purple-500/40', text: 'text-purple-400', bg: 'bg-purple-500' },
  '채권': { label: '채권', border: 'border-emerald-500/40', text: 'text-emerald-400', bg: 'bg-emerald-500' },
  '혼합': { label: '혼합', border: 'border-teal-500/40', text: 'text-teal-400', bg: 'bg-teal-500' },
  '원자재': { label: '원자재', border: 'border-amber-500/40', text: 'text-amber-400', bg: 'bg-amber-500' },
  '레버리지/인버스': { label: '레버리지&인버스', border: 'border-red-500/40', text: 'text-red-400', bg: 'bg-red-500' },
};

export function PortfolioList() {
  const { data: session, update: updateSession } = useSession();
  const queryClient = useQueryClient();
  const { setCurrentView, addToCanvas, clearCanvas } = useCanvasStore();
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [sort, setSort] = useState<string>('latest');

  const { data: portfolios, isLoading } = useQuery({
    queryKey: ['portfolios', (session as any)?.accessToken, sort],
    queryFn: () => api.listPortfolios((session as any)!.accessToken, sort === 'latest' ? undefined : sort),
    enabled: !!(session as any)?.accessToken,
  });

  const handleDelete = async (id: string) => {
    setDeletingId(id);
    const freshSession = await updateSession();
    const token = (freshSession as any)?.accessToken || (session as any)?.accessToken;
    try {
      await api.deletePortfolio(token, id);
      queryClient.invalidateQueries({ queryKey: ['portfolios'] });
    } finally {
      setDeletingId(null);
    }
  };

  const handleLoad = (portfolio: Portfolio) => {
    clearCanvas();
    for (const item of portfolio.items) {
      addToCanvas({
        code: item.code,
        name: item.name,
        categories: item.category ? [item.category] : [],
      } as any);
    }
    setCurrentView('canvas');
  };

  if (isLoading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-auto p-6 space-y-5">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold tracking-tight">내 포트폴리오 보관함</h2>
        <div className="flex items-center gap-1 bg-muted/50 rounded-lg p-0.5">
          {SORT_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              onClick={() => setSort(opt.value)}
              className={`px-2.5 py-1 rounded-md text-[11px] font-medium transition-colors ${
                sort === opt.value
                  ? 'bg-background text-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {(!portfolios || portfolios.length === 0) ? (
        <div className="flex flex-col items-center justify-center h-64 text-center text-muted-foreground rounded-xl border border-dashed border-border/50 mt-8">
          <div className="w-12 h-12 rounded-full bg-muted/40 flex items-center justify-center mb-3">
            <svg className="w-6 h-6 opacity-40" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
            </svg>
          </div>
          <h3 className="text-sm font-medium text-foreground/80 mb-1">저장된 포트폴리오가 없습니다</h3>
          <p className="text-xs text-muted-foreground/70">ETF를 합성한 후 저장해 보세요</p>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {portfolios.map((p) => (
            <PortfolioCard
              key={p.id}
              portfolio={p}
              deleting={deletingId === p.id}
              onLoad={() => handleLoad(p)}
              onDelete={() => handleDelete(p.id)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function PortfolioCard({ portfolio: p, deleting, onLoad, onDelete }: {
  portfolio: Portfolio;
  deleting: boolean;
  onLoad: () => void;
  onDelete: () => void;
}) {
  const catCounts = new Map<string, number>();
  for (const item of p.items) {
    if (item.category) catCounts.set(item.category, (catCounts.get(item.category) || 0) + 1);
  }
  const primaryCat = catCounts.size > 0 ? CATEGORY_COLORS[[...catCounts.keys()][0]] : null;
  const ret = p.returnRate != null ? Number(p.returnRate) : null;
  const mdd = p.mdd != null ? Number(p.mdd) : null;

  return (
    <div
      className="group relative rounded-lg border bg-background/80 hover:bg-background transition-all cursor-pointer overflow-hidden"
      onClick={onLoad}
    >
      {/* Left accent bar */}
      <div className={`absolute left-0 inset-y-0 w-[3px] ${primaryCat?.bg || 'bg-muted-foreground/30'}`} />

      <div className="pl-4 pr-3 py-3 flex items-center gap-4">
        {/* Left: info */}
        <div className="flex-1 min-w-0">
          {/* Name row */}
          <div className="flex items-center gap-2">
            <h3 className="font-semibold text-[13px] truncate">{p.name}</h3>
            <span className="text-[10px] text-muted-foreground/60 shrink-0">
              {new Date(p.createdAt).toLocaleDateString('ko-KR')}
            </span>
          </div>
          {/* Tags row */}
          <div className="flex items-center gap-1.5 mt-1.5">
            {[...catCounts.entries()].map(([cat, count]) => {
              const c = CATEGORY_COLORS[cat];
              return (
                <span
                  key={cat}
                  className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] font-medium border ${c?.border || 'border-border'} ${c?.text || 'text-muted-foreground'} bg-background/50`}
                >
                  {c?.label || cat.slice(0, 2)}
                  <span className="opacity-60">{count}</span>
                </span>
              );
            })}
          </div>
        </div>

        {/* Right: metrics + actions */}
        <div className="flex items-center gap-4 shrink-0">
          {ret != null && (
            <div className="text-right">
              <p className="text-[9px] text-muted-foreground/50 leading-none mb-1">수익률</p>
              <p className={`text-[15px] font-bold tabular-nums leading-none ${ret >= 0 ? 'text-emerald-500' : 'text-red-500'}`}>
                {ret >= 0 ? '+' : ''}{ret.toFixed(1)}%
              </p>
            </div>
          )}
          {mdd != null && (
            <div className="text-right">
              <p className="text-[9px] text-muted-foreground/50 leading-none mb-1">MDD</p>
              <p className="text-[15px] font-bold tabular-nums leading-none text-red-400/80">
                -{mdd.toFixed(1)}%
              </p>
            </div>
          )}
          <button
            onClick={(e) => { e.stopPropagation(); onDelete(); }}
            disabled={deleting}
            className="opacity-0 group-hover:opacity-100 ml-1 p-1 rounded text-muted-foreground/40 hover:text-red-400 hover:bg-red-500/10 transition-all"
            title="삭제"
          >
            {deleting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : (
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0" />
              </svg>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
