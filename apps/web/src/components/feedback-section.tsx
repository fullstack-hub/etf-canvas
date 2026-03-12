'use client';

import { useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { marked } from 'marked';
import DOMPurify from 'dompurify';
import { useMobileUIStore } from '@/lib/mobile-ui-store';

marked.setOptions({ breaks: true, gfm: true });

// CommonMark: 구두점+**+한글 → right-flanking 실패 → 전처리 공백 삽입 후 파싱 후 제거
function parseMarkdown(text: string) {
  const pre = text.replace(/([)\]>}!?.])\*\*([가-힣ㄱ-ㅎㅏ-ㅣ])/g, '$1** $2');
  const html = marked.parse(pre) as string;
  return html.replace(/<\/strong> ([가-힣ㄱ-ㅎㅏ-ㅣ])/g, '</strong>$1');
}

export function FeedbackSection({ feedbackText, feedbackActions }: {
  feedbackText: string;
  feedbackActions?: { category: string; label: string }[] | null;
}) {
  const router = useRouter();
  const { setActiveTab, setCanvasSegment, setDiscoverCategory } = useMobileUIStore();
  const html = useMemo(() => DOMPurify.sanitize(parseMarkdown(feedbackText)), [feedbackText]);

  const handleAction = (action: { category: string; label: string }) => {
    setDiscoverCategory(action.category);
    setCanvasSegment('discover');
    setActiveTab('canvas');
    router.push('/');
  };

  return (
    <div className="bg-card rounded-2xl border border-border/50 shadow-sm overflow-hidden">
      <div className="p-5 border-b border-border/30 bg-muted/10">
        <h3 className="text-base font-bold text-foreground/90">포트폴리오 분석</h3>
      </div>
      <div className="p-5 prose prose-sm dark:prose-invert max-w-none prose-p:my-1.5 prose-ul:my-1.5 prose-li:my-0.5 prose-strong:text-foreground prose-headings:text-foreground">
        <div dangerouslySetInnerHTML={{ __html: html }} />
        {feedbackActions && feedbackActions.length > 0 && (
          <div className="flex flex-wrap gap-2 mt-4 not-prose">
            {feedbackActions.map((action, i) => (
              <button key={i} onClick={() => handleAction(action)} className="px-2.5 py-1 rounded-full bg-muted text-xs font-medium hover:bg-muted/80 transition-colors">{action.label}</button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
