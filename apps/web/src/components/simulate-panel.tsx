'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { useCanvasStore } from '@/lib/store';
import { WeightSliders } from '@/components/weight-slider';
import { SimulationChart } from '@/components/simulation-chart';
import { SimulationSummary } from '@/components/simulation-summary';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

const periodOptions = [
  { value: '1m', label: '1개월' },
  { value: '3m', label: '3개월' },
  { value: '6m', label: '6개월' },
  { value: '1y', label: '1년' },
  { value: '3y', label: '3년' },
];

export function SimulatePanel() {
  const { comparing, selected, setActiveView } = useCanvasStore();
  const etfsToSimulate = selected.filter((s) => comparing.includes(s.code));

  const [weights, setWeights] = useState<number[]>(() => {
    const n = etfsToSimulate.length || 1;
    const base = Math.floor(100 / n);
    const arr = Array(n).fill(base);
    arr[0] += 100 - base * n;
    return arr;
  });
  const [amount, setAmount] = useState(10_000_000);
  const [period, setPeriod] = useState('1y');
  const [runSimulation, setRunSimulation] = useState(false);

  const { data: result, isLoading } = useQuery({
    queryKey: ['simulate', comparing, weights, amount, period],
    queryFn: () => api.simulate({ codes: comparing, weights, amount, period }),
    enabled: runSimulation && comparing.length > 0,
  });

  if (comparing.length === 0) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center gap-4 text-muted-foreground">
        <p>비교할 ETF를 먼저 선택해주세요.</p>
        <Button onClick={() => setActiveView('canvas')}>캔버스로 이동</Button>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-auto p-6 space-y-6">
      <h2 className="text-2xl font-bold">포트폴리오 시뮬레이션</h2>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-4">
            <h3 className="text-sm font-medium mb-3">비중 설정</h3>
            <WeightSliders
              etfs={etfsToSimulate.map((e) => ({ code: e.code, name: e.name }))}
              weights={weights}
              onWeightsChange={setWeights}
            />
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4 space-y-3">
            <h3 className="text-sm font-medium">투자 조건</h3>
            <div>
              <label className="text-xs text-muted-foreground">투자금액 (원)</label>
              <Input
                type="number"
                value={amount}
                onChange={(e) => setAmount(Number(e.target.value))}
                step={1_000_000}
                min={1_000_000}
                className="h-8"
              />
            </div>
            <div>
              <label className="text-xs text-muted-foreground">기간</label>
              <Select value={period} onValueChange={setPeriod}>
                <SelectTrigger className="h-8"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {periodOptions.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        <Card className="flex items-center justify-center">
          <Button onClick={() => setRunSimulation(true)} disabled={isLoading}>
            {isLoading ? '계산 중...' : '시뮬레이션 실행'}
          </Button>
        </Card>
      </div>

      {result && (
        <>
          <SimulationSummary result={result} amount={amount} />
          <Card>
            <CardContent className="p-4">
              <h3 className="text-sm font-medium mb-3">포트폴리오 가치 변화</h3>
              <SimulationChart result={result} />
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
