'use client';

import { useQuery } from '@tanstack/react-query';
import { Loader2, Info } from 'lucide-react';

interface SinceData {
  totalReturn: number;
  annualizedReturn: number;
  maxDrawdown: number;
  dailyValues: { date: string; value: number }[];
  daysSinceSave: number;
  basisLabel?: string;
  message?: string;
}

export function SinceStatsHero({ fetchKey, fetchFn, saveDate }: {
  fetchKey: string[];
  fetchFn: () => Promise<SinceData>;
  saveDate: string;
}) {
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
          저장했던 날의 구성 비중대로 매수했다고 가정할 때, 저장일 기준 첫 거래일이 지나면 어떻게 변했을지 시뮬레이션 결과를 이곳에서 확인해 볼 수 있어요.
        </p>
      </div>
    );
  }

  const ret = data.totalReturn;
  const startValue = data.dailyValues[0]?.value || 100_000_000;
  const finalValue = data.dailyValues[data.dailyValues.length - 1]?.value || startValue;
  const isPositive = ret >= 0;

  return (
    <div className={`relative overflow-hidden rounded-3xl border p-7 md:p-9 transition-all ${isPositive ? 'bg-emerald-500/5 border-emerald-500/20' : 'bg-red-500/5 border-red-500/20'}`}>
      <div className={`absolute top-0 right-0 -mr-16 -mt-16 w-56 h-56 rounded-full blur-[70px] opacity-30 ${isPositive ? 'bg-emerald-500' : 'bg-red-500'}`} style={{ pointerEvents: 'none' }} />

      <div className="relative z-10 flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
          <p className="text-[13px] font-bold text-muted-foreground mb-2 flex items-center gap-2">
            저장 후 <span className="bg-background px-2.5 py-0.5 rounded-full text-foreground shadow-sm ring-1 ring-border/50">{data.daysSinceSave}일</span> 경과
            {data.dailyValues?.length > 0 && (
              <span className="text-[11px] font-normal text-muted-foreground/60">
                ({data.dailyValues[data.dailyValues.length - 1].date} 종가 기준)
              </span>
            )}
          </p>
          <div className="flex items-baseline gap-2">
            <span className={`text-5xl md:text-6xl font-black tracking-tighter tabular-nums ${isPositive ? 'text-emerald-500' : 'text-red-500'}`}>
              {isPositive ? '+' : ''}{ret.toFixed(2)}%
            </span>
          </div>
          <p className="text-[15px] font-medium text-foreground/80 mt-4 leading-relaxed">
            저장 당시에 구성한 비중대로 <strong className="text-foreground">{startValue.toLocaleString()}원</strong>을 매수했다고 가정한다면,<br />
            현재 평가금액은 <strong className={`font-bold tabular-nums ${isPositive ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'}`}>{finalValue.toLocaleString()}원</strong>이에요.
          </p>
        </div>

        <div className="w-full md:w-[320px] shrink-0 mt-4 md:mt-0">
          <div className="flex items-center gap-4 mb-3 justify-end">
            {data.daysSinceSave >= 30 && (
              <>
                <div className="text-right">
                  <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-0.5">연환산</p>
                  <p className={`text-lg font-bold tabular-nums leading-none ${data.annualizedReturn >= 0 ? 'text-emerald-500' : 'text-red-500'}`}>
                    {data.annualizedReturn >= 0 ? '+' : ''}{data.annualizedReturn.toFixed(1)}%
                  </p>
                </div>
                <div className="w-px h-8 bg-border/50" />
              </>
            )}
            <div className="text-right">
              <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-0.5">최대 낙폭</p>
              <p className={`text-lg font-bold tabular-nums leading-none ${data.maxDrawdown > 0 ? 'text-red-500' : 'text-muted-foreground'}`}>
                {data.maxDrawdown > 0 ? `-${data.maxDrawdown.toFixed(1)}` : '0.0'}%
              </p>
            </div>
          </div>

          {data.dailyValues?.length > 1 && (
            <div className="h-[80px] w-full mt-2">
              <HeroChart dailyValues={data.dailyValues} isPositive={isPositive} />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function HeroChart({ dailyValues, isPositive }: { dailyValues: { date: string; value: number }[]; isPositive: boolean }) {
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
  const strokeColor = isPositive ? '#10b981' : '#ef4444';
  const gradientId = `hero-gradient-${isPositive ? 'pos' : 'neg'}`;

  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="w-full h-full overflow-visible" preserveAspectRatio="none">
      <defs>
        <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={strokeColor} stopOpacity={0.2} />
          <stop offset="100%" stopColor={strokeColor} stopOpacity={0.0} />
        </linearGradient>
      </defs>
      <line x1={0} y1={baseY} x2={w} y2={baseY} stroke="currentColor" strokeOpacity={0.15} strokeDasharray="4 4" strokeWidth={2} />
      <polygon fill={`url(#${gradientId})`} points={areaPoints} />
      <polyline fill="none" stroke={strokeColor} strokeWidth={4} strokeLinecap="round" strokeLinejoin="round" points={points} />
      <circle cx={pointsArr[pointsArr.length - 1].x} cy={pointsArr[pointsArr.length - 1].y} r={6} fill="var(--background)" stroke={strokeColor} strokeWidth={3} />
    </svg>
  );
}
