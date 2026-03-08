'use client';

export function AttributePanel() {
    return (
        <div className="w-72 border-l bg-background flex flex-col h-full z-10 shadow-sm">
            {/* 광고 영역 — 항상 표시 */}
            <div className="flex-1 flex flex-col p-4 gap-4">
                <div className="w-full h-[250px] rounded-lg border border-dashed border-border/40 bg-muted/10 flex items-center justify-center">
                    <span className="text-xs text-muted-foreground/40">AD</span>
                </div>
                <div className="w-full h-[250px] rounded-lg border border-dashed border-border/40 bg-muted/10 flex items-center justify-center">
                    <span className="text-xs text-muted-foreground/40">AD</span>
                </div>
            </div>
        </div>
    );
}
