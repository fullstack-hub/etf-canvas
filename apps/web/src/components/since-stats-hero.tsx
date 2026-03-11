'use client';

import { useQuery } from '@tanstack/react-query';
import { Loader2, Info, Save } from 'lucide-react';
import { useReturnColors } from '@/lib/return-colors';

interface SinceData {
  totalReturn: number;
  annualizedReturn: number;
  maxDrawdown: number;
  dailyValues: { date: string; value: number }[];
  daysSinceSave: number;
  basisLabel?: string;
  message?: string;
  dividendTotal?: number;
  dividendCount?: number;
}

export function SinceStatsHero({ fetchKey, fetchFn, saveDate }: {
  fetchKey: string[];
  fetchFn: () => Promise<SinceData>;
  saveDate: string;
}) {
  const rc = useReturnColors();
  const { data, isLoading } = useQuery({
    queryKey: fetchKey,
    queryFn: fetchFn,
    staleTime: 1000 * 60 * 30,
  });

  if (isLoading) {
    return (
      <div className="bg-card border border-border/40 rounded-3xl p-8 flex items-center justify-center min-h-[220px]">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground/40" />
      </div>
    );
  }

  // 서버 응답 기반으로만 대기 여부 판단
  const isWaiting = !data || data.message === 'today' || data.message === 'no_trading_days' || data.message === 'waiting_next_trading_day' || data.dailyValues.length < 2;

  if (isWaiting) {
    return (
      <div className="bg-gradient-to-br from-card to-muted/20 border border-border/40 rounded-3xl p-8 flex flex-col items-center justify-center text-center min-h-[220px]">
        <Info className="w-10 h-10 text-muted-foreground/30 mb-4" />
        <h3 className="text-[17px] font-bold text-foreground/80 mb-1.5">실전 시뮬레이션 대기 중</h3>
        <p className="text-[13px] text-muted-foreground/80 max-w-md leading-relaxed">
          {(() => { const ds = saveDate.split('T')[0]; const [,m,d] = ds.split('-'); return `${Number(m)}월 ${Number(d)}일`; })()}에 구성한 비중대로 매수했다고 가정할 때, 첫 거래일이 지나면 어떻게 변했을지 시뮬레이션 결과를 이곳에서 확인해 볼 수 있어요.
        </p>
      </div>
    );
  }

  const ret = data.totalReturn;
  const startValue = data.dailyValues[0]?.value || 100_000_000;
  const finalValue = data.dailyValues[data.dailyValues.length - 1]?.value || startValue;
  const isPositive = ret >= 0;
  const lastDate = data.dailyValues[data.dailyValues.length - 1]?.date || '';

  return (
    <div className={`relative overflow-hidden rounded-3xl border p-7 md:p-9 transition-all ${rc.bgCls(isPositive)} ${rc.borderCls(isPositive)}`}>
      {/* 글로우 효과 */}
      <div className={`absolute top-0 right-0 -mr-16 -mt-16 w-56 h-56 rounded-full blur-[70px] opacity-30 dark:opacity-50 ${rc.glowCls(isPositive)}`} style={{ pointerEvents: 'none' }} />

      <div className="relative z-10 flex flex-col md:flex-row">
        {/* 왼쪽: 텍스트 */}
        <div className="flex-1 flex flex-col justify-center">
          <p className="text-[13px] text-muted-foreground mb-3 flex items-center gap-1.5 flex-wrap">
            저장 후 <span className="bg-muted px-2 py-0.5 rounded-md text-foreground font-bold text-[12px]">{data.daysSinceSave}일</span> 경과
            <span className="text-muted-foreground/60">({lastDate} 종가 기준)</span>
          </p>
          <p className={`text-4xl md:text-5xl font-black tracking-tight tabular-nums ${rc.cls(isPositive)}`}>
            {isPositive ? '+' : ''}{ret.toFixed(2)}%
          </p>
          <p className="text-[13px] text-muted-foreground mt-4 leading-relaxed">
            저장 당시에 구성한 비중대로 <strong className="text-foreground">{startValue.toLocaleString()}원</strong>을 매수했다고 가정한다면,<br />
            현재 평가금액은 <strong className={`font-bold tabular-nums ${rc.cls(isPositive)}`}>{finalValue.toLocaleString()}원</strong>이에요.
            {data.dividendTotal != null && data.dividendTotal > 0 && (
              <>
                <br />
                분배금은 <strong className="text-foreground tabular-nums">{data.dividendCount}회</strong> 수령, 총 <strong className="text-amber-500 tabular-nums">{data.dividendTotal.toLocaleString()}원</strong>이에요.
              </>
            )}
          </p>
        </div>

        {/* 오른쪽: 차트 (내부 카드) */}
        {data.dailyValues?.length > 1 && (
          <div className="w-full md:w-[360px] shrink-0 flex items-center">
            <div className="w-full rounded-2xl border border-border/40 bg-background/60 backdrop-blur-sm p-5 flex flex-col shadow-lg">
              <div className="flex items-center justify-between text-[12px] text-muted-foreground mb-2">
                <span className="flex items-center gap-1.5">
                  <Save className="w-4 h-4" />
                  저장 시점
                </span>
                <span className={`font-bold tabular-nums ${rc.cls(isPositive)}`}>
                  {isPositive ? '+ ' : ''}{ret.toFixed(2)}%
                </span>
              </div>
              <div className="relative h-[140px] w-full">
                <HeroChart dailyValues={data.dailyValues} isPositive={isPositive} />
                <span className="absolute bottom-1 right-1 text-[12px] text-muted-foreground">{data.daysSinceSave}일</span>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function HeroChart({ dailyValues, isPositive }: { dailyValues: { date: string; value: number }[]; isPositive: boolean }) {
  const rc = useReturnColors();
  const w = 400;
  const h = 100;
  const p = 5;

  const values = dailyValues.map((d) => d.value);
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;
  const firstVal = values[0];

  const pointsArr = values.map((v, i) => {
    const x = p + (i / (values.length - 1)) * (w - p * 2);
    const y = h - p - ((v - min) / range) * (h - p * 2);
    return { x, y };
  });

  const points = pointsArr.map(pt => `${pt.x},${pt.y}`).join(' ');
  const areaPoints = `${pointsArr[0].x},${h} ${points} ${pointsArr[pointsArr.length - 1].x},${h}`;
  const baseY = h - p - ((firstVal - min) / range) * (h - p * 2);
  const strokeColor = rc.hex(isPositive);
  const gradientId = `hero-gradient-${isPositive ? 'pos' : 'neg'}`;

  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="w-full h-full overflow-visible" preserveAspectRatio="xMidYMid meet">
      <defs>
        <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={strokeColor} stopOpacity={0.45} />
          <stop offset="100%" stopColor={strokeColor} stopOpacity={0.05} />
        </linearGradient>
      </defs>
      {/* 저장 시점 세로선 */}
      <line x1={pointsArr[0].x} y1={0} x2={pointsArr[0].x} y2={h} stroke={strokeColor} strokeOpacity={0.5} strokeWidth={2} />
      {/* 기준선 (점선) */}
      <line x1={0} y1={baseY} x2={w} y2={baseY} stroke="currentColor" strokeOpacity={0.12} strokeDasharray="4 4" strokeWidth={1.5} />
      <polygon fill={`url(#${gradientId})`} points={areaPoints} />
      <polyline fill="none" stroke={strokeColor} strokeWidth={3} strokeLinecap="round" strokeLinejoin="round" points={points} />
      <circle cx={pointsArr[pointsArr.length - 1].x} cy={pointsArr[pointsArr.length - 1].y} r={5} fill="var(--background)" stroke={strokeColor} strokeWidth={2.5} />
    </svg>
  );
}
