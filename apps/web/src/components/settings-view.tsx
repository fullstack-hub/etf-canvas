'use client';

import { useTheme } from 'next-themes';
import { useEffect, useState } from 'react';
import { Sun, Moon, Monitor } from 'lucide-react';

const THEME_OPTIONS = [
  { value: 'light', label: '라이트', icon: Sun, description: '밝은 화면' },
  { value: 'dark', label: '다크', icon: Moon, description: '어두운 화면' },
  { value: 'system', label: '시스템', icon: Monitor, description: '기기 설정에 따름' },
] as const;

export function SettingsView() {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  return (
    <div className="flex-1 overflow-auto">
      <div className="max-w-2xl mx-auto px-6 py-8">
        <h1 className="text-2xl font-bold mb-1">설정</h1>
        <p className="text-sm text-muted-foreground mb-8">앱 환경을 설정하세요</p>

        {/* 화면 모드 */}
        <section>
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-4">화면 모드</h2>
          <div className="grid grid-cols-3 gap-3">
            {THEME_OPTIONS.map(({ value, label, icon: Icon, description }) => {
              const isActive = mounted && theme === value;
              return (
                <button
                  key={value}
                  onClick={() => setTheme(value)}
                  className={`group relative flex flex-col items-center gap-3 rounded-xl border-2 p-5 transition-all
                    ${isActive
                      ? 'border-primary bg-primary/5 shadow-sm'
                      : 'border-transparent bg-muted/40 hover:bg-muted/70 hover:border-border'
                    }`}
                >
                  {/* 미니 프리뷰 */}
                  <div className={`w-full aspect-[4/3] rounded-lg overflow-hidden border transition-colors
                    ${isActive ? 'border-primary/30' : 'border-border/50'}`}
                  >
                    <ThemePreview mode={value} />
                  </div>

                  <div className="flex items-center gap-2">
                    <Icon className={`w-4 h-4 ${isActive ? 'text-primary' : 'text-muted-foreground'}`} />
                    <span className={`text-sm font-medium ${isActive ? 'text-foreground' : 'text-muted-foreground'}`}>
                      {label}
                    </span>
                  </div>
                  <p className="text-[11px] text-muted-foreground/70">{description}</p>

                  {isActive && (
                    <div className="absolute top-2.5 right-2.5 w-2 h-2 rounded-full bg-primary" />
                  )}
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
        {/* 왼쪽: 라이트 */}
        <div className="w-1/2 h-full bg-white p-1.5 flex flex-col gap-1">
          <div className="w-3/4 h-1.5 rounded-full bg-gray-200" />
          <div className="w-1/2 h-1.5 rounded-full bg-gray-200" />
          <div className="flex-1 rounded bg-gray-100 mt-1" />
        </div>
        {/* 오른쪽: 다크 */}
        <div className="w-1/2 h-full bg-zinc-900 p-1.5 flex flex-col gap-1">
          <div className="w-3/4 h-1.5 rounded-full bg-zinc-700" />
          <div className="w-1/2 h-1.5 rounded-full bg-zinc-700" />
          <div className="flex-1 rounded bg-zinc-800 mt-1" />
        </div>
      </div>
    );
  }

  const bg = isDark ? 'bg-zinc-900' : 'bg-white';
  const bar = isDark ? 'bg-zinc-700' : 'bg-gray-200';
  const panel = isDark ? 'bg-zinc-800' : 'bg-gray-100';

  return (
    <div className={`w-full h-full ${bg} p-1.5 flex flex-col gap-1`}>
      <div className={`w-3/4 h-1.5 rounded-full ${bar}`} />
      <div className={`w-1/2 h-1.5 rounded-full ${bar}`} />
      <div className={`flex-1 rounded ${panel} mt-1`} />
    </div>
  );
}
