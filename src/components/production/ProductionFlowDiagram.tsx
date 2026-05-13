import { STAGE_ORDER, statusColor } from '@/lib/productionDoctrine';
import type { StageState } from '@/services/productionFlowService';
import ProductionStatusBadge from './ProductionStatusBadge';
import { ChevronRight } from 'lucide-react';

const NODE_COLOR: Record<ReturnType<typeof statusColor>, string> = {
  green: 'border-emerald-500/50 bg-emerald-500/10',
  amber: 'border-amber-500/50 bg-amber-500/10',
  red: 'border-rose-500/50 bg-rose-500/10',
  blue: 'border-sky-500/50 bg-sky-500/10',
  grey: 'border-slate-500/30 bg-slate-500/5',
};

export default function ProductionFlowDiagram({
  stages,
  onSelect,
}: {
  stages: StageState[];
  onSelect?: (stage: StageState) => void;
}) {
  const byId = new Map(stages.map((s) => [s.stage, s]));
  return (
    <div className="cockpit-card">
      <h3 className="editorial-eyebrow mb-3">Chaîne de production</h3>
      <div className="flex flex-wrap items-center gap-2">
        {STAGE_ORDER.map((stage, i) => {
          const s = byId.get(stage.id);
          const c = s ? statusColor(s.status as any) : 'grey';
          return (
            <div key={stage.id} className="flex items-center gap-2">
              <button
                onClick={() => s && onSelect?.(s)}
                className={`flex flex-col items-start gap-1 px-3 py-2 rounded-lg border text-left min-w-[140px] transition-colors hover:opacity-90 ${NODE_COLOR[c]}`}
              >
                <span className="text-[10px] uppercase tracking-wider text-muted-foreground">{i + 1}</span>
                <span className="text-xs font-display font-medium text-foreground">{stage.label}</span>
                {s && <ProductionStatusBadge status={s.status as any} />}
                {s?.source === 'mock' && (
                  <span className="text-[9px] font-mono text-muted-foreground">design target</span>
                )}
              </button>
              {i < STAGE_ORDER.length - 1 && <ChevronRight size={14} className="text-muted-foreground/60" />}
            </div>
          );
        })}
      </div>
    </div>
  );
}
