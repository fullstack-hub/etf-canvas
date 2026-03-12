'use client';

interface SegmentedControlProps<T extends string> {
  segments: { id: T; label: string }[];
  active: T;
  onChange: (id: T) => void;
}

export function SegmentedControl<T extends string>({ segments, active, onChange }: SegmentedControlProps<T>) {
  return (
    <div className="flex h-9 rounded-lg bg-muted p-1 gap-0.5">
      {segments.map((seg) => (
        <button
          key={seg.id}
          onClick={() => onChange(seg.id)}
          className={`flex-1 rounded-md text-xs font-medium transition-all ${
            active === seg.id
              ? 'bg-background shadow-sm text-foreground'
              : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          {seg.label}
        </button>
      ))}
    </div>
  );
}
