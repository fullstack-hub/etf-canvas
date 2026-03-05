'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { useCanvasStore } from '@/lib/store';
import { WeightSliders } from '@/components/weight-slider';
import { SimulationChart } from '@/components/simulation-chart';
import { SimulationSummary } from '@/components/simulation-summary';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import Link from 'next/link';

const periodOptions = [
  { value: '1m', label: '1개월' },
  { value: '3m', label: '3개월' },
  { value: '6m', label: '6개월' },
  { value: '1y', label: '1년' },
  { value: '3y', label: '3년' },
];

export default function SimulatePage() {
  const { comparing, selected } = useCanvasStore();
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
    queryFn: () => api.simulate({
      codes: comparing,
      weights,
      amount,
      period,
    }),
    enabled: runSimulation && comparing.length > 0,
  });

  if (comparing.length === 0) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center space-y-4">
          <p className="text-muted-foreground">비교할 ETF를 먼저 선택해주세요.</p>
          <Link href="/canvas"><Button>캔버스로 이동</Button></Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b">
        <div className="container mx-auto px-4 py-4 flex items-center gap-4">
          <Link href="/canvas" className="text-muted-foreground hover:text-foreground">← 캔버스</Link>
          <h1 className="text-2xl font-bold">포트폴리오 시뮬레이션</h1>
        </div>
      </header>

      <main className="container mx-auto px-4 py-6 space-y-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <Card>
            <CardHeader><CardTitle>비중 설정</CardTitle></CardHeader>
            <CardContent>
              <WeightSliders
                etfs={etfsToSimulate.map((e) => ({ code: e.code, name: e.name }))}
                weights={weights}
                onWeightsChange={setWeights}
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle>투자 조건</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="text-sm text-muted-foreground">투자금액 (원)</label>
                <Input
                  type="number"
                  value={amount}
                  onChange={(e) => setAmount(Number(e.target.value))}
                  step={1_000_000}
                  min={1_000_000}
                />
              </div>
              <div>
                <label className="text-sm text-muted-foreground">기간</label>
                <Select value={period} onValueChange={setPeriod}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
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
            <Button
              size="lg"
              onClick={() => setRunSimulation(true)}
              disabled={isLoading}
            >
              {isLoading ? '계산 중...' : '시뮬레이션 실행'}
            </Button>
          </Card>
        </div>

        {result && (
          <>
            <SimulationSummary result={result} amount={amount} />
            <Card>
              <CardHeader><CardTitle>포트폴리오 가치 변화</CardTitle></CardHeader>
              <CardContent>
                <SimulationChart result={result} />
              </CardContent>
            </Card>
          </>
        )}
      </main>
    </div>
  );
}
