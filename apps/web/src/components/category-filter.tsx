'use client';

import { Badge } from '@/components/ui/badge';
import type { ETFCategory } from '@etf-canvas/shared';

const categories: (ETFCategory | '전체')[] = [
  '전체', '국내주식', '해외주식', '채권', '원자재', '레버리지', '인버스', '기타',
];

interface Props {
  selected: string;
  onSelect: (category: string) => void;
}

export function CategoryFilter({ selected, onSelect }: Props) {
  return (
    <div className="flex flex-wrap gap-2">
      {categories.map((cat) => (
        <Badge
          key={cat}
          variant={selected === cat ? 'default' : 'outline'}
          className="cursor-pointer text-sm px-3 py-1"
          onClick={() => onSelect(cat === '전체' ? '' : cat)}
        >
          {cat}
        </Badge>
      ))}
    </div>
  );
}
