import { useCanvasStore } from '@/lib/store';

const COLORS = {
  kr: {
    up: '#ef4444', down: '#3b82f6',
    upClass: 'text-red-500', downClass: 'text-blue-500',
    upBg: 'bg-red-500/5 dark:bg-red-500/20', downBg: 'bg-blue-500/5 dark:bg-blue-500/20',
    upBorder: 'border-red-500/20 dark:border-red-500/30', downBorder: 'border-blue-500/20 dark:border-blue-500/30',
    upGlow: 'bg-red-500', downGlow: 'bg-blue-500',
  },
  us: {
    up: '#10b981', down: '#ef4444',
    upClass: 'text-emerald-500', downClass: 'text-red-500',
    upBg: 'bg-emerald-500/5 dark:bg-emerald-500/20', downBg: 'bg-red-500/5 dark:bg-red-500/20',
    upBorder: 'border-emerald-500/20 dark:border-emerald-500/30', downBorder: 'border-red-500/20 dark:border-red-500/30',
    upGlow: 'bg-emerald-500', downGlow: 'bg-red-500',
  },
} as const;

export function useReturnColors() {
  const convention = useCanvasStore((s) => s.colorConvention);
  const c = COLORS[convention];
  return {
    /** hex color for positive return */
    upHex: c.up,
    /** hex color for negative return */
    downHex: c.down,
    /** Tailwind class for positive return text */
    upClass: c.upClass,
    /** Tailwind class for negative return text */
    downClass: c.downClass,
    /** Pick color based on positive/negative */
    hex: (positive: boolean) => positive ? c.up : c.down,
    /** Pick tailwind class based on positive/negative */
    cls: (positive: boolean) => positive ? c.upClass : c.downClass,
    /** Card background class */
    bgCls: (positive: boolean) => positive ? c.upBg : c.downBg,
    /** Card border class */
    borderCls: (positive: boolean) => positive ? c.upBorder : c.downBorder,
    /** Glow background class */
    glowCls: (positive: boolean) => positive ? c.upGlow : c.downGlow,
  };
}

/** Non-hook version for use outside components */
export function getReturnColors() {
  const convention = useCanvasStore.getState().colorConvention;
  return COLORS[convention];
}
