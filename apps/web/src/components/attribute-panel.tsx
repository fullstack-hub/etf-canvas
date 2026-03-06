'use client';

import { useCanvasStore } from '@/lib/store';
import { Slider } from '@/components/ui/slider';
import { Input } from '@/components/ui/input';
import { AlertTriangle, BarChart3, Search } from 'lucide-react';

export function AttributePanel() {
    const { comparing, selected, weights, setWeight } = useCanvasStore();

    const totalWeight = comparing.reduce((sum, code) => sum + (weights[code] || 0), 0);

    return (
        <div className="w-80 border-l bg-background flex flex-col h-full z-10 shadow-sm relative">
            <div className="p-4 border-b">
                <h2 className="font-bold text-lg">ETF 비중 설정</h2>
                <p className="text-sm text-muted-foreground">합성할 ETF의 비중을 설정해 주세요.</p>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-6">
                {comparing.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-full text-center text-muted-foreground bg-muted/10 rounded-lg border border-dashed p-4">
                        <p className="text-sm">ETF를 합성 대상으로 선택하여<br />비중을 설정해보세요.</p>
                    </div>
                ) : (
                    comparing.map(code => {
                        const etf = selected.find(s => s.code === code);
                        const weight = weights[code] || 0;
                        return (
                            <div key={code} className="space-y-3">
                                <div className="flex justify-between items-start">
                                    <div className="flex-1 min-w-0 pr-2">
                                        <div className="font-semibold text-sm truncate" title={etf?.name}>{etf?.name || code}</div>
                                        <div className="text-xs text-muted-foreground">{code}</div>
                                    </div>
                                    <div className="flex items-center gap-1 w-20">
                                        <Input
                                            type="number"
                                            value={weight}
                                            onChange={(e) => setWeight(code, Number(e.target.value))}
                                            className="h-7 px-2 text-right text-sm"
                                        />
                                        <span className="text-sm text-muted-foreground">%</span>
                                    </div>
                                </div>
                                <Slider
                                    value={[weight]}
                                    max={100}
                                    step={1}
                                    onValueChange={([val]) => setWeight(code, val)}
                                />
                            </div>
                        );
                    })
                )}
            </div>

            <div className="p-4 border-t bg-muted/20">
                <div className="flex justify-between items-center text-sm">
                    <span className="font-medium">총 비중</span>
                    <span className={`font-bold ${totalWeight !== 100 && comparing.length > 0 ? 'text-destructive' : 'text-primary'}`}>
                        {totalWeight}%
                    </span>
                </div>
                {totalWeight !== 100 && comparing.length > 0 && (
                    <p className="text-xs text-destructive mt-1">비중의 합이 100%가 되도록 조정해 주세요.</p>
                )}
            </div>

            {/* 포트폴리오 피드백 */}
            {comparing.length > 0 && (
                <div className="p-4 border-t space-y-3">
                    <h3 className="font-bold text-sm">포트폴리오 피드백 및 조언</h3>
                    <div className="rounded-lg border bg-amber-50 dark:bg-amber-950/20 p-3 space-y-1.5">
                        <div className="flex gap-2 items-start">
                            <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
                            <div className="text-xs text-foreground/80 leading-relaxed">
                                <span className="font-semibold">조언:</span> 현재 포트폴리오는 주식형({comparing.map(code => {
                                    const etf = selected.find(s => s.code === code);
                                    return etf?.name?.split(' ')[0] || code;
                                }).join(', ')})의 금 관련 ETF로 구성하여 없어 시장 변동성에 취약할 수 있습니다. 안정성을 높이기 위해 채권형 ETF의 건전한 비율을 늘리거나 반대로 변동성을 활용하는 전략을 그려보세요.
                            </div>
                        </div>
                    </div>
                    <div className="flex flex-col gap-2">
                        <button
                            onClick={() => alert('변동형 관리 제안 (준비 중)')}
                            className="flex items-center gap-2 px-3 py-2 rounded-lg border text-sm font-medium hover:bg-accent transition-colors"
                        >
                            <BarChart3 className="w-4 h-4" />
                            변동형 관리 제안
                        </button>
                        <button
                            onClick={() => alert('채권형 ETF 조회하기 (준비 중)')}
                            className="flex items-center gap-2 px-3 py-2 rounded-lg border bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors"
                        >
                            <Search className="w-4 h-4" />
                            채권형 ETF 조회하기
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}
