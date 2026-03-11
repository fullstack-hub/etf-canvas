import { useState } from 'react';
import { useSession } from 'next-auth/react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { useCanvasStore } from '@/lib/store';
import { useReturnColors } from '@/lib/return-colors';
import { SnapshotSection } from '@/components/snapshot-section';
import { SinceStatsHero } from '@/components/since-stats-hero';
import { HoldingsSection } from '@/components/holdings-section';
import { FeedbackSection } from '@/components/feedback-section';
import { DividendSection } from '@/components/dividend-section';
import { Loader2, FolderOpen, Trash2, TrendingUp, Pencil, Check, X } from 'lucide-react';

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
  totalAmount: number;
  feedbackText: string | null;
  feedbackActions: { category: string; label: string }[] | null;
  tags?: string[];
  createdAt: string;
};

const SORT_OPTIONS = [
  { value: 'latest', label: '최신순' },
  { value: 'return', label: '수익률순' },
  { value: 'mdd', label: 'MDD순' },
] as const;

export function PortfolioList() {
  const { data: session, status: sessionStatus } = useSession();
  const queryClient = useQueryClient();
  const { setCurrentView, addToCanvas, clearCanvas } = useCanvasStore();
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [sort, setSort] = useState<string>('latest');
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const { data: portfolios, isLoading } = useQuery({
    queryKey: ['portfolios', sort],
    queryFn: () => api.listPortfolios(sort === 'latest' ? undefined : sort),
    enabled: !!session,
  });

  const handleDelete = async (id: string) => {
    setDeletingId(id);
    try {
      await api.deletePortfolio(id);
      queryClient.invalidateQueries({ queryKey: ['portfolios'] });
      if (selectedId === id) setSelectedId(null);
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

  const selectedPortfolio = portfolios?.find(p => p.id === selectedId) || null;

  return (
    <div className="flex-1 flex flex-col md:flex-row overflow-hidden bg-background max-h-[calc(100vh-64px)]">
      {/* Left Panel: Master List */}
      <div className="w-full md:w-[350px] lg:w-[400px] flex flex-col border-r border-border/50 h-full shrink-0">
        <div className="p-5 pb-4 border-b border-border/30 bg-card/30 backdrop-blur-sm z-10 sticky top-0">
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-lg font-bold tracking-tight">포트폴리오 보관함</h2>
            <div className="flex items-center gap-1 bg-muted/50 rounded-lg p-1">
              {SORT_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => setSort(opt.value)}
                  className={`px-2.5 py-1.5 rounded-md text-[11px] font-semibold transition-all duration-200 ${
                    sort === opt.value
                      ? 'bg-background text-foreground shadow-sm ring-1 ring-border/50'
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="flex-1 overflow-auto p-4 space-y-3">
          {(!portfolios || portfolios.length === 0) ? (
            <div className="flex flex-col items-center justify-center h-48 text-center text-muted-foreground rounded-2xl border border-dashed border-border/60 bg-muted/10">
              <FolderOpen className="w-10 h-10 opacity-20 mb-3 text-primary" />
              <h3 className="text-[14px] font-semibold text-foreground/80 mb-1">저장된 포트폴리오가 없어요</h3>
              <p className="text-[12px] text-muted-foreground/70">마음에 드는 조합을 저장해 보세요.</p>
            </div>
          ) : (
            portfolios.map((p) => (
              <PortfolioListItem
                key={p.id}
                portfolio={p}
                isActive={selectedId === p.id}
                onClick={() => setSelectedId(p.id)}
              />
            ))
          )}
        </div>
      </div>

      {/* Right Panel: Detail View */}
      <div className="flex-1 flex flex-col h-full bg-muted/5 sm:bg-transparent overflow-auto relative">
        {!selectedPortfolio ? (
          <div className="hidden md:flex flex-col items-center justify-center h-full text-center p-8 opacity-60">
            <div className="w-24 h-24 mb-6 rounded-full bg-gradient-to-br from-primary/10 to-transparent flex items-center justify-center border border-primary/10">
              <TrendingUp className="w-10 h-10 text-primary/40" />
            </div>
            <h3 className="text-xl font-bold text-foreground/80 mb-2">포트폴리오 선택</h3>
            <p className="text-base text-muted-foreground max-w-[280px]">
              좌측 목록에서 포트폴리오를 선택하여 상세 성과를 확인해 보세요.
            </p>
          </div>
        ) : (
          <PortfolioDetailPanel
            portfolio={selectedPortfolio}
            onLoad={() => handleLoad(selectedPortfolio)}
            onDelete={() => handleDelete(selectedPortfolio.id)}
            deleting={deletingId === selectedPortfolio.id}
          />
        )}
      </div>
    </div>
  );
}

function PortfolioListItem({ portfolio: p, isActive, onClick }: { portfolio: Portfolio; isActive: boolean; onClick: () => void }) {
  const rc = useReturnColors();
  const timeframes = [
    { label: '1M', value: '1m' },
    { label: '3M', value: '3m' },
    { label: '6M', value: '6m' },
    { label: '1Y', value: '1y' },
    { label: '3Y', value: '3y' },
  ];
  const [timeframe, setTimeframe] = useState(timeframes[3]); // Default 1Y

  const simulateReq = {
    codes: p.items.map(i => i.code),
    weights: p.items.map(i => i.weight),
    amount: Number(p.totalAmount) || 100000000,
    period: timeframe.value,
    endDate: p.createdAt,
  };

  const { data: simData, isLoading } = useQuery({
    queryKey: ['etf-simulate-historical', simulateReq],
    queryFn: () => api.simulate(simulateReq),
    staleTime: 1000 * 60 * 60,
  });

  const ret = simData ? simData.totalReturn : (timeframe.value === '1y' && p.returnRate != null ? Number(p.returnRate) : null);

  // 일별 수익률 표준편차 → 연환산 변동성 (PerformancePanel과 동일 로직)
  const volatility = (() => {
    const dv = simData?.dailyValues;
    if (!dv || dv.length < 2) return null;
    const dailyReturns: number[] = [];
    for (let i = 1; i < dv.length; i++) {
      dailyReturns.push((dv[i].value - dv[i - 1].value) / dv[i - 1].value);
    }
    const mean = dailyReturns.reduce((a, b) => a + b, 0) / dailyReturns.length;
    const variance = dailyReturns.reduce((sum, r) => sum + (r - mean) ** 2, 0) / (dailyReturns.length - 1);
    return Math.round(Math.sqrt(variance) * Math.sqrt(252) * 10000) / 100;
  })();

  const isPositive = simData ? simData.totalReturn >= 0 : (ret != null ? ret >= 0 : true);

  return (
    <div
      onClick={onClick}
      className={`relative group rounded-xl border transition-all duration-200 cursor-pointer overflow-hidden
        ${isActive
          ? 'bg-card border-border shadow-lg shadow-black/20 ring-1 ring-primary/15'
          : 'bg-card/70 border-border/50 hover:border-border hover:bg-card hover:shadow-md hover:shadow-black/10'
        }`
      }
    >
      {/* Header */}
      <div className="px-4 pt-4 pb-3">
        <div className="flex items-center justify-between gap-2">
          <h3 className={`font-bold text-[14px] truncate transition-colors ${isActive ? 'text-foreground' : 'text-foreground/80 group-hover:text-foreground'}`}>
            {p.name}
          </h3>
          <span className="text-[10px] text-muted-foreground shrink-0 tabular-nums">
            {p.items.length}종목
          </span>
        </div>
        <p className="text-[11px] text-muted-foreground/80 mt-0.5 tabular-nums">
          {new Date(p.createdAt).toLocaleDateString('ko-KR', { year: 'numeric', month: 'short', day: 'numeric' })} 저장
        </p>
      </div>

      {/* Period selector */}
      <div className="px-4 pb-3" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center gap-0.5 bg-muted/30 rounded-md p-0.5">
          {timeframes.map(tf => (
            <button
              key={tf.value}
              className={`flex-1 py-1 text-[10px] font-semibold rounded transition-all ${
                timeframe.value === tf.value
                  ? 'bg-background text-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-muted-foreground'
              }`}
              onClick={(e) => {
                e.stopPropagation();
                setTimeframe(tf);
              }}
            >
              {tf.label}
            </button>
          ))}
        </div>
      </div>

      {/* Stats */}
      <div className={`px-4 py-3 border-t transition-colors ${isActive ? 'bg-muted/10 border-border/30' : 'bg-muted/5 border-border/20'}`}>
        {isLoading ? (
          <div className="flex items-center justify-center py-1">
            <Loader2 className="w-4 h-4 animate-spin text-muted-foreground/30" />
          </div>
        ) : simData ? (
          <>
            <div className="grid grid-cols-4 gap-3">
              <div>
                <div className="text-[9px] text-muted-foreground font-medium uppercase tracking-wider">수익률</div>
                <div className={`text-[14px] font-bold tabular-nums tracking-tight mt-0.5 ${rc.cls(isPositive)}`}>
                  {simData.totalReturn >= 0 ? '+' : ''}{simData.totalReturn.toFixed(1)}%
                </div>
              </div>
              <div>
                <div className="text-[9px] text-muted-foreground font-medium uppercase tracking-wider">연환산</div>
                <div className={`text-[14px] font-bold tabular-nums tracking-tight mt-0.5 ${rc.cls(simData.annualizedReturn >= 0)}`}>
                  {simData.annualizedReturn >= 0 ? '+' : ''}{simData.annualizedReturn.toFixed(1)}%
                </div>
              </div>
              <div>
                <div className="text-[9px] text-muted-foreground font-medium uppercase tracking-wider">MDD</div>
                <div className="text-[14px] font-bold tabular-nums tracking-tight mt-0.5 text-foreground/90">
                  {simData.maxDrawdown.toFixed(1)}%
                </div>
              </div>
              <div>
                <div className="text-[9px] text-muted-foreground font-medium uppercase tracking-wider">변동성</div>
                <div className="text-[14px] font-bold tabular-nums tracking-tight mt-0.5 text-foreground/90">
                  {volatility != null ? `${volatility.toFixed(1)}%` : '-'}
                </div>
              </div>
            </div>
            <p className="text-[10px] text-muted-foreground mt-2">
              저장일 기준 과거 백테스트
            </p>
          </>
        ) : (
          <div className="text-[11px] text-muted-foreground/70 text-center py-1">데이터 없음</div>
        )}
      </div>
    </div>
  );
}

function PortfolioDetailPanel({ portfolio: p, onLoad, onDelete, deleting }: {
  portfolio: Portfolio; onLoad: () => void; onDelete: () => void; deleting: boolean;
}) {
  const queryClient = useQueryClient();
  const [editing, setEditing] = useState(false);
  const [editName, setEditName] = useState(p.name);
  const [saving, setSaving] = useState(false);
  const [period, setPeriod] = useState('1y');

  const handleRename = async () => {
    const trimmed = editName.trim();
    if (!trimmed || trimmed === p.name) { setEditing(false); return; }
    setSaving(true);
    try {
      await api.renamePortfolio(p.id, trimmed);
      queryClient.invalidateQueries({ queryKey: ['portfolios'] });
      setEditing(false);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="p-6 md:p-8 lg:p-10 max-w-5xl mx-auto w-full flex flex-col gap-8 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-10">
      {/* Header Info */}
      <div className="flex items-start justify-between border-b pb-4 shrink-0">
        <div>
          {editing ? (
            <div className="flex items-center gap-2">
              <input
                autoFocus
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') handleRename(); if (e.key === 'Escape') setEditing(false); }}
                className="text-2xl md:text-3xl font-extrabold tracking-tight bg-transparent border-b-2 border-primary outline-none w-full min-w-0"
                maxLength={100}
              />
              <button onClick={handleRename} disabled={saving} className="p-1.5 rounded-lg hover:bg-primary/10 text-primary transition-colors" title="저장">
                {saving ? <Loader2 className="w-5 h-5 animate-spin" /> : <Check className="w-5 h-5" />}
              </button>
              <button onClick={() => { setEditing(false); setEditName(p.name); }} className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground transition-colors" title="취소">
                <X className="w-5 h-5" />
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-2 group/name">
              <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight text-foreground">{p.name}</h1>
              <button
                onClick={() => { setEditName(p.name); setEditing(true); }}
                className="p-1.5 rounded-lg opacity-0 group-hover/name:opacity-100 hover:bg-muted text-muted-foreground transition-all"
                title="이름 변경"
              >
                <Pencil className="w-4 h-4" />
              </button>
            </div>
          )}
          <p className="text-sm text-muted-foreground mt-2 flex items-center gap-2 font-medium">
            저장일: {new Date(p.createdAt).toLocaleDateString('ko-KR', { year: 'numeric', month: 'long', day: 'numeric' })}
            <span className="inline-block w-1.5 h-1.5 rounded-full bg-muted-foreground/30" />
            {p.items.length}개 종목 구성
          </p>
          {p.tags && p.tags.length > 0 && (
            <div className="flex gap-1.5 flex-wrap mt-2">
              {p.tags.map((tag) => (
                <span key={tag} className="px-2 py-0.5 rounded-md bg-muted text-[11px] text-muted-foreground">#{tag}</span>
              ))}
            </div>
          )}
        </div>
        <button
          onClick={onDelete}
          disabled={deleting}
          className="p-2.5 -mr-2.5 text-muted-foreground/70 hover:text-destructive hover:bg-destructive/10 rounded-xl transition-colors"
          title="포트폴리오 삭제"
        >
          {deleting ? <Loader2 className="w-5 h-5 animate-spin" /> : <Trash2 className="w-5 h-5" />}
        </button>
      </div>

      {/* Main Stats (Since Save & Snapshot) */}
      <div className="flex flex-col gap-6 shrink-0">
        {/* Dynamic / Simulated Return Section */}
        <SinceStatsHero
          fetchKey={['portfolio-since', p.id]}
          fetchFn={() => api.getPortfolioSince(p.id)}
          saveDate={p.createdAt}
        />
        
        {/* Snapshot / Static Stats Tiles */}
        <SnapshotSection items={p.items} period={period} onPeriodChange={setPeriod} totalAmount={Number(p.totalAmount)} />
      </div>

      {/* Feedback Section */}
      {p.feedbackText && (
        <FeedbackSection feedbackText={p.feedbackText} feedbackActions={p.feedbackActions} />
      )}

      {/* Dividend Section */}
      <DividendSection items={p.items} period={period} totalAmount={Number(p.totalAmount)} />

      {/* Holdings Section */}
      <HoldingsSection items={p.items} />

    </div>
  );
}


