'use client';

import { useState } from 'react';
import { useSession } from 'next-auth/react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { useCanvasStore } from '@/lib/store';
import { Loader2, ChevronDown } from 'lucide-react';

type PortfolioItem = { code: string; name: string; weight: number; category?: string };
type Snapshot = {
  periods: Record<string, { totalReturn: number; annualizedReturn: number; maxDrawdown: number }>;
  avgVolatility: number;
};
type Portfolio = {
  id: string;
  name: string;
  items: PortfolioItem[];
  snapshot: Snapshot | null;
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

const PERIOD_LABELS: Record<string, string> = {
  '1w': '1주', '1m': '1개월', '3m': '3개월', '6m': '6개월', '1y': '1년', '3y': '3년',
};

export function PortfolioList() {
  const { data: session, status: sessionStatus, update: updateSession } = useSession();
  const queryClient = useQueryClient();
  const { setCurrentView, addToCanvas, clearCanvas } = useCanvasStore();
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [sort, setSort] = useState<string>('latest');
  const [expandedId, setExpandedId] = useState<string | null>(null);

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

  if (isLoading || sessionStatus === 'loading') {
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
        <div className="flex flex-col gap-2">
          {portfolios.map((p) => (
            <PortfolioCard
              key={p.id}
              portfolio={p}
              expanded={expandedId === p.id}
              deleting={deletingId === p.id}
              token={(session as any)?.accessToken}
              onToggle={() => setExpandedId(expandedId === p.id ? null : p.id)}
              onLoad={() => handleLoad(p)}
              onDelete={() => handleDelete(p.id)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function PortfolioCard({ portfolio: p, expanded, deleting, token, onToggle, onLoad, onDelete }: {
  portfolio: Portfolio;
  expanded: boolean;
  deleting: boolean;
  token: string;
  onToggle: () => void;
  onLoad: () => void;
  onDelete: () => void;
}) {
  const catWeights = new Map<string, number>();
  for (const item of p.items) {
    if (item.category) catWeights.set(item.category, (catWeights.get(item.category) || 0) + item.weight);
  }
  const primaryCat = catWeights.size > 0 ? CATEGORY_COLORS[[...catWeights.keys()][0]] : null;
  const ret = p.returnRate != null ? Number(p.returnRate) : null;

  return (
    <div className="rounded-lg border bg-background/80 overflow-hidden">
      {/* Summary — 클릭 시 아코디언 토글 */}
      <div
        className="relative px-4 py-3 cursor-pointer hover:bg-muted/30 transition-colors"
        onClick={onToggle}
      >
        <div className={`absolute left-0 inset-y-0 w-[3px] ${primaryCat?.bg || 'bg-muted-foreground/30'}`} />

        {/* 제목 + 화살표 */}
        <div className="flex items-center justify-between">
          <h3 className="font-semibold text-[13px] truncate">{p.name}</h3>
          <div className="flex items-center gap-2 shrink-0">
            {ret != null && (
              <span className={`text-sm font-bold tabular-nums ${ret >= 0 ? 'text-emerald-500' : 'text-red-500'}`}>
                {ret >= 0 ? '+' : ''}{ret.toFixed(1)}%
              </span>
            )}
            <ChevronDown className={`w-4 h-4 text-muted-foreground transition-transform ${expanded ? 'rotate-180' : ''}`} />
          </div>
        </div>

        {/* 날짜 */}
        <p className="text-[10px] text-muted-foreground/60 mt-1">
          {new Date(p.createdAt).toLocaleDateString('ko-KR')}
        </p>

        {/* 카테고리 태그 */}
        <div className="flex flex-wrap gap-1 mt-1.5">
          {[...catWeights.entries()].map(([cat, weight]) => {
            const c = CATEGORY_COLORS[cat];
            return (
              <span
                key={cat}
                className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] font-medium border ${c?.border || 'border-border'} ${c?.text || 'text-muted-foreground'} bg-background/50`}
              >
                {c?.label || cat.slice(0, 2)}
                <span className="opacity-60">{Math.round(weight)}%</span>
              </span>
            );
          })}
        </div>
      </div>

      {/* 아코디언 확장 영역 */}
      {expanded && (
        <div className="border-t">
          <div className="grid grid-cols-2 divide-x">
            {/* 좌측: 저장 시점 스냅샷 */}
            <SnapshotPanel portfolio={p} />
            {/* 우측: "그때 샀더라면" */}
            <SincePanel portfolioId={p.id} token={token} saveDate={p.createdAt} />
          </div>
          {/* 액션 버튼 */}
          <div className="flex items-center justify-end gap-2 px-4 py-2.5 border-t bg-muted/20">
            <button
              onClick={(e) => { e.stopPropagation(); onLoad(); }}
              className="px-3 py-1.5 rounded-md text-xs font-medium bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
            >
              캔버스에 불러오기
            </button>
            <button
              onClick={(e) => { e.stopPropagation(); onDelete(); }}
              disabled={deleting}
              className="px-3 py-1.5 rounded-md text-xs font-medium text-destructive hover:bg-destructive/10 transition-colors"
            >
              {deleting ? <Loader2 className="w-3 h-3 animate-spin" /> : '삭제'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

/** 좌측: 저장 시점 스냅샷 */
function SnapshotPanel({ portfolio: p }: { portfolio: Portfolio }) {
  const snap = p.snapshot;

  return (
    <div className="p-4 space-y-4">
      <h4 className="text-xs font-bold text-muted-foreground uppercase tracking-wider">저장 시점 성과</h4>

      {/* 기간별 수익률 */}
      {snap?.periods && Object.keys(snap.periods).length > 0 ? (
        <div className="space-y-3">
          <div className="grid grid-cols-3 gap-2">
            {(['1w', '1m', '3m', '6m', '1y', '3y'] as const).map((period) => {
              const data = snap.periods[period];
              if (!data) return null;
              const ret = data.totalReturn;
              return (
                <div key={period} className="rounded-md bg-muted/30 px-2.5 py-2">
                  <p className="text-[9px] text-muted-foreground mb-0.5">{PERIOD_LABELS[period]}</p>
                  <p className={`text-sm font-bold tabular-nums ${ret >= 0 ? 'text-emerald-500' : 'text-red-500'}`}>
                    {ret >= 0 ? '+' : ''}{ret.toFixed(1)}%
                  </p>
                </div>
              );
            })}
          </div>

          {/* 연환산, MDD, 변동성 */}
          <div className="grid grid-cols-3 gap-2">
            {snap.periods['1y'] && (
              <div className="rounded-md bg-muted/30 px-2.5 py-2">
                <p className="text-[9px] text-muted-foreground mb-0.5">연환산</p>
                <p className={`text-sm font-bold tabular-nums ${snap.periods['1y'].annualizedReturn >= 0 ? 'text-emerald-500' : 'text-red-500'}`}>
                  {snap.periods['1y'].annualizedReturn >= 0 ? '+' : ''}{snap.periods['1y'].annualizedReturn.toFixed(1)}%
                </p>
              </div>
            )}
            {snap.periods['1y'] && (
              <div className="rounded-md bg-muted/30 px-2.5 py-2">
                <p className="text-[9px] text-muted-foreground mb-0.5">MDD</p>
                <p className="text-sm font-bold tabular-nums text-red-400">
                  -{snap.periods['1y'].maxDrawdown.toFixed(1)}%
                </p>
              </div>
            )}
            <div className="rounded-md bg-muted/30 px-2.5 py-2">
              <p className="text-[9px] text-muted-foreground mb-0.5">변동성</p>
              <p className="text-sm font-bold tabular-nums text-amber-500">
                {snap.avgVolatility.toFixed(1)}%
              </p>
            </div>
          </div>
        </div>
      ) : (
        <p className="text-xs text-muted-foreground">스냅샷 데이터 없음</p>
      )}

      {/* 종목 구성 */}
      <div>
        <p className="text-[10px] text-muted-foreground mb-1.5 font-medium">종목 구성</p>
        <div className="space-y-1">
          {p.items.map((item) => (
            <div key={item.code} className="flex items-center justify-between text-[11px]">
              <span className="truncate mr-2">{item.name}</span>
              <span className="tabular-nums text-muted-foreground shrink-0">{item.weight}%</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/** 우측: "그때 샀더라면" — 저장일~오늘 */
function SincePanel({ portfolioId, token, saveDate }: { portfolioId: string; token: string; saveDate: string }) {
  const isSavedToday = new Date(saveDate).toDateString() === new Date().toDateString();

  // 저장일~오늘 사이에 거래일(평일)이 있는지 프론트에서 먼저 체크
  const hasTradeDay = (() => {
    if (isSavedToday) return false;
    const start = new Date(saveDate);
    start.setDate(start.getDate() + 1); // 저장 다음날부터
    const end = new Date();
    for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
      const day = d.getDay();
      if (day !== 0 && day !== 6) return true; // 평일 있음
    }
    return false;
  })();

  const { data, isLoading } = useQuery({
    queryKey: ['portfolio-since', portfolioId],
    queryFn: () => api.getPortfolioSince(token, portfolioId),
    enabled: !!token && hasTradeDay,
    staleTime: 1000 * 60 * 60,
  });

  const saveDateStr = new Date(saveDate).toLocaleDateString('ko-KR');

  if (isSavedToday) {
    return (
      <div className="p-4 flex items-center justify-center min-h-[200px] text-xs text-muted-foreground">
        오늘 저장한 포트폴리오입니다. 내일부터 성과를 추적할 수 있어요.
      </div>
    );
  }

  if (!hasTradeDay) {
    return (
      <div className="p-4 flex items-center justify-center min-h-[200px] text-xs text-muted-foreground">
        저장 이후 거래일이 없습니다 (주말/공휴일)
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="p-4 flex items-center justify-center min-h-[200px]">
        <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!data || data.daysSinceSave < 1 || (data as any).message === 'no_trading_days') {
    return (
      <div className="p-4 flex items-center justify-center min-h-[200px] text-xs text-muted-foreground">
        {(data as any)?.message === 'no_trading_days' ? '저장 이후 거래일이 없습니다 (주말/공휴일)' : '데이터를 불러올 수 없습니다'}
      </div>
    );
  }

  const ret = data.totalReturn;
  const amount = 10_000_000;
  const finalValue = Math.round(amount * (1 + ret / 100));

  return (
    <div className="p-4 space-y-4">
      <div>
        <h4 className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
          그때 샀더라면
        </h4>
        <p className="text-[10px] text-muted-foreground mt-0.5">
          {saveDateStr} ~ 오늘 ({data.daysSinceSave}일)
        </p>
      </div>

      {/* 핵심 지표 */}
      <div className="grid grid-cols-2 gap-2">
        <div className="rounded-md bg-muted/30 px-2.5 py-2">
          <p className="text-[9px] text-muted-foreground mb-0.5">총 수익률</p>
          <p className={`text-lg font-bold tabular-nums ${ret >= 0 ? 'text-emerald-500' : 'text-red-500'}`}>
            {ret >= 0 ? '+' : ''}{ret.toFixed(2)}%
          </p>
        </div>
        <div className="rounded-md bg-muted/30 px-2.5 py-2">
          <p className="text-[9px] text-muted-foreground mb-0.5">연환산</p>
          <p className={`text-lg font-bold tabular-nums ${data.annualizedReturn >= 0 ? 'text-emerald-500' : 'text-red-500'}`}>
            {data.annualizedReturn >= 0 ? '+' : ''}{data.annualizedReturn.toFixed(2)}%
          </p>
        </div>
        <div className="rounded-md bg-muted/30 px-2.5 py-2">
          <p className="text-[9px] text-muted-foreground mb-0.5">MDD</p>
          <p className="text-lg font-bold tabular-nums text-red-400">
            -{data.maxDrawdown.toFixed(2)}%
          </p>
        </div>
        <div className="rounded-md bg-muted/30 px-2.5 py-2">
          <p className="text-[9px] text-muted-foreground mb-0.5">1천만원 투자 시</p>
          <p className={`text-lg font-bold tabular-nums ${ret >= 0 ? 'text-emerald-500' : 'text-red-500'}`}>
            {finalValue.toLocaleString()}원
          </p>
        </div>
      </div>

      {/* 미니 차트 */}
      {data.dailyValues.length > 1 && (
        <MiniChart dailyValues={data.dailyValues} amount={amount} />
      )}
    </div>
  );
}

/** 미니 라인 차트 (SVG) */
function MiniChart({ dailyValues, amount }: { dailyValues: { date: string; value: number }[]; amount: number }) {
  const w = 280;
  const h = 80;
  const padding = 2;

  const values = dailyValues.map((d) => d.value);
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;

  const points = values.map((v, i) => {
    const x = padding + (i / (values.length - 1)) * (w - padding * 2);
    const y = h - padding - ((v - min) / range) * (h - padding * 2);
    return `${x},${y}`;
  }).join(' ');

  // 기준선 (투자 원금)
  const baseY = h - padding - ((amount - min) / range) * (h - padding * 2);
  const lastValue = values[values.length - 1];
  const isPositive = lastValue >= amount;

  return (
    <div className="rounded-md bg-muted/20 p-2">
      <svg viewBox={`0 0 ${w} ${h}`} className="w-full" preserveAspectRatio="none">
        {/* 기준선 */}
        <line x1={padding} y1={baseY} x2={w - padding} y2={baseY} stroke="currentColor" strokeOpacity={0.15} strokeDasharray="4 2" />
        {/* 라인 */}
        <polyline
          fill="none"
          stroke={isPositive ? '#10b981' : '#ef4444'}
          strokeWidth={1.5}
          points={points}
        />
      </svg>
    </div>
  );
}
