'use client';

import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { useReturnColors } from '@/lib/return-colors';

interface Props {
  name: string;
  slug: string;
  items: { code: string; name: string; weight: number }[];
  returnRate: number | null;
  feedbackSnippet: string | null;
  tags: string[];
  createdAt: string;
  sinceReturn?: number | null;
  sinceMdd?: number | null;
  showMdd?: boolean;
}

export function PortfolioCard({ name, slug, items, feedbackSnippet, tags, createdAt, sinceReturn: sinceReturnProp, sinceMdd: sinceMddProp, showMdd }: Props) {
  const rc = useReturnColors();
  const top3 = [...items].sort((a, b) => b.weight - a.weight).slice(0, 3);
  const date = new Date(createdAt).toLocaleDateString('ko-KR');

  // 갤러리에서 이미 계산된 값이 있으면 그대로 사용, 없으면 API 호출
  const hasPropData = sinceReturnProp != null;
  const { data: sinceData } = useQuery({
    queryKey: ['public-since', slug],
    queryFn: () => api.getPublicSince(slug),
    staleTime: 1000 * 60 * 30,
    enabled: !hasPropData,
  });

  const realReturn = hasPropData ? sinceReturnProp : (sinceData && !sinceData.message ? sinceData.totalReturn : null);
  const realMdd = sinceMddProp ?? (sinceData && !sinceData.message ? sinceData.maxDrawdown : null);

  return (
    <Link
      href={`/portfolio/${slug}`}
      className="block rounded-xl border border-border bg-card p-4 shadow-sm hover:shadow-lg hover:shadow-black/10 transition-all"
    >
      <div className="flex items-start justify-between mb-2">
        <h3 className="font-bold text-sm truncate flex-1">{name}</h3>
        {showMdd ? (
          realMdd != null ? (
            <span className="text-sm font-bold ml-2 shrink-0 text-emerald-500">
              MDD {realMdd > 0 ? `-${realMdd.toFixed(1)}` : '0.0'}%
            </span>
          ) : (
            <span className="text-xs text-muted-foreground ml-2 shrink-0">대기 중</span>
          )
        ) : (
          realReturn != null ? (
            <span className={`text-sm font-bold ml-2 shrink-0 ${rc.cls(realReturn >= 0)}`}>
              {realReturn >= 0 ? '+' : ''}{realReturn.toFixed(1)}%
            </span>
          ) : (
            <span className="text-xs text-muted-foreground ml-2 shrink-0">대기 중</span>
          )
        )}
      </div>

      <p className="text-xs text-muted-foreground mb-2">
        {top3.map((i) => i.name).join(', ')}
        {items.length > 3 && ` 외 ${items.length - 3}개`}
      </p>

      {feedbackSnippet && (
        <p className="text-xs text-muted-foreground line-clamp-2 mb-2">{feedbackSnippet}</p>
      )}

      <div className="flex items-center justify-between">
        <div className="flex gap-1 flex-wrap">
          {tags.slice(0, 3).map((tag) => (
            <span key={tag} className="px-1.5 py-0.5 rounded bg-muted text-[10px]">#{tag}</span>
          ))}
        </div>
        <span className="text-[10px] text-muted-foreground">{date}</span>
      </div>
    </Link>
  );
}
