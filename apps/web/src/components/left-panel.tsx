'use client';

import { useState, useCallback, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { useCanvasStore } from '@/lib/store';
import { Input } from '@/components/ui/input';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { PriceChart } from '@/components/price-chart';
import {
  ChevronUp, ChevronDown, BarChart3, Globe, Crosshair,
  FileText, Gem, ArrowUpDown, Blend, Zap, Sparkles,
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
  { key: '국내 대표지수', label: '국내\n대표지수', icon: <BarChart3 className="w-4 h-4" /> },
  { key: '해외 대표지수', label: '해외\n대표지수', icon: <Globe className="w-4 h-4" /> },
  { key: '섹터/테마', label: '섹터/테마', icon: <Crosshair className="w-4 h-4" /> },
  { key: '채권', label: '채권', icon: <FileText className="w-4 h-4" /> },
  { key: '원자재', label: '원자재', icon: <Gem className="w-4 h-4" /> },
  { key: '레버리지/인버스', label: '레버리지&\n인버스', icon: <ArrowUpDown className="w-4 h-4" /> },
  { key: '혼합', label: '혼합', icon: <Blend className="w-4 h-4" /> },
  { key: '액티브', label: '액티브', icon: <Zap className="w-4 h-4" /> },
  { key: 'New', label: 'New', icon: <Sparkles className="w-4 h-4" /> },
];

export function LeftPanel() {
  const [query, setQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [category, setCategory] = useState('국내 대표지수');
  const [sortBy, setSortBy] = useState<ETFSortBy>('aum');
  const [catOpen, setCatOpen] = useState(true);
  const { selectedEtfCode, selectEtf, addToCanvas, addLoadingCode, removeLoadingCode, updateEtfData } = useCanvasStore();

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

  // Debounced search
  const handleQueryChange = useCallback((value: string) => {
    setQuery(value);
    const timer = setTimeout(() => setDebouncedQuery(value), 300);
    return () => clearTimeout(timer);
  }, []);

  const { data: etfs } = useQuery({
    queryKey: ['etf-search', debouncedQuery, category || undefined, sortBy],
    queryFn: () =>
      debouncedQuery
        ? api.search(debouncedQuery, category || undefined, sortBy)
        : api.list(category || undefined, sortBy),
  });

  // 첫 번째 종목 자동 선택
  useEffect(() => {
    if (etfs && etfs.length > 0 && !selectedEtfCode) {
      selectEtf(etfs[0].code);
    }
  }, [etfs, selectedEtfCode, selectEtf]);

  const { data: selectedPrices } = useQuery({
    queryKey: ['etf-mini-prices', selectedEtfCode],
    queryFn: () => api.getDailyPrices(selectedEtfCode!, '1y'),
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
        <h2 className="text-lg font-bold mb-2">ETF Canvas</h2>
        <Input
          placeholder="검색"
          value={query}
          onChange={(e) => handleQueryChange(e.target.value)}
          className="h-8 text-sm"
        />
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
          <>
            <div className="grid grid-cols-3 gap-1.5 mt-2">
              {categories.map((cat) => (
                <button
                  key={cat.key}
                  onClick={() => setCategory(category === cat.key ? '' : cat.key)}
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
          </>
        )}
      </div>

      {/* ETF List */}
      <div className="px-3 py-2 flex items-center justify-between border-b">
        <span className="text-sm font-bold text-foreground">ETF</span>
        <div className="flex gap-1">
          <button
            onClick={() => setSortBy('returnRate')}
            className={`text-[10px] px-1.5 py-0.5 rounded ${sortBy === 'returnRate' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:bg-accent'}`}
          >
            수익률
          </button>
          <button
            onClick={() => setSortBy('aum')}
            className={`text-[10px] px-1.5 py-0.5 rounded ${sortBy === 'aum' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:bg-accent'}`}
          >
            AUM
          </button>
        </div>
      </div>
      <div className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden">
        <TooltipProvider delayDuration={300}>
          <div className="px-1">
            {etfs?.map((etf) => (
              <EtfListItem
                key={etf.code}
                etf={etf}
                isSelected={selectedEtfCode === etf.code}
                sortBy={sortBy}
                onSelect={() => selectEtf(etf.code)}
                onAdd={() => handleAddToCanvas(etf)}
              />
            ))}
            {etfs?.length === 0 && (
              <p className="text-xs text-muted-foreground text-center py-4">
                검색 결과 없음
              </p>
            )}
          </div>
        </TooltipProvider>
      </div>

      {/* Mini Chart / Return Rate */}
      {selectedEtfCode && selectedDetail && (
        <div className="border-t px-3 py-2">
          <p className="text-xs font-bold text-foreground leading-tight">{selectedDetail.name}</p>
          <p className="text-[10px] text-muted-foreground mb-1">1년 수익률</p>
          <div className="h-28">
            <PriceChart data={selectedPrices || []} compact />
          </div>
        </div>
      )}
    </div>
  );
}

function EtfListItem({
  etf,
  isSelected,
  sortBy,
  onSelect,
  onAdd,
}: {
  etf: ETFSummary;
  isSelected: boolean;
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
          className={`w-full max-w-full flex items-center gap-1 px-2 py-1.5 rounded text-sm transition-colors overflow-hidden ${
            isSelected
              ? 'bg-primary/10 text-primary'
              : 'hover:bg-accent'
          }`}
        >
          <span className="flex-1 min-w-0 truncate text-left">{etf.name}</span>
          {sortBy === 'returnRate' ? (
            <span className={`text-xs shrink-0 text-right tabular-nums ${
              etf.oneYearEarnRate != null && etf.oneYearEarnRate > 0 ? 'text-red-500'
              : etf.oneYearEarnRate != null && etf.oneYearEarnRate < 0 ? 'text-blue-500'
              : 'text-muted-foreground'
            }`}>
              {etf.oneYearEarnRate != null ? `${etf.oneYearEarnRate.toFixed(1)}%` : '-'}
            </span>
          ) : (
            <span className="text-xs shrink-0 text-right tabular-nums text-muted-foreground">
              {etf.aum ? (etf.aum >= 10000 ? `${(etf.aum / 10000).toFixed(1)}조` : `${etf.aum.toLocaleString()}억`) : '-'}
            </span>
          )}
        </button>
      </TooltipTrigger>
      <TooltipContent side="right" className="text-xs space-y-1.5 p-3">
        <p className="font-medium text-sm">{etf.name}</p>
        <div className="grid grid-cols-2 gap-x-4 gap-y-1">
          <span className="opacity-60">자산</span><span>{etf.categories[0] || '-'}</span>
          <span className="opacity-60">국가</span><span>{etf.categories.some((c: string) => c === '국내 대표지수' || c === '섹터/테마') ? '한국' : '해외'}</span>
          <span className="opacity-60">AUM</span><span>{etf.aum ? `${etf.aum.toLocaleString()}억` : '-'}</span>
          <span className="opacity-60">1년 수익률</span><span className={etf.oneYearEarnRate != null && etf.oneYearEarnRate > 0 ? 'text-red-400' : etf.oneYearEarnRate != null && etf.oneYearEarnRate < 0 ? 'text-blue-400' : ''}>{etf.oneYearEarnRate != null ? `${etf.oneYearEarnRate > 0 ? '+' : ''}${etf.oneYearEarnRate.toFixed(2)}%` : '-'}</span>
          <span className="opacity-60">운용보수</span><span>{expenseRatio != null ? `${(expenseRatio * 100).toFixed(3)}%` : <span className="inline-block w-3 h-3 border-2 border-muted-foreground/40 border-t-muted-foreground rounded-full animate-spin" />}</span>
        </div>
        <p className="text-[10px] opacity-40 pt-1">더블클릭: 캔버스에 추가</p>
      </TooltipContent>
    </Tooltip>
  );
}
