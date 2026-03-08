import { useState } from 'react';
import { useSession } from 'next-auth/react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { useCanvasStore } from '@/lib/store';
import { Loader2, FolderOpen, Trash2, ArrowUpRight, TrendingUp, Info } from 'lucide-react';

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

export function PortfolioList() {
  const { data: session, status: sessionStatus, update: updateSession } = useSession();
  const queryClient = useQueryClient();
  const { setCurrentView, addToCanvas, clearCanvas } = useCanvasStore();
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [sort, setSort] = useState<string>('latest');
  const [selectedId, setSelectedId] = useState<string | null>(null);

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
            token={(session as any)?.accessToken}
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
    amount: 10000000,
    period: timeframe.value,
    endDate: p.createdAt, // Backtest up to the save date
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
          ? 'bg-card border-primary/30 shadow-lg ring-1 ring-primary/10'
          : 'bg-card/50 border-border/40 hover:border-border/60 hover:shadow-sm'
        }`
      }
    >
      {/* Header */}
      <div className="px-4 pt-4 pb-3">
        <div className="flex items-center justify-between gap-2">
          <h3 className={`font-bold text-[14px] truncate transition-colors ${isActive ? 'text-foreground' : 'text-foreground/80 group-hover:text-foreground'}`}>
            {p.name}
          </h3>
          <span className="text-[10px] text-muted-foreground/60 shrink-0 tabular-nums">
            {p.items.length}종목
          </span>
        </div>
        <p className="text-[11px] text-muted-foreground/50 mt-0.5 tabular-nums">
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
                  : 'text-muted-foreground/60 hover:text-muted-foreground'
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
                <div className="text-[9px] text-muted-foreground/50 font-medium uppercase tracking-wider">수익률</div>
                <div className={`text-[14px] font-bold tabular-nums tracking-tight mt-0.5 ${isPositive ? 'text-emerald-500' : 'text-red-500'}`}>
                  {simData.totalReturn >= 0 ? '+' : ''}{simData.totalReturn.toFixed(1)}%
                </div>
              </div>
              <div>
                <div className="text-[9px] text-muted-foreground/50 font-medium uppercase tracking-wider">연환산</div>
                <div className={`text-[14px] font-bold tabular-nums tracking-tight mt-0.5 ${simData.annualizedReturn >= 0 ? 'text-emerald-500' : 'text-red-500'}`}>
                  {simData.annualizedReturn >= 0 ? '+' : ''}{simData.annualizedReturn.toFixed(1)}%
                </div>
              </div>
              <div>
                <div className="text-[9px] text-muted-foreground/50 font-medium uppercase tracking-wider">MDD</div>
                <div className="text-[14px] font-bold tabular-nums tracking-tight mt-0.5 text-foreground/70">
                  {simData.maxDrawdown.toFixed(1)}%
                </div>
              </div>
              <div>
                <div className="text-[9px] text-muted-foreground/50 font-medium uppercase tracking-wider">변동성</div>
                <div className="text-[14px] font-bold tabular-nums tracking-tight mt-0.5 text-foreground/70">
                  {volatility != null ? `${volatility.toFixed(1)}%` : '-'}
                </div>
              </div>
            </div>
            <p className="text-[9px] text-muted-foreground/40 mt-2">
              저장일 기준 과거 백테스트
            </p>
          </>
        ) : (
          <div className="text-[11px] text-muted-foreground/40 text-center py-1">데이터 없음</div>
        )}
      </div>
    </div>
  );
}

function PortfolioDetailPanel({ portfolio: p, token, onLoad, onDelete, deleting }: {
  portfolio: Portfolio; token: string; onLoad: () => void; onDelete: () => void; deleting: boolean;
}) {
  return (
    <div className="p-6 md:p-8 lg:p-10 max-w-5xl mx-auto w-full flex flex-col gap-8 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-10">
      {/* Header Info */}
      <div className="flex items-start justify-between border-b pb-4 shrink-0">
        <div>
          <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight text-foreground">{p.name}</h1>
          <p className="text-sm text-muted-foreground mt-2 flex items-center gap-2 font-medium">
            저장일: {new Date(p.createdAt).toLocaleDateString('ko-KR', { year: 'numeric', month: 'long', day: 'numeric' })}
            <span className="inline-block w-1.5 h-1.5 rounded-full bg-muted-foreground/30" />
            {p.items.length}개 종목 구성
          </p>
        </div>
        <button
          onClick={onDelete}
          disabled={deleting}
          className="p-2.5 -mr-2.5 text-muted-foreground/40 hover:text-destructive hover:bg-destructive/10 rounded-xl transition-colors"
          title="포트폴리오 삭제"
        >
          {deleting ? <Loader2 className="w-5 h-5 animate-spin" /> : <Trash2 className="w-5 h-5" />}
        </button>
      </div>

      {/* Main Stats (Since Save & Snapshot) */}
      <div className="flex flex-col gap-6 shrink-0">
        {/* Dynamic / Simulated Return Section */}
        <SinceStatsHero portfolioId={p.id} token={token} saveDate={p.createdAt} />
        
        {/* Snapshot / Static Stats Tiles */}
        <SnapshotTiles snapshot={p.snapshot} />
      </div>

      {/* Holdings Section */}
      <div className="bg-card rounded-2xl border border-border/50 shadow-sm overflow-hidden shrink-0">
        <div className="p-5 border-b border-border/30 bg-muted/10">
          <h3 className="text-base font-bold text-foreground/90">구성 종목</h3>
        </div>
        <div className="divide-y divide-border/20 max-h-[400px] overflow-auto">
          {p.items.map((item, idx) => (
            <div key={item.code} className="flex items-center justify-between p-4 px-5 hover:bg-muted/5 transition-colors">
              <div className="flex items-center gap-4">
                <div className="w-7 h-7 rounded-full bg-foreground/5 flex items-center justify-center text-foreground/70 font-semibold text-xs shrink-0 ring-1 ring-border/50">
                  {idx + 1}
                </div>
                <div>
                  <p className="text-[14px] font-bold text-foreground/90">{item.name}</p>
                  <p className="text-[11px] text-muted-foreground/70 font-medium mt-0.5">{item.category || '기타'}</p>
                </div>
              </div>
              <div className="text-right pl-4">
                <span className="text-base font-bold tabular-nums tracking-tight">{item.weight}%</span>
              </div>
            </div>
          ))}
        </div>
      </div>

    </div>
  );
}

function SinceStatsHero({ portfolioId, token, saveDate }: { portfolioId: string; token: string; saveDate: string }) {
  const isSavedToday = new Date(saveDate).toDateString() === new Date().toDateString();
  const hasTradeDay = (() => {
    if (isSavedToday) return false;
    const start = new Date(saveDate);
    start.setDate(start.getDate() + 1);
    const end = new Date();
    for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
      const day = d.getDay();
      if (day !== 0 && day !== 6) return true;
    }
    return false;
  })();

  const { data, isLoading } = useQuery({
    queryKey: ['portfolio-since', portfolioId],
    queryFn: () => api.getPortfolioSince(token, portfolioId),
    enabled: !!token && hasTradeDay,
    staleTime: 1000 * 60 * 60,
  });

  if (isSavedToday || !hasTradeDay || !data || data.daysSinceSave < 1 || (data as any).message === 'no_trading_days') {
    return (
      <div className="bg-gradient-to-br from-card to-muted/20 border border-border/40 rounded-3xl p-8 flex flex-col items-center justify-center text-center min-h-[220px]">
        <Info className="w-10 h-10 text-muted-foreground/30 mb-4" />
        <h3 className="text-[17px] font-bold text-foreground/80 mb-1.5">실전 시뮬레이션 대기 중</h3>
        <p className="text-[13px] text-muted-foreground/80 max-w-md leading-relaxed">
          저장했던 날의 구성 비중대로 매수했다고 가정할 때, 저장일 기준 첫 거래일이 지나면 어떻게 변했을지 시뮬레이션 결과를 이곳에서 확인해 볼 수 있어요.
        </p>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="bg-card border border-border/40 rounded-3xl p-8 flex items-center justify-center min-h-[220px]">
         <Loader2 className="w-8 h-8 animate-spin text-muted-foreground/40" />
      </div>
    );
  }

  const ret = data.totalReturn;
  const amount = 10_000_000;
  const finalValue = Math.round(amount * (1 + ret / 100));
  const isPositive = ret >= 0;

  return (
    <div className={`relative overflow-hidden rounded-3xl border p-7 md:p-9 transition-all ${isPositive ? 'bg-emerald-500/5 border-emerald-500/20' : 'bg-red-500/5 border-red-500/20'}`}>
      
      {/* Decorative gradient blob */}
      <div className={`absolute top-0 right-0 -mr-16 -mt-16 w-56 h-56 rounded-full blur-[70px] opacity-30 ${isPositive ? 'bg-emerald-500' : 'bg-red-500'}`} style={{ pointerEvents: 'none' }} />

      <div className="relative z-10 flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
          <p className="text-[13px] font-bold text-muted-foreground mb-2 flex items-center gap-2">
            저장 후 <span className="bg-background px-2.5 py-0.5 rounded-full text-foreground shadow-sm ring-1 ring-border/50">{data.daysSinceSave}일</span> 경과
          </p>
          <div className="flex items-baseline gap-2">
            <span className={`text-5xl md:text-6xl font-black tracking-tighter tabular-nums ${isPositive ? 'text-emerald-500' : 'text-red-500'}`}>
              {isPositive ? '+' : ''}{ret.toFixed(2)}%
            </span>
          </div>
          <p className="text-[15px] font-medium text-foreground/80 mt-4 leading-relaxed">
            저장 당시에 구성한 비중대로 <strong className="text-foreground">1,000만원</strong>을 매수했다고 가정한다면,<br />
            현재 평가금액은 <strong className={`font-bold tabular-nums ${isPositive ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'}`}>{finalValue.toLocaleString()}원</strong>이에요.
          </p>
        </div>

        {/* Hero Sparkline Chart directly beside/below stats */}
        <div className="w-full md:w-[320px] shrink-0 mt-4 md:mt-0">
          <div className="flex items-center gap-4 mb-3 justify-end">
            <div className="text-right">
              <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-0.5">연환산</p>
              <p className={`text-lg font-bold tabular-nums leading-none ${data.annualizedReturn >= 0 ? 'text-emerald-500' : 'text-red-500'}`}>
                {data.annualizedReturn >= 0 ? '+' : ''}{data.annualizedReturn.toFixed(1)}%
              </p>
            </div>
            <div className="w-px h-8 bg-border/50" />
            <div className="text-right">
              <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-0.5">최대 낙폭</p>
              <p className="text-lg font-bold tabular-nums leading-none text-red-500">
                -{data.maxDrawdown.toFixed(1)}%
              </p>
            </div>
          </div>
          
          {data.dailyValues?.length > 1 && (
            <div className="h-[80px] w-full mt-2">
              <HeroChart dailyValues={data.dailyValues} isPositive={isPositive} />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function HeroChart({ dailyValues, isPositive }: { dailyValues: { date: string; value: number }[]; isPositive: boolean }) {
  const w = 400; // arbitrary internal coordinate width for cleaner drawing
  const h = 100;
  const p = 5;

  const values = dailyValues.map((d) => d.value);
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;
  const firstVal = values[0];

  const pointsArr = values.map((v, i) => {
    const x = p + (i / (values.length - 1)) * (w - p * 2);
    const y = h - p - ((v - min) / range) * (h - p * 2);
    return { x, y };
  });

  const points = pointsArr.map(pt => `${pt.x},${pt.y}`).join(' ');
  const areaPoints = `${pointsArr[0].x},${h} ${points} ${pointsArr[pointsArr.length-1].x},${h}`;
  
  const baseY = h - p - ((firstVal - min) / range) * (h - p * 2);
  const strokeColor = isPositive ? '#10b981' : '#ef4444';

  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="w-full h-full overflow-visible" preserveAspectRatio="none">
      <defs>
        <linearGradient id={`gradient-${isPositive ? 'pos' : 'neg'}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={strokeColor} stopOpacity={0.2} />
          <stop offset="100%" stopColor={strokeColor} stopOpacity={0.0} />
        </linearGradient>
      </defs>
      
      {/* Baseline */}
      <line x1={0} y1={baseY} x2={w} y2={baseY} stroke="currentColor" strokeOpacity={0.15} strokeDasharray="4 4" strokeWidth={2} />
      
      {/* Area */}
      <polygon fill={`url(#gradient-${isPositive ? 'pos' : 'neg'})`} points={areaPoints} />
      
      {/* Line */}
      <polyline
        fill="none"
        stroke={strokeColor}
        strokeWidth={4}
        strokeLinecap="round"
        strokeLinejoin="round"
        points={points}
      />
      
      {/* End Point */}
      <circle cx={pointsArr[pointsArr.length-1].x} cy={pointsArr[pointsArr.length-1].y} r={6} fill="var(--background)" stroke={strokeColor} strokeWidth={3} />
    </svg>
  );
}

function SnapshotTiles({ snapshot }: { snapshot: Snapshot | null }) {
  if (!snapshot?.periods || Object.keys(snapshot.periods).length === 0) return null;

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
      {(['3m', '6m', '1y'] as const).map((period) => {
        const data = snapshot.periods[period];
        if (!data) return null;
        const ret = data.totalReturn;
        const labelMap = { '3m': '3개월 수익', '6m': '6개월 수익', '1y': '1년 수익' };
        return (
          <div key={period} className="bg-card border border-border/50 rounded-2xl p-4 shadow-sm hover:border-border transition-colors">
            <p className="text-[11px] font-bold text-muted-foreground/80 mb-1.5 uppercase tracking-wide">{labelMap[period]}</p>
            <p className={`text-xl font-black tabular-nums tracking-tight ${ret >= 0 ? 'text-emerald-500' : 'text-red-500'}`}>
              {ret >= 0 ? '+' : ''}{ret.toFixed(1)}%
            </p>
          </div>
        );
      })}
      
      {snapshot.periods['1y'] && (
        <div className="bg-card border border-border/50 rounded-2xl p-4 shadow-sm hover:border-border transition-colors">
          <p className="text-[11px] font-bold text-muted-foreground/80 mb-1.5 uppercase tracking-wide">1년 변동성</p>
          <p className="text-xl font-black tabular-nums tracking-tight text-amber-500">
            {snapshot.avgVolatility.toFixed(1)}%
          </p>
        </div>
      )}
    </div>
  );
}
