import { type LucideIcon } from 'lucide-react';

interface KpiCardProps {
  label: string;
  value: string | number;
  icon: LucideIcon;
  color?: 'cyan' | 'violet' | 'rose' | 'amber' | 'emerald' | 'destructive';
  subtitle?: string;
  trend?: string;
}

const colorMap = {
  cyan: 'text-cyan border-cyan/20 bg-cyan/5',
  violet: 'text-violet border-violet/20 bg-violet/5',
  rose: 'text-rose border-rose/20 bg-rose/5',
  amber: 'text-amber border-amber/20 bg-amber/5',
  emerald: 'text-emerald border-emerald/20 bg-emerald/5',
  destructive: 'text-destructive border-destructive/20 bg-destructive/5',
};

export default function KpiCard({ label, value, icon: Icon, color = 'cyan', subtitle, trend }: KpiCardProps) {
  return (
    <div className={`cockpit-card border ${colorMap[color]} flex flex-col gap-2`}>
      <div className="flex items-center justify-between">
        <span className="text-xs text-muted-foreground uppercase tracking-wider">{label}</span>
        <Icon size={16} className={colorMap[color].split(' ')[0]} />
      </div>
      <div className="flex items-end gap-2">
        <span className="text-2xl font-display font-bold text-foreground">{value}</span>
        {trend && <span className="text-xs text-muted-foreground mb-1">{trend}</span>}
      </div>
      {subtitle && <span className="text-xs text-muted-foreground">{subtitle}</span>}
    </div>
  );
}
