interface StatusBadgeProps {
  status: string;
  className?: string;
}

const statusStyles: Record<string, string> = {
  connected: 'text-emerald bg-emerald/10 border-emerald/30',
  not_connected: 'text-destructive bg-destructive/10 border-destructive/30',
  simulated: 'text-amber bg-amber/10 border-amber/30',
  warning: 'text-amber bg-amber/10 border-amber/30',
  critical: 'text-destructive bg-destructive/10 border-destructive/30',
  active: 'text-emerald bg-emerald/10 border-emerald/30',
  stale: 'text-amber bg-amber/10 border-amber/30',
  absent: 'text-destructive bg-destructive/10 border-destructive/30',
  empty: 'text-muted-foreground bg-muted/50 border-border',
  draft: 'text-muted-foreground bg-muted/50 border-border',
  reviewed: 'text-cyan bg-cyan/10 border-cyan/30',
  rewritten: 'text-violet bg-violet/10 border-violet/30',
  validated: 'text-emerald bg-emerald/10 border-emerald/30',
  exported: 'text-primary bg-primary/10 border-primary/30',
  ready: 'text-emerald bg-emerald/10 border-emerald/30',
  disabled: 'text-muted-foreground bg-muted/50 border-border',
  pending: 'text-amber bg-amber/10 border-amber/30',
  completed: 'text-emerald bg-emerald/10 border-emerald/30',
  failed: 'text-destructive bg-destructive/10 border-destructive/30',
  indexed: 'text-emerald bg-emerald/10 border-emerald/30',
  not_indexed: 'text-muted-foreground bg-muted/50 border-border',
  partial: 'text-amber bg-amber/10 border-amber/30',
  integrated: 'text-emerald bg-emerald/10 border-emerald/30',
  transcribed: 'text-cyan bg-cyan/10 border-cyan/30',
  structured: 'text-violet bg-violet/10 border-violet/30',
  open: 'text-amber bg-amber/10 border-amber/30',
  in_progress: 'text-cyan bg-cyan/10 border-cyan/30',
  done: 'text-emerald bg-emerald/10 border-emerald/30',
  rejected: 'text-muted-foreground bg-muted/50 border-border',
  high: 'text-destructive bg-destructive/10 border-destructive/30',
  medium: 'text-amber bg-amber/10 border-amber/30',
  low: 'text-muted-foreground bg-muted/50 border-border',
  principal: 'text-cyan bg-cyan/10 border-cyan/30',
  secondaire: 'text-violet bg-violet/10 border-violet/30',
  'sous-jacent': 'text-rose bg-rose/10 border-rose/30',
};

export default function StatusBadge({ status, className = '' }: StatusBadgeProps) {
  const style = statusStyles[status] || 'text-muted-foreground bg-muted/50 border-border';
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-mono border ${style} ${className}`}>
      {status.replace(/_/g, ' ')}
    </span>
  );
}
