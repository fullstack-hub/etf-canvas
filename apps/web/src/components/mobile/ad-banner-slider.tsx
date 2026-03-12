'use client';

import { useEffect, useRef, useState, useCallback } from 'react';

const PLACEHOLDER_BANNERS = [
  { id: 1, gradient: 'from-blue-600 to-indigo-700', text: '나만의 ETF 포트폴리오' },
  { id: 2, gradient: 'from-emerald-600 to-teal-700', text: 'ETF로 시작하는 투자' },
  { id: 3, gradient: 'from-violet-600 to-purple-700', text: '수익률 시뮬레이션' },
];

export function AdBannerSlider() {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [current, setCurrent] = useState(0);
  const intervalRef = useRef<ReturnType<typeof setInterval> | undefined>(undefined);

  const scrollTo = useCallback((index: number) => {
    scrollRef.current?.scrollTo({ left: index * scrollRef.current.clientWidth, behavior: 'smooth' });
  }, []);

  useEffect(() => {
    intervalRef.current = setInterval(() => {
      setCurrent((prev) => {
        const next = (prev + 1) % PLACEHOLDER_BANNERS.length;
        scrollTo(next);
        return next;
      });
    }, 3000);
    return () => clearInterval(intervalRef.current);
  }, [scrollTo]);

  const handleScroll = () => {
    const el = scrollRef.current;
    if (!el) return;
    const index = Math.round(el.scrollLeft / el.clientWidth);
    if (index !== current) {
      setCurrent(index);
      clearInterval(intervalRef.current);
      intervalRef.current = setInterval(() => {
        setCurrent((prev) => {
          const next = (prev + 1) % PLACEHOLDER_BANNERS.length;
          scrollTo(next);
          return next;
        });
      }, 3000);
    }
  };

  return (
    <div className="relative">
      <div
        ref={scrollRef}
        onScroll={handleScroll}
        className="flex snap-x snap-mandatory scroll-x-hide"
      >
        {PLACEHOLDER_BANNERS.map((banner) => (
          <div
            key={banner.id}
            className={`w-full shrink-0 snap-center aspect-[2.5/1] rounded-xl bg-gradient-to-br ${banner.gradient} flex items-center justify-center`}
          >
            <span className="text-white font-bold text-lg">{banner.text}</span>
          </div>
        ))}
      </div>
      <div className="flex justify-center gap-1.5 mt-2">
        {PLACEHOLDER_BANNERS.map((_, i) => (
          <button
            key={i}
            onClick={() => { scrollTo(i); setCurrent(i); }}
            className={`w-1.5 h-1.5 rounded-full transition-colors ${
              i === current ? 'bg-primary' : 'bg-muted-foreground/30'
            }`}
          />
        ))}
      </div>
    </div>
  );
}
