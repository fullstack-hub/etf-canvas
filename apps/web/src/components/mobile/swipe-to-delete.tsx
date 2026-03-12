'use client';

import { useRef, useState } from 'react';
import { Trash2 } from 'lucide-react';

interface SwipeToDeleteProps {
  onDelete: () => void;
  children: React.ReactNode;
}

const DELETE_THRESHOLD = 80;

export function SwipeToDelete({ onDelete, children }: SwipeToDeleteProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const startXRef = useRef(0);
  const currentXRef = useRef(0);
  const [offsetX, setOffsetX] = useState(0);
  const [swiping, setSwiping] = useState(false);

  const handleTouchStart = (e: React.TouchEvent) => {
    startXRef.current = e.touches[0].clientX;
    currentXRef.current = 0;
    setSwiping(true);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!swiping) return;
    const diff = startXRef.current - e.touches[0].clientX;
    currentXRef.current = diff;
    if (diff > 0) {
      setOffsetX(Math.min(diff, DELETE_THRESHOLD + 20));
    }
  };

  const handleTouchEnd = () => {
    setSwiping(false);
    if (currentXRef.current > DELETE_THRESHOLD) {
      setOffsetX(DELETE_THRESHOLD);
    } else {
      setOffsetX(0);
    }
  };

  return (
    <div className="relative overflow-hidden">
      <div className="absolute inset-y-0 right-0 flex items-center">
        <button
          onClick={onDelete}
          className="w-20 h-full bg-destructive flex items-center justify-center text-destructive-foreground"
        >
          <Trash2 className="w-5 h-5" />
        </button>
      </div>
      <div
        ref={containerRef}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        className="relative bg-background transition-transform"
        style={{
          transform: `translateX(-${offsetX}px)`,
          transition: swiping ? 'none' : 'transform 200ms ease-out',
        }}
      >
        {children}
      </div>
    </div>
  );
}
