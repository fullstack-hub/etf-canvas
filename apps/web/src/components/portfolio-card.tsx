import Link from 'next/link';

interface Props {
  name: string;
  slug: string;
  items: { code: string; name: string; weight: number }[];
  returnRate: number | null;
  feedbackSnippet: string | null;
  tags: string[];
  createdAt: string;
}

export function PortfolioCard({ name, slug, items, returnRate, feedbackSnippet, tags, createdAt }: Props) {
  const top3 = [...items].sort((a, b) => b.weight - a.weight).slice(0, 3);
  const date = new Date(createdAt).toLocaleDateString('ko-KR');

  return (
    <Link
      href={`/portfolio/${slug}`}
      className="block rounded-xl border bg-background p-4 hover:border-primary/40 hover:shadow-md transition-all"
    >
      <div className="flex items-start justify-between mb-2">
        <h3 className="font-bold text-sm truncate flex-1">{name}</h3>
        {returnRate != null && (
          <span className={`text-sm font-bold ml-2 shrink-0 ${Number(returnRate) >= 0 ? 'text-red-500' : 'text-blue-500'}`}>
            {Number(returnRate) >= 0 ? '+' : ''}{Number(returnRate).toFixed(1)}%
          </span>
        )}
      </div>

      <p className="text-xs text-muted-foreground mb-2">
        {top3.map((i) => i.name).join(', ')}
        {items.length > 3 && ` 외 ${items.length - 3}개`}
      </p>

      {feedbackSnippet && (
        <p className="text-xs text-muted-foreground/80 line-clamp-2 mb-2">{feedbackSnippet}</p>
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
