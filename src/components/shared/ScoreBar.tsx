interface ScoreBarProps {
  value: number;
  max?: number;
  color?: 'cyan' | 'violet' | 'rose' | 'amber' | 'emerald' | 'auto';
  size?: 'sm' | 'md';
  showValue?: boolean;
}

export default function ScoreBar({ value, max = 100, color = 'auto', size = 'sm', showValue = true }: ScoreBarProps) {
  const pct = Math.min(100, (value / max) * 100);
  
  let barColor: string;
  if (color === 'auto') {
    if (value >= 80) barColor = 'bg-emerald';
    else if (value >= 60) barColor = 'bg-cyan';
    else if (value >= 40) barColor = 'bg-amber';
    else barColor = 'bg-destructive';
  } else {
    const map = { cyan: 'bg-cyan', violet: 'bg-violet', rose: 'bg-rose', amber: 'bg-amber', emerald: 'bg-emerald' };
    barColor = map[color];
  }

  return (
    <div className="flex items-center gap-2">
      <div className={`flex-1 bg-surface-2 rounded-full overflow-hidden ${size === 'sm' ? 'h-1.5' : 'h-2.5'}`}>
        <div className={`h-full rounded-full transition-all ${barColor}`} style={{ width: `${pct}%` }} />
      </div>
      {showValue && <span className="text-xs font-mono text-muted-foreground w-8 text-right">{value}</span>}
    </div>
  );
}
