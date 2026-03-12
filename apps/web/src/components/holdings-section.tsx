'use client';

import { getCatColor } from '@/lib/category-colors';

type Item = { code: string; name: string; weight: number; category?: string };

export function HoldingsSection({ items }: { items: Item[] }) {
  const sortedItems = [...items].sort((a, b) => b.weight - a.weight);

  return (
    <div>
      <h3 className="text-base font-bold text-foreground/90 mb-3">구성 종목</h3>
      <div className="flex h-3 rounded-full overflow-hidden mb-4">
        {sortedItems.map((item) => {
          const c = getCatColor(item.category);
          return (
            <div key={item.code} className={`${c.bar} transition-all`} style={{ width: `${item.weight}%` }} title={`${item.name} ${item.weight.toFixed(1)}%`} />
          );
        })}
      </div>
      <div className="grid gap-2">
        {sortedItems.map((item) => {
          const c = getCatColor(item.category);
          return (
            <div key={item.code} className="relative rounded-lg border overflow-hidden">
              <div className="absolute inset-y-0 left-0" style={{ width: `${item.weight}%`, backgroundColor: `color-mix(in srgb, ${c.hex} 15%, transparent)` }} />
              <div className="relative flex items-center justify-between p-3">
                <div className="flex items-center gap-2 min-w-0">
                  <span className={`w-2.5 h-2.5 rounded-full ${c.dot} shrink-0`} />
                  <div className="min-w-0">
                    <span className="font-medium text-sm block truncate">{item.name}</span>
                    <span className="text-xs text-muted-foreground">
                      {item.code}{item.category ? ` · ${item.category}` : ''}
                    </span>
                  </div>
                </div>
                <span className="font-bold text-sm shrink-0 ml-2">{item.weight.toFixed(1)}%</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
