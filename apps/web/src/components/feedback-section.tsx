'use client';

export function FeedbackSection({ feedbackText, feedbackActions }: {
  feedbackText: string;
  feedbackActions?: { category: string; label: string }[] | null;
}) {
  return (
    <div className="bg-card rounded-2xl border border-border/50 shadow-sm overflow-hidden">
      <div className="p-5 border-b border-border/30 bg-muted/10">
        <h3 className="text-base font-bold text-foreground/90">포트폴리오 분석</h3>
      </div>
      <div className="p-5">
        <p className="text-sm leading-relaxed whitespace-pre-wrap text-foreground/80">{feedbackText}</p>
        {feedbackActions && feedbackActions.length > 0 && (
          <div className="flex flex-wrap gap-2 mt-4">
            {feedbackActions.map((action, i) => (
              <span key={i} className="px-2.5 py-1 rounded-full bg-muted text-xs font-medium">{action.label}</span>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
