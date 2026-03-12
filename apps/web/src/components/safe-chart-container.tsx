'use client';

import { useState, useRef, useEffect, useCallback, type ReactNode } from 'react';

/**
 * ResponsiveContainer 대체 — 부모 크기를 측정해서 children에 width/height를 props로 전달.
 * children은 (width, height) => ReactNode 형태의 render function.
 * 크기가 0 이하면 렌더하지 않음 → recharts width(-1) 경고 완전 차단.
 */
export function SafeChartContainer({ children, className, style }: {
  children: ReactNode | ((size: { width: number; height: number }) => ReactNode);
  className?: string;
  style?: React.CSSProperties;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState<{ width: number; height: number } | null>(null);

  const measure = useCallback(() => {
    const el = ref.current;
    if (!el) return;
    const { width, height } = el.getBoundingClientRect();
    if (width > 0 && height > 0) {
      setSize((prev) => (prev && prev.width === Math.floor(width) && prev.height === Math.floor(height)) ? prev : { width: Math.floor(width), height: Math.floor(height) });
    } else {
      setSize(null);
    }
  }, []);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new ResizeObserver(() => measure());
    observer.observe(el);
    measure();
    return () => observer.disconnect();
  }, [measure]);

  const ready = size !== null;

  return (
    <div ref={ref} className={className} style={style}>
      {ready && (typeof children === 'function' ? children(size) : children)}
    </div>
  );
}
