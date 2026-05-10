import { AlertTriangle, XCircle, Info } from 'lucide-react';

interface WarningBannerProps {
  warnings: { text: string; severity: 'critical' | 'warning' | 'info' }[];
}

export default function WarningBanner({ warnings }: WarningBannerProps) {
  return (
    <div className="rounded-xl border border-amber/30 bg-amber/5 p-4 mb-6 animate-slide-in">
      <div className="flex items-center gap-2 mb-3">
        <AlertTriangle size={14} className="text-amber" />
        <span className="editorial-eyebrow !text-amber">Dépendances non branchées — prototype</span>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
        {warnings.map((w, i) => (
          <div key={i} className="flex items-start gap-2 text-xs">
            {w.severity === 'critical' ? (
              <XCircle size={12} className="text-destructive mt-0.5 shrink-0" />
            ) : w.severity === 'warning' ? (
              <AlertTriangle size={12} className="text-amber mt-0.5 shrink-0" />
            ) : (
              <Info size={12} className="text-primary mt-0.5 shrink-0" />
            )}
            <span className="text-foreground/80 leading-relaxed">{w.text}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
