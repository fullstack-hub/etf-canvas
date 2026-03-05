'use client';

import { Slider } from '@/components/ui/slider';

interface Props {
  etfs: { code: string; name: string }[];
  weights: number[];
  onWeightsChange: (weights: number[]) => void;
}

export function WeightSliders({ etfs, weights, onWeightsChange }: Props) {
  const handleChange = (index: number, newValue: number[]) => {
    const value = newValue[0];
    const newWeights = [...weights];
    const diff = value - newWeights[index];
    newWeights[index] = value;

    // Distribute the difference among other ETFs proportionally
    const others = newWeights.filter((_, i) => i !== index);
    const othersSum = others.reduce((a, b) => a + b, 0);

    if (othersSum > 0) {
      for (let i = 0; i < newWeights.length; i++) {
        if (i !== index) {
          newWeights[i] = Math.max(0, Math.round(newWeights[i] - (diff * newWeights[i]) / othersSum));
        }
      }
    }

    // Ensure sum is 100
    const sum = newWeights.reduce((a, b) => a + b, 0);
    if (sum !== 100 && newWeights.length > 1) {
      const adjustIdx = newWeights.findIndex((_, i) => i !== index && newWeights[i] > 0);
      if (adjustIdx >= 0) newWeights[adjustIdx] += 100 - sum;
    }

    onWeightsChange(newWeights);
  };

  return (
    <div className="space-y-4">
      {etfs.map((etf, i) => (
        <div key={etf.code} className="space-y-1">
          <div className="flex justify-between text-sm">
            <span>{etf.name}</span>
            <span className="font-medium">{weights[i]}%</span>
          </div>
          <Slider
            value={[weights[i]]}
            onValueChange={(v) => handleChange(i, v)}
            max={100}
            step={1}
          />
        </div>
      ))}
    </div>
  );
}
