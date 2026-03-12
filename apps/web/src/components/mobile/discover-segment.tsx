'use client';

import { useState, useRef, useEffect } from 'react';
import { useInfiniteQuery } from '@tanstack/react-query';
import { Search, X, Plus, Check } from 'lucide-react';
import { api } from '@/lib/api';
import { useCanvasStore } from '@/lib/store';
import { useMobileUIStore } from '@/lib/mobile-ui-store';
import { FloatingCanvasBar } from '@/components/mobile/floating-canvas-bar';
import type { ETFSummary } from '@etf-canvas/shared';

const CATEGORIES = [
  { id: '국내 대표지수', label: '국내대표', color: 'bg-blue-500' },
  { id: '해외 대표지수', label: '해외', color: 'bg-red-500' },
  { id: '섹터/테마', label: '섹터', color: 'bg-amber-500' },
  { id: '채권', label: '채권', color: 'bg-emerald-500' },
  { id: '원자재', label: '원자재', color: 'bg-orange-500' },
  { id: '레버리지/인버스', label: '레버리지', color: 'bg-pink-500' },
  { id: '혼합', label: '혼합', color: 'bg-violet-500' },
  { id: '액티브', label: '액티브', color: 'bg-cyan-500' },
  { id: 'New', label: 'New', color: 'bg-lime-500' },
];

const CATEGORY_COLOR_MAP = Object.fromEntries(CATEGORIES.map((c) => [c.id, c.color]));

const PAGE_SIZE = 30;

export function MobileDiscoverSegment() {
  const discoverSearch = useMobileUIStore((s) => s.discoverSearch);
  const setDiscoverSearch = useMobileUIStore((s) => s.setDiscoverSearch);
  const discoverCategory = useMobileUIStore((s) => s.discoverCategory);
  const setDiscoverCategory = useMobileUIStore((s) => s.setDiscoverCategory);
  const [search, setSearch] = useState(discoverSearch);
  const [category, setCategory] = useState<string | null>(null);
  const { selected, addToCanvas } = useCanvasStore();
  const setEtfDetailCode = useMobileUIStore((s) => s.setEtfDetailCode);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  const [debouncedSearch, setDebouncedSearch] = useState(discoverSearch);

  // 외부에서 discoverSearch가 바뀌면 반영
  useEffect(() => {
    if (discoverSearch) {
      setSearch(discoverSearch);
      setDebouncedSearch(discoverSearch);
      setCategory(null);
      setDiscoverSearch('');
    }
  }, [discoverSearch, setDiscoverSearch]);

  // 외부에서 discoverCategory가 바뀌면 반영
  useEffect(() => {
    if (discoverCategory) {
      setCategory(discoverCategory);
      setSearch('');
      setDebouncedSearch('');
      setDiscoverCategory('');
    }
  }, [discoverCategory, setDiscoverCategory]);

  useEffect(() => () => clearTimeout(debounceRef.current), []);

  const handleSearchChange = (value: string) => {
    setSearch(value);
    if (value) setCategory(null);
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => setDebouncedSearch(value), 300);
  };

  const { data, fetchNextPage, hasNextPage, isFetchingNextPage } = useInfiniteQuery({
    queryKey: ['etf-browse', category, debouncedSearch],
    queryFn: ({ pageParam = 0 }) =>
      debouncedSearch
        ? api.search(debouncedSearch, category || undefined, undefined, pageParam, PAGE_SIZE)
        : api.list(category || undefined, undefined, pageParam, PAGE_SIZE),
    getNextPageParam: (last, allPages) => (last.length === PAGE_SIZE ? allPages.length * PAGE_SIZE : undefined),
    initialPageParam: 0,
  });

  const etfs = data?.pages.flat() ?? [];
  const selectedCodes = new Set(selected.map((s) => s.code));

  const sentinelRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const node = sentinelRef.current;
    if (!node || !hasNextPage || isFetchingNextPage) return;
    const observer = new IntersectionObserver(
      (entries) => { if (entries[0].isIntersecting) fetchNextPage(); },
      { rootMargin: '200px' },
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

  return (
    <div className="flex flex-col h-full">
      <div className="px-4 pt-3 pb-2">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            value={search}
            onChange={(e) => handleSearchChange(e.target.value)}
            placeholder="ETF 검색"
            aria-label="ETF 검색"
            className="w-full h-10 pl-9 pr-9 rounded-lg bg-muted text-sm outline-none placeholder:text-muted-foreground"
          />
          {search && (
            <button onClick={() => handleSearchChange('')} aria-label="검색어 지우기" className="absolute right-3 top-1/2 -translate-y-1/2">
              <X className="w-4 h-4 text-muted-foreground" />
            </button>
          )}
        </div>
      </div>

      <div className="px-4 pb-2">
        <div className="flex gap-2 scroll-x-hide">
          {CATEGORIES.map((cat) => (
            <button
              key={cat.id}
              onClick={() => { setCategory(category === cat.id ? null : cat.id); setSearch(''); setDebouncedSearch(''); }}
              className={`shrink-0 px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                category === cat.id
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-muted text-muted-foreground'
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        {etfs.map((etf) => (
          <EtfListRow
            key={etf.code}
            etf={etf}
            isAdded={selectedCodes.has(etf.code)}
            onAdd={() => addToCanvas(etf)}
            onDetail={() => setEtfDetailCode(etf.code)}
          />
        ))}
        {hasNextPage && <div ref={sentinelRef} className="h-10" />}
        {isFetchingNextPage && (
          <div className="flex justify-center py-4">
            <div className="w-5 h-5 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          </div>
        )}
      </div>

      <FloatingCanvasBar />
    </div>
  );
}

function EtfListRow({ etf, isAdded, onAdd, onDetail }: {
  etf: ETFSummary; isAdded: boolean; onAdd: () => void; onDetail: () => void;
}) {
  return (
    <div className="flex items-center gap-3 px-4 py-3 border-b border-border/50">
      <div className={`w-1 self-stretch rounded-full shrink-0 ${CATEGORY_COLOR_MAP[etf.categories[0]] || 'bg-muted-foreground/30'}`} />
      <button onClick={(e) => { (e.currentTarget as HTMLElement).blur(); onDetail(); }} className="flex-1 min-w-0 text-left">
        <p className="text-sm font-medium truncate">{etf.name}</p>
        <div className="flex items-center gap-2 mt-0.5 text-xs text-muted-foreground">
          <span>{etf.categories[0] || '-'}</span>
          {etf.aum != null && <span>AUM {(etf.aum / 100000000).toFixed(1)}억</span>}
        </div>
      </button>
      <div className="text-right mr-2">
        {etf.oneYearEarnRate != null && (
          <span className={`text-sm font-medium ${etf.oneYearEarnRate >= 0 ? 'text-red-500' : 'text-blue-500'}`}>
            {etf.oneYearEarnRate >= 0 ? '+' : ''}{etf.oneYearEarnRate.toFixed(1)}%
          </span>
        )}
      </div>
      <button
        onClick={(e) => { e.stopPropagation(); onAdd(); }}
        className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 transition-colors ${
          isAdded ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground hover:bg-accent'
        }`}
      >
        {isAdded ? <Check className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
      </button>
    </div>
  );
}
