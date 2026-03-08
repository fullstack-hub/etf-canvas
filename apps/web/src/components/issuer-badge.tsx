'use client';

import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

const ISSUER_STYLE: Record<string, { bg: string; text: string }> = {
  '삼성자산운용':       { bg: 'bg-[#034EA2]', text: 'text-white' },
  '미래에셋자산운용':   { bg: 'bg-[#F37321]', text: 'text-white' },
  '한국투자신탁운용':   { bg: 'bg-[#003DA5]', text: 'text-white' },
  '한국투신운용':       { bg: 'bg-[#003DA5]', text: 'text-white' },
  'KB자산운용':         { bg: 'bg-[#FFCC00]', text: 'text-black' },
  '신한자산운용':       { bg: 'bg-[#0046FF]', text: 'text-white' },
  'NH-Amundi자산운용':  { bg: 'bg-[#00A651]', text: 'text-white' },
  '한화자산운용':       { bg: 'bg-[#FF6600]', text: 'text-white' },
  '키움투자자산운용':   { bg: 'bg-[#E31837]', text: 'text-white' },
  '타임폴리오자산운용': { bg: 'bg-[#1A1A1A]', text: 'text-white' },
  '삼성액티브자산':     { bg: 'bg-[#034EA2]', text: 'text-white' },
  '하나자산운용':       { bg: 'bg-[#009775]', text: 'text-white' },
  '우리자산운용':       { bg: 'bg-[#0056A6]', text: 'text-white' },
  'BNK자산운용':        { bg: 'bg-[#004B87]', text: 'text-white' },
};

const DEFAULT_STYLE = { bg: 'bg-muted', text: 'text-muted-foreground' };

export function IssuerBadge({ issuer, size = 'sm' }: { issuer: string; size?: 'sm' | 'md' | 'lg' }) {
  const style = ISSUER_STYLE[issuer] || DEFAULT_STYLE;
  const cls = size === 'lg' ? 'h-[18px] px-1 text-[9px] rounded'
    : size === 'md' ? 'h-[16px] px-1 text-[8px] rounded'
    : 'h-[12px] px-0.5 text-[6px] rounded-sm';

  return (
    <TooltipProvider delayDuration={200}>
      <Tooltip>
        <TooltipTrigger asChild>
          <span className={`${cls} ${style.bg} ${style.text} inline-flex items-center justify-center font-bold shrink-0 leading-none whitespace-nowrap`}>
            {issuer}
          </span>
        </TooltipTrigger>
        <TooltipContent side="bottom" className="text-xs">{issuer}</TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
