'use client';

import { useTheme } from 'next-themes';
import { useSyncExternalStore } from 'react';
import { Sun, Moon, Monitor, Settings, Check, TrendingUp, TrendingDown } from 'lucide-react';
import { useCanvasStore } from '@/lib/store';

const subscribe = () => () => {};
const useMounted = () => useSyncExternalStore(subscribe, () => true, () => false);

const AMOUNT_PRESETS = [1_000_000, 3_000_000, 5_000_000, 10_000_000, 50_000_000];

function formatWon(n: number) {
  if (n >= 100_000_000) return `${n / 100_000_000}억원`;
  if (n >= 10_000) return `${n / 10_000}만원`;
  return `${n.toLocaleString()}원`;
}

export function SettingsView() {
  const { theme, setTheme } = useTheme();
  const { colorConvention, setColorConvention, defaultAmount, setDefaultAmount } = useCanvasStore();
  const mounted = useMounted();

  return (
    <div className="flex-1 overflow-auto">
      <div className="max-w-3xl mx-auto px-6 py-10">
        {/* Header */}
        <div className="mb-10">
          <div className="flex items-center gap-2.5 mb-1.5">
            <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
              <Settings className="w-4 h-4 text-primary" />
            </div>
            <h1 className="text-xl font-bold tracking-tight">설정</h1>
          </div>
          <p className="text-sm text-muted-foreground ml-[42px]">앱 환경을 설정하세요</p>
        </div>

        {/* 화면 모드 */}
        <section className="rounded-2xl border border-border/60 bg-card p-6 mb-6">
          <h2 className="text-[13px] font-semibold mb-5">화면 모드</h2>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {([
              { value: 'light', label: '라이트', icon: Sun, desc: '밝은 화면' },
              { value: 'dark', label: '다크', icon: Moon, desc: '어두운 화면' },
              { value: 'system', label: '시스템', icon: Monitor, desc: '기기 설정 따름' },
            ] as const).map(({ value, label, icon: Icon, desc }) => {
              const active = mounted && theme === value;
              return (
                <button
                  key={value}
                  onClick={() => setTheme(value)}
                  className={`group relative rounded-xl overflow-hidden transition-all duration-200 ${
                    active
                      ? 'ring-2 ring-primary shadow-md shadow-primary/10'
                      : 'ring-1 ring-border/50 hover:ring-border hover:shadow-sm'
                  }`}
                >
                  {/* Preview */}
                  <div className="aspect-[3/2]">
                    <ThemePreview mode={value} />
                  </div>
                  {/* Label */}
                  <div className={`flex items-center gap-2 px-3 py-3 border-t ${active ? 'bg-primary/5 border-primary/20' : 'bg-card border-border/40'}`}>
                    <Icon className={`w-3.5 h-3.5 ${active ? 'text-primary' : 'text-muted-foreground'}`} />
                    <div className="text-left flex-1 min-w-0">
                      <p className={`text-xs font-semibold ${active ? 'text-foreground' : 'text-muted-foreground'}`}>{label}</p>
                      <p className="text-[10px] text-muted-foreground/60">{desc}</p>
                    </div>
                    {active && (
                      <div className="w-5 h-5 rounded-full bg-primary flex items-center justify-center">
                        <Check className="w-3 h-3 text-primary-foreground" strokeWidth={3} />
                      </div>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        </section>

        {/* 상승/하락 색상 */}
        <section className="rounded-2xl border border-border/60 bg-card p-6">
          <h2 className="text-[13px] font-semibold mb-5">상승/하락 색상</h2>
          <div className="grid grid-cols-2 gap-4">
            {([
              { value: 'kr' as const, label: '국내 스타일', desc: '빨간색 상승 · 파란색 하락', upHex: '#ef4444', downHex: '#3b82f6' },
              { value: 'us' as const, label: '해외 스타일', desc: '초록색 상승 · 빨간색 하락', upHex: '#22c55e', downHex: '#ef4444' },
            ]).map(({ value, label, desc, upHex, downHex }) => {
              const active = colorConvention === value;
              return (
                <button
                  key={value}
                  onClick={() => setColorConvention(value)}
                  className={`group relative rounded-xl overflow-hidden transition-all duration-200 ${
                    active
                      ? 'ring-2 ring-primary shadow-md shadow-primary/10'
                      : 'ring-1 ring-border/50 hover:ring-border hover:shadow-sm'
                  }`}
                >
                  {/* Mini chart preview */}
                  <div className="px-5 pt-5 pb-3 flex items-end justify-center gap-6">
                    <div className="flex flex-col items-center gap-1.5">
                      <div className="flex items-center gap-1">
                        <TrendingUp className="w-4 h-4" style={{ color: upHex }} />
                        <span className="text-sm font-bold tabular-nums" style={{ color: upHex }}>+2.45%</span>
                      </div>
                      <span className="text-[10px] text-muted-foreground">상승</span>
                    </div>
                    <div className="flex flex-col items-center gap-1.5">
                      <div className="flex items-center gap-1">
                        <TrendingDown className="w-4 h-4" style={{ color: downHex }} />
                        <span className="text-sm font-bold tabular-nums" style={{ color: downHex }}>-1.32%</span>
                      </div>
                      <span className="text-[10px] text-muted-foreground">하락</span>
                    </div>
                  </div>
                  {/* Label */}
                  <div className={`flex items-center gap-2 px-4 py-3 border-t ${active ? 'bg-primary/5 border-primary/20' : 'bg-card border-border/40'}`}>
                    <div className="text-left flex-1 min-w-0">
                      <p className={`text-xs font-semibold ${active ? 'text-foreground' : 'text-muted-foreground'}`}>{label}</p>
                      <p className="text-[10px] text-muted-foreground/60">{desc}</p>
                    </div>
                    {active && (
                      <div className="w-5 h-5 rounded-full bg-primary flex items-center justify-center">
                        <Check className="w-3 h-3 text-primary-foreground" strokeWidth={3} />
                      </div>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        </section>

        {/* 종목당 기본 투자금 */}
        <section className="rounded-2xl border border-border/60 bg-card p-6 mt-6">
          <h2 className="text-[13px] font-semibold mb-1">종목당 기본 투자금</h2>
          <p className="text-[11px] text-muted-foreground mb-5">캔버스에 종목을 추가할 때 적용되는 기본 금액</p>
          <div className="flex flex-wrap gap-2">
            {AMOUNT_PRESETS.map((amount) => {
              const active = defaultAmount === amount;
              return (
                <button
                  key={amount}
                  onClick={() => setDefaultAmount(amount)}
                  className={`px-4 py-2.5 rounded-xl text-sm font-semibold tabular-nums transition-all duration-200 ${
                    active
                      ? 'bg-primary text-primary-foreground shadow-md shadow-primary/20'
                      : 'bg-muted/50 text-muted-foreground hover:bg-muted hover:text-foreground ring-1 ring-border/30'
                  }`}
                >
                  {formatWon(amount)}
                </button>
              );
            })}
          </div>
        </section>
      </div>
    </div>
  );
}

function ThemePreview({ mode }: { mode: string }) {
  const isDark = mode === 'dark';
  const isSystem = mode === 'system';

  if (isSystem) {
    return (
      <div className="w-full h-full flex">
        <div className="w-1/2 h-full bg-[#fafafa] p-2.5 flex flex-col gap-1.5">
          <div className="flex gap-1 mb-1">
            <div className="w-1.5 h-1.5 rounded-full bg-gray-300" />
            <div className="w-1.5 h-1.5 rounded-full bg-gray-300" />
            <div className="w-1.5 h-1.5 rounded-full bg-gray-300" />
          </div>
          <div className="w-4/5 h-1.5 rounded-full bg-gray-200" />
          <div className="w-3/5 h-1.5 rounded-full bg-gray-200" />
          <div className="flex-1 rounded-md bg-gray-100 mt-1" />
        </div>
        <div className="w-1/2 h-full bg-[#1a1a2e] p-2.5 flex flex-col gap-1.5">
          <div className="flex gap-1 mb-1">
            <div className="w-1.5 h-1.5 rounded-full bg-zinc-600" />
            <div className="w-1.5 h-1.5 rounded-full bg-zinc-600" />
            <div className="w-1.5 h-1.5 rounded-full bg-zinc-600" />
          </div>
          <div className="w-4/5 h-1.5 rounded-full bg-zinc-700" />
          <div className="w-3/5 h-1.5 rounded-full bg-zinc-700" />
          <div className="flex-1 rounded-md bg-zinc-800/80 mt-1" />
        </div>
      </div>
    );
  }

  const bg = isDark ? 'bg-[#1a1a2e]' : 'bg-[#fafafa]';
  const dot = isDark ? 'bg-zinc-600' : 'bg-gray-300';
  const bar = isDark ? 'bg-zinc-700' : 'bg-gray-200';
  const panel = isDark ? 'bg-zinc-800/80' : 'bg-gray-100';
  const accent = isDark ? 'bg-blue-500/30' : 'bg-blue-500/20';

  return (
    <div className={`w-full h-full ${bg} p-2.5 flex flex-col gap-1.5`}>
      <div className="flex gap-1 mb-1">
        <div className={`w-1.5 h-1.5 rounded-full ${dot}`} />
        <div className={`w-1.5 h-1.5 rounded-full ${dot}`} />
        <div className={`w-1.5 h-1.5 rounded-full ${dot}`} />
      </div>
      <div className={`w-4/5 h-1.5 rounded-full ${bar}`} />
      <div className={`w-2/5 h-1.5 rounded-full ${accent}`} />
      <div className={`flex-1 rounded-md ${panel} mt-1`} />
    </div>
  );
}
