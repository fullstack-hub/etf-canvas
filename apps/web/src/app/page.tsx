'use client';

import { useState, useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { EtfSearch } from '@/components/etf-search';
import { EtfCard } from '@/components/etf-card';
import { CategoryFilter } from '@/components/category-filter';
import { useCanvasStore } from '@/lib/store';
import Link from 'next/link';
import { Button } from '@/components/ui/button';

export default function HomePage() {
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState('');
  const { selected } = useCanvasStore();

  const { data: etfs, isLoading } = useQuery({
    queryKey: ['etf-search', query, category],
    queryFn: () => (query ? api.search(query, category || undefined) : api.list(category || undefined)),
  });

  const handleSearch = useCallback((q: string) => setQuery(q), []);

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <h1 className="text-2xl font-bold">ETF Canvas</h1>
          {selected.length > 0 && (
            <Link href="/canvas">
              <Button>
                캔버스 ({selected.length})
              </Button>
            </Link>
          )}
        </div>
      </header>

      <main className="container mx-auto px-4 py-6 space-y-6">
        <div className="space-y-4">
          <EtfSearch onSearch={handleSearch} />
          <CategoryFilter selected={category || '전체'} onSelect={setCategory} />
        </div>

        {isLoading ? (
          <div className="text-center py-12 text-muted-foreground">로딩 중...</div>
        ) : !etfs?.length ? (
          <div className="text-center py-12 text-muted-foreground">
            {query ? '검색 결과가 없습니다.' : 'ETF 데이터를 동기화해주세요.'}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {etfs.map((etf) => (
              <EtfCard key={etf.code} etf={etf} />
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
