'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import { useQuery, useInfiniteQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { useCanvasStore } from '@/lib/store';
import { Input } from '@/components/ui/input';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { PriceChart } from '@/components/price-chart';
import {
  ChevronUp, ChevronDown, BarChart3, Globe, Crosshair,
  FileText, Gem, ArrowUpDown, Blend, Zap, Sparkles, X,
} from 'lucide-react';
import type { ETFSummary, ETFSortBy } from '@etf-canvas/shared';

const CATEGORY_STYLES: Record<string, { active: string; icon: string }> = {
  '국내 대표지수': { active: 'border-blue-400 bg-blue-50 text-blue-800 dark:bg-blue-950/40 dark:text-blue-200', icon: 'text-blue-400' },
  '해외 대표지수': { active: 'border-sky-400 bg-sky-50 text-sky-800 dark:bg-sky-950/40 dark:text-sky-200', icon: 'text-sky-400' },
  '섹터/테마': { active: 'border-violet-400 bg-violet-50 text-violet-800 dark:bg-violet-950/40 dark:text-violet-200', icon: 'text-violet-400' },
  '채권': { active: 'border-emerald-400 bg-emerald-50 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-200', icon: 'text-emerald-400' },
  '원자재': { active: 'border-amber-400 bg-amber-50 text-amber-800 dark:bg-amber-950/40 dark:text-amber-200', icon: 'text-amber-400' },
  '레버리지/인버스': { active: 'border-red-400 bg-red-50 text-red-800 dark:bg-red-950/40 dark:text-red-200', icon: 'text-red-400' },
  '혼합': { active: 'border-teal-400 bg-teal-50 text-teal-800 dark:bg-teal-950/40 dark:text-teal-200', icon: 'text-teal-400' },
  '액티브': { active: 'border-purple-400 bg-purple-50 text-purple-800 dark:bg-purple-950/40 dark:text-purple-200', icon: 'text-purple-400' },
  'New': { active: 'border-pink-400 bg-pink-50 text-pink-800 dark:bg-pink-950/40 dark:text-pink-200', icon: 'text-pink-400' },
};

const categories = [
  { key: '국내 대표지수', label: '국내\n대표지수', icon: <BarChart3 className="w-4 h-4" />, tip: { desc: '국내 시장을 대표하는 지수를 추종해요', examples: 'KOSPI 200, KOSDAQ 150, KRX 300', risk: '중간', style: '장기 투자' } },
  { key: '해외 대표지수', label: '해외\n대표지수', icon: <Globe className="w-4 h-4" />, tip: { desc: '글로벌 주요 지수를 원화로 투자해요', examples: 'S&P 500, 나스닥 100, 니케이 225', risk: '중간', style: '글로벌 분산' } },
  { key: '섹터/테마', label: '섹터/테마', icon: <Crosshair className="w-4 h-4" />, tip: { desc: '특정 산업이나 투자 테마에 집중해요', examples: '반도체, AI, 2차전지, 바이오', risk: '높음', style: '성장 투자' } },
  { key: '채권', label: '채권', icon: <FileText className="w-4 h-4" />, tip: { desc: '채권에 투자해 안정적인 이자 수익을 추구해요', examples: '국채, 회사채, 금융채, 물가채', risk: '낮음', style: '안정 수익' } },
  { key: '원자재', label: '원자재', icon: <Gem className="w-4 h-4" />, tip: { desc: '실물 원자재 가격을 추종해요', examples: '금, 은, 원유, 구리', risk: '높음', style: '인플레이션 헤지' } },
  { key: '레버리지/인버스', label: '레버리지&\n인버스', icon: <ArrowUpDown className="w-4 h-4" />, tip: { desc: '지수의 2배 또는 반대 방향 수익을 추구해요', examples: 'KODEX 레버리지, KODEX 인버스', risk: '매우 높음', style: '단기 트레이딩' } },
  { key: '혼합', label: '혼합', icon: <Blend className="w-4 h-4" />, tip: { desc: '주식+채권 등 여러 자산을 하나에 담아요', examples: 'TDF, 자산배분형, 멀티에셋', risk: '중·낮음', style: '자동 분산' } },
  { key: '액티브', label: '액티브', icon: <Zap className="w-4 h-4" />, tip: { desc: '펀드매니저가 종목을 적극 선별·운용해요', examples: '성장주 액티브, 배당 액티브, AI 액티브', risk: '중·높음', style: '초과 수익 추구' } },
  { key: 'New', label: 'New', icon: <Sparkles className="w-4 h-4" />, tip: { desc: '최근 2개월 이내 신규 상장된 ETF예요', examples: '새로운 트렌드와 테마를 빠르게 확인해요', risk: '-', style: '신규 상장' } },
];

