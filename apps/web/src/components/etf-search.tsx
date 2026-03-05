'use client';

import { useState, useEffect } from 'react';
import { Input } from '@/components/ui/input';

interface Props {
  onSearch: (query: string) => void;
}

export function EtfSearch({ onSearch }: Props) {
  const [value, setValue] = useState('');

  useEffect(() => {
    const timer = setTimeout(() => onSearch(value), 300);
    return () => clearTimeout(timer);
  }, [value, onSearch]);

  return (
    <Input
      placeholder="ETF 이름 또는 종목코드 검색..."
      value={value}
      onChange={(e) => setValue(e.target.value)}
      className="max-w-md"
    />
  );
}
