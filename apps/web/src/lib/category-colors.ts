/** 카테고리별 색상 (Tailwind class + hex) — 단일 소스 */
export const CATEGORY_COLORS: Record<string, { bar: string; bg: string; dot: string; hex: string }> = {
  '국내 대표지수': { bar: 'bg-blue-500', bg: 'bg-blue-500/[0.07]', dot: 'bg-blue-500', hex: '#3b82f6' },
  '해외 대표지수': { bar: 'bg-teal-500', bg: 'bg-teal-500/[0.07]', dot: 'bg-teal-500', hex: '#14b8a6' },
  '섹터/테마': { bar: 'bg-violet-500', bg: 'bg-violet-500/[0.07]', dot: 'bg-violet-500', hex: '#8b5cf6' },
  '액티브': { bar: 'bg-fuchsia-500', bg: 'bg-fuchsia-500/[0.07]', dot: 'bg-fuchsia-500', hex: '#d946ef' },
  '채권': { bar: 'bg-lime-500', bg: 'bg-lime-500/[0.07]', dot: 'bg-lime-500', hex: '#84cc16' },
  '혼합': { bar: 'bg-orange-400', bg: 'bg-orange-400/[0.07]', dot: 'bg-orange-400', hex: '#fb923c' },
  '원자재': { bar: 'bg-amber-500', bg: 'bg-amber-500/[0.07]', dot: 'bg-amber-500', hex: '#f59e0b' },
  '레버리지/인버스': { bar: 'bg-red-500', bg: 'bg-red-500/[0.07]', dot: 'bg-red-500', hex: '#ef4444' },
  _default: { bar: 'bg-gray-400', bg: 'bg-gray-400/[0.07]', dot: 'bg-gray-400', hex: '#9ca3af' },
};

export function getCatColor(category?: string) {
  return CATEGORY_COLORS[category || ''] || CATEGORY_COLORS._default;
}

/** recharts 등 hex가 필요한 곳용 */
export function getCatHex(category?: string): string {
  return getCatColor(category).hex;
}