export function LeftPanel() {
  const [query, setQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [category, setCategory] = useState('국내 대표지수');
  const [sortBy, setSortBy] = useState<ETFSortBy>('aum');
  const [catOpen, setCatOpen] = useState(true);
  const [infoCat, setInfoCat] = useState<string | null>('국내 대표지수');
  const { selectedEtfCode, selectEtf, selected: canvasEtfs, addToCanvas, addLoadingCode, removeLoadingCode, updateEtfData, browseCategory, setBrowseCategory } = useCanvasStore();

  useEffect(() => {
    if (browseCategory) {
      setCategory(browseCategory);
      setInfoCat(browseCategory);
      setBrowseCategory(null);
    }
  }, [browseCategory, setBrowseCategory]);

  const { data: countData } = useQuery({
    queryKey: ['etf-count', debouncedQuery, category || undefined],
    queryFn: () => api.count(debouncedQuery || undefined, category || undefined),
  });

  const handleAddToCanvas = useCallback(async (etf: ETFSummary) => {
    addToCanvas(etf);
    if (etf.expenseRatio == null) {
      addLoadingCode(etf.code);
      try {
        const detail = await api.getDetail(etf.code);
        updateEtfData(etf.code, { expenseRatio: detail.expenseRatio });
      } finally {
        removeLoadingCode(etf.code);
      }
    }
  }, [addToCanvas, addLoadingCode, removeLoadingCode, updateEtfData]);

  // Debounced search — 검색 시 카테고리 해제하고 전체에서 검색
  const handleQueryChange = useCallback((value: string) => {
    setQuery(value);
    if (value) setCategory('');
    const timer = setTimeout(() => setDebouncedQuery(value.replace(/\s+/g, '')), 300);
    return () => clearTimeout(timer);
  }, []);

  const PAGE_SIZE = 30;
  const {
    data: etfPages,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useInfiniteQuery({
    queryKey: ['etf-search', debouncedQuery, category || undefined, sortBy],
    queryFn: ({ pageParam = 0 }) =>
      debouncedQuery
        ? api.search(debouncedQuery, category || undefined, sortBy, pageParam, PAGE_SIZE)
        : api.list(category || undefined, sortBy, pageParam, PAGE_SIZE),
    initialPageParam: 0,
    getNextPageParam: (lastPage, allPages) =>
      lastPage.length < PAGE_SIZE ? undefined : allPages.length * PAGE_SIZE,
  });

  const etfs = (() => {
    const all = etfPages?.pages.flat();
    if (!all) return undefined;
    const seen = new Set<string>();
    return all.filter(e => { if (seen.has(e.code)) return false; seen.add(e.code); return true; });
  })();

  // 무한스크롤 감지
  const listRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = listRef.current;
    if (!el) return;
    const onScroll = () => {
      if (el.scrollTop + el.clientHeight >= el.scrollHeight - 100 && hasNextPage && !isFetchingNextPage) {
        fetchNextPage();
      }
    };
    el.addEventListener('scroll', onScroll);
    return () => el.removeEventListener('scroll', onScroll);
  }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

  // 첫 번째 종목 자동 선택
  useEffect(() => {
    if (etfs && etfs.length > 0 && !selectedEtfCode) {
      selectEtf(etfs[0].code);
    }
  }, [etfs, selectedEtfCode, selectEtf]);

  const selectedEtf = etfs?.find(e => e.code === selectedEtfCode);
  const chartPeriod = sortBy === 'returnRate3m' ? '3m'
    : sortBy === 'returnRate1y' ? '1y'
    : selectedEtf?.oneYearEarnRate != null ? '1y' : '3m';
  const { data: selectedPrices } = useQuery({
    queryKey: ['etf-mini-prices', selectedEtfCode, chartPeriod],
    queryFn: () => api.getDailyPrices(selectedEtfCode!, chartPeriod),
    enabled: !!selectedEtfCode,
  });

  const { data: selectedDetail } = useQuery({
    queryKey: ['etf-detail', selectedEtfCode],
    queryFn: () => api.getDetail(selectedEtfCode!),
    enabled: !!selectedEtfCode,
  });

  return (
    <div className="w-80 border-r flex flex-col h-full shrink-0 bg-background">
      {/* Header */}
      <div className="px-3 pt-3 pb-2">
        <h2 className="text-lg font-bold mb-2">
          ETF Canvas
          {countData?.total != null && (
            <span className="text-sm font-normal text-muted-foreground ml-1.5">({countData.total.toLocaleString()})</span>
          )}
        </h2>
        <div className="relative">
          <Input
            placeholder="검색"
            value={query}
            onChange={(e) => handleQueryChange(e.target.value)}
            className="h-8 text-sm pr-7"
          />
          {query && (
            <button
              onClick={() => handleQueryChange('')}
              className="absolute right-1.5 top-1/2 -translate-y-1/2 p-0.5 rounded hover:bg-muted text-muted-foreground/50 hover:text-muted-foreground transition-colors"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Categories */}
      <div className="px-3 py-2 border-b">
        <button
          onClick={() => setCatOpen(!catOpen)}
          className="flex items-center justify-between w-full text-sm font-bold text-foreground"
        >
          ETF 카테고리
          {catOpen ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
        </button>
        {catOpen && (
          <div>
            <div className="grid grid-cols-3 gap-1.5 mt-2">
              {categories.map((cat) => (
                <button
                  key={cat.key}
                  onClick={() => { setCategory(category === cat.key ? '' : cat.key); setInfoCat(cat.key); }}
                  className={`flex items-center justify-between gap-1 px-2.5 h-[48px] rounded-lg border text-[11px] leading-tight transition-colors ${
                    category === cat.key
                      ? `${CATEGORY_STYLES[cat.key]?.active || 'border-blue-500 bg-blue-50 text-blue-900'} font-bold`
                      : 'border-border hover:bg-accent text-muted-foreground'
                  }`}
                >
                  <span className="flex-1 min-w-0 text-left whitespace-pre-wrap">{cat.label}</span>
                  <span className={`shrink-0 transition-opacity ${category === cat.key ? `${CATEGORY_STYLES[cat.key]?.icon || 'text-blue-400'} opacity-70` : 'opacity-20'}`}>{cat.icon}</span>
                </button>
              ))}
            </div>
            {(() => {
              const cat = categories.find((c) => c.key === infoCat);
              if (!cat) return null;
              const riskChip =
                cat.tip.risk === '매우 높음' ? 'bg-red-500/15 text-red-400 border-red-500/30' :
                cat.tip.risk === '높음' ? 'bg-orange-500/15 text-orange-400 border-orange-500/30' :
                cat.tip.risk === '중·높음' ? 'bg-amber-500/15 text-amber-400 border-amber-500/30' :
                cat.tip.risk === '중간' ? 'bg-yellow-500/15 text-yellow-400 border-yellow-500/30' :
                cat.tip.risk === '중·낮음' ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30' :
                cat.tip.risk === '낮음' ? 'bg-green-500/15 text-green-400 border-green-500/30' : '';
              return (
                <div className="mt-2 px-2.5 py-2 rounded-lg bg-muted/40 border border-border/50 text-[11px] animate-in fade-in-0 duration-150">
                  <p className="font-bold text-xs mb-1">{cat.key}</p>
                  <p className="text-muted-foreground leading-relaxed mb-1.5">{cat.tip.desc}</p>
                  <div className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 items-center">
                    <span className="opacity-60">대표</span><span>{cat.tip.examples}</span>
                    {cat.tip.risk !== '-' && <span className="opacity-60">위험도</span>}
                    {cat.tip.risk !== '-' && <span className={`inline-block w-fit px-2 py-0.5 rounded-full border font-medium text-[10px] ${riskChip}`}>{cat.tip.risk}</span>}
                    <span className="opacity-60">스타일</span><span>{cat.tip.style}</span>
                  </div>
                </div>
              );
            })()}
          </div>
        )}
      </div>

      {/* ETF List */}
      <div className="px-3 py-2 flex items-center justify-between border-b">
        <span className="text-sm font-bold text-foreground">
          ETF
          {countData?.filtered != null && (
            <span className="text-xs font-normal text-muted-foreground ml-1">({countData.filtered.toLocaleString()})</span>
          )}
        </span>
        <SortDropdown value={sortBy} onChange={setSortBy} />
      </div>
      <div ref={listRef} className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden">
        <TooltipProvider delayDuration={300}>
          <div className="px-1 pt-1">
            {etfs?.map((etf) => (
              <EtfListItem
                key={etf.code}
                etf={etf}
                isSelected={selectedEtfCode === etf.code}
                isOnCanvas={canvasEtfs.some((e) => e.code === etf.code)}
                sortBy={sortBy}
                onSelect={() => selectEtf(etf.code)}
                onAdd={() => handleAddToCanvas(etf)}
              />
            ))}
            {isFetchingNextPage && (
              <p className="text-xs text-muted-foreground text-center py-3">불러오는 중...</p>
            )}
            {etfs?.length === 0 && (
              <div className="text-center py-8 px-4">
                <p className="text-sm text-muted-foreground">
                  {debouncedQuery
                    ? `'${debouncedQuery}'에 해당하는 ETF가 없어요`
                    : category === 'New'
                      ? '최근 2개월 내 신규 상장된 ETF가 없어요'
                      : '조건에 맞는 ETF가 없어요'}
                </p>
                <p className="text-[11px] text-muted-foreground/60 mt-1">
                  {debouncedQuery ? '다른 키워드로 검색해보세요' : '다른 카테고리를 선택해보세요'}
                </p>
              </div>
            )}
          </div>
        </TooltipProvider>
      </div>

      {/* Mini Chart / Return Rate */}
      {selectedEtfCode && selectedDetail && (() => {
        const selEtf = selectedEtf;
        const periodLabel = chartPeriod === '3m' ? '3M' : '1Y';
        const rate = chartPeriod === '3m'
          ? selEtf?.threeMonthEarnRate ?? null
          : selEtf?.oneYearEarnRate ?? null;
        return (
          <div className="border-t px-3 py-2">
            <p className="text-xs font-bold text-foreground leading-tight">{selectedDetail.name}</p>
            <p className="text-[10px] text-muted-foreground mt-0.5">
              {periodLabel} 수익률{' '}
              {rate !== null ? (
                <span className={`font-bold ${rate > 0 ? 'text-red-500' : rate < 0 ? 'text-blue-500' : ''}`}>
                  {rate > 0 ? '+' : ''}{rate.toFixed(1)}%
                </span>
              ) : '-'}
            </p>
            <div className="h-28 mt-1.5">
              <PriceChart data={selectedPrices || []} compact />
            </div>
          </div>
        );
      })()}

    </div>
  );
}

function EtfListItem({
  etf,
  isSelected,
  isOnCanvas,
  sortBy,
  onSelect,
  onAdd,
}: {
  etf: ETFSummary;
  isSelected: boolean;
  isOnCanvas: boolean;
  sortBy: ETFSortBy;
  onSelect: () => void;
  onAdd: () => void;
}) {
  const [hovered, setHovered] = useState(false);

  const { data: detail } = useQuery({
    queryKey: ['etf-detail', etf.code],
    queryFn: () => api.getDetail(etf.code),
    enabled: hovered && etf.expenseRatio == null,
    staleTime: Infinity,
  });

  const expenseRatio = etf.expenseRatio ?? detail?.expenseRatio ?? null;

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button
          onClick={onSelect}
          onDoubleClick={onAdd}
          onMouseEnter={() => setHovered(true)}
          draggable
          onDragStart={(e) => {
            e.dataTransfer.setData('application/etf', JSON.stringify(etf));
            e.dataTransfer.effectAllowed = 'copy';
            const ghost = document.createElement('div');
            ghost.textContent = etf.name;
            ghost.style.cssText = 'position:fixed;top:-999px;padding:6px 12px;border-radius:8px;background:#3b82f6;color:#fff;font-size:12px;font-weight:500;white-space:nowrap;box-shadow:0 4px 12px rgba(0,0,0,0.15);';
            document.body.appendChild(ghost);
            e.dataTransfer.setDragImage(ghost, ghost.offsetWidth / 2, ghost.offsetHeight / 2);
            requestAnimationFrame(() => document.body.removeChild(ghost));
          }}
          className={`w-full max-w-full flex items-center gap-1 px-2 py-1.5 rounded text-sm transition-colors overflow-hidden cursor-grab active:cursor-grabbing ${
            isOnCanvas
              ? 'text-blue-500 font-semibold'
              : isSelected
                ? 'bg-primary/10 text-primary'
                : 'hover:bg-accent'
          }`}
        >
          <span className="flex-1 min-w-0 truncate text-left">{etf.name}</span>
          {sortBy === 'aum' ? (
            <span className="text-xs shrink-0 text-right tabular-nums text-muted-foreground">
              {etf.aum ? (etf.aum >= 10000 ? `${(etf.aum / 10000).toFixed(1)}조` : `${etf.aum.toLocaleString()}억`) : '-'}
            </span>
          ) : sortBy === 'expenseRatio' ? (
            <span className="text-xs shrink-0 text-right tabular-nums text-muted-foreground">
              {expenseRatio != null ? `${(expenseRatio * 100).toFixed(3)}%` : '-'}
            </span>
          ) : (
            <ReturnRateLabel rate={
              sortBy === 'returnRate1y' ? etf.oneYearEarnRate
              : etf.threeMonthEarnRate
            } />
          )}
        </button>
      </TooltipTrigger>
      <TooltipContent side="right" className="text-xs space-y-1.5 p-3">
        <p className="font-medium text-sm">{etf.name}</p>
        <div className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1">
          <span className="opacity-60">자산</span><span>{etf.categories[0] || '-'}</span>
          <span className="opacity-60">AUM</span><span>{etf.aum ? (etf.aum >= 10000 ? `${(etf.aum / 10000).toFixed(1)}조원` : `${etf.aum.toLocaleString()}억원`) : '-'}</span>
          <span className="opacity-60">{etf.oneYearEarnRate != null ? '1년 수익률' : etf.threeMonthEarnRate != null ? '3개월 수익률' : '수익률'}</span><span className={(() => { const r = etf.oneYearEarnRate ?? etf.threeMonthEarnRate; return r != null && r > 0 ? 'text-red-400' : r != null && r < 0 ? 'text-blue-400' : ''; })()}>{(() => { const r = etf.oneYearEarnRate ?? etf.threeMonthEarnRate; return r != null ? `${r > 0 ? '+' : ''}${r.toFixed(2)}%` : '-'; })()}</span>
          <span className="opacity-60">운용사</span><span>{etf.issuer || '-'}</span>
          <span className="opacity-60">운용보수</span><span>{expenseRatio != null ? `${(expenseRatio * 100).toFixed(3)}%` : <span className="inline-block w-3 h-3 border-2 border-muted-foreground/40 border-t-muted-foreground rounded-full animate-spin" />}</span>
          <span className="opacity-60">상장일</span><span>{etf.listedDate || '-'}</span>
        </div>
        <div className="flex items-center gap-1 pt-1.5 mt-1 border-t border-background/10">
          <kbd className="text-[9px] px-1.5 py-0.5 rounded bg-sky-500/80 text-white font-mono">더블클릭</kbd>
          <span className="text-[10px] text-background/70">또는</span>
          <kbd className="text-[9px] px-1.5 py-0.5 rounded bg-sky-500/80 text-white font-mono">드래그</kbd>
          <span className="text-[10px] text-background/70">캔버스에 추가</span>
        </div>
      </TooltipContent>
    </Tooltip>
  );
}

function ReturnRateLabel({ rate }: { rate: number | null }) {
  return (
    <span className={`text-xs shrink-0 text-right tabular-nums ${
      rate != null && rate > 0 ? 'text-red-500'
      : rate != null && rate < 0 ? 'text-blue-500'
      : 'text-muted-foreground'
    }`}>
      {rate != null ? `${rate.toFixed(1)}%` : '-'}
    </span>
  );
}

const SORT_OPTIONS: { key: ETFSortBy; label: string }[] = [
  { key: 'aum', label: 'AUM 높은순' },
  { key: 'returnRate1y', label: '1Y 수익률순' },
  { key: 'returnRate3m', label: '3M 수익률순' },
  { key: 'expenseRatio', label: '운용보수 낮은순' },
];

function SortDropdown({ value, onChange }: { value: ETFSortBy; onChange: (v: ETFSortBy) => void }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const current = SORT_OPTIONS.find(o => o.key === value)!;

  useEffect(() => {
    if (!open) return;
    const close = (e: MouseEvent) => {
      if (!ref.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, [open]);

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-md border bg-background hover:bg-accent transition-colors"
      >
        <span className="font-medium">{current.label}</span>
        <ChevronDown className={`w-3 h-3 text-muted-foreground transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && (
        <div className="absolute right-0 top-full mt-1 z-50 flex flex-col rounded-lg border bg-popover shadow-lg py-1 animate-in fade-in zoom-in-95 duration-100 whitespace-nowrap">
          {SORT_OPTIONS.map(o => (
            <button
              key={o.key}
              onClick={() => { onChange(o.key); setOpen(false); }}
              className={`w-full text-left px-3 py-1.5 text-[11px] transition-colors ${
                o.key === value ? 'bg-primary/10 text-primary font-semibold' : 'hover:bg-muted text-foreground'
              }`}
            >
              {o.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
