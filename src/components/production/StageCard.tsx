import { useNavigate } from 'react-router-dom';
import type { StageState } from '@/services/productionFlowService';
import { STAGE_ORDER, nextRecommendedAction } from '@/lib/productionDoctrine';
import ProductionStatusBadge from './ProductionStatusBadge';
import { AlertTriangle, ArrowRight } from 'lucide-react';

const STAGE_ROUTE: Record<string, string> = {
  canon: '/canon',
  architecture: '/architecture',
  chapter_plan: '/architecture',
  planned_beats: '/architecture',
  beat_validation: '/architecture',
  chapter_generation: '/runs',
  observed_beats: '/architecture',
  chapter_audit: '/runs',
  targeted_rewrite: '/runs',
  chapter_lock: '/architecture',
  meta_audit: '/runs',
  export: '/exports',
};

export default function StageCard({ state }: { state: StageState }) {
  const nav = useNavigate();
  const meta = STAGE_ORDER.find((s) => s.id === state.stage);
  return (
    <div className="cockpit-card space-y-2">
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="editorial-eyebrow">{meta?.label}</p>
          <p className="text-xs text-muted-foreground mt-0.5">
            {state.count} objet{state.count > 1 ? 's' : ''} · {state.source === 'live' ? 'données live' : 'design target'}
          </p>
        </div>
        <ProductionStatusBadge status={state.status as any} />
      </div>
      {state.blockers.length > 0 && (
        <ul className="text-[11px] text-amber-700 space-y-1">
          {state.blockers.map((b) => (
            <li key={b} className="flex items-start gap-1.5"><AlertTriangle size={11} className="mt-0.5 shrink-0" />{b}</li>
          ))}
        </ul>
      )}
      <div className="flex items-center justify-between pt-1">
        <span className="text-[10px] text-muted-foreground">Action: {nextRecommendedAction(state.status as any)}</span>
        <button
          onClick={() => nav(STAGE_ROUTE[state.stage] ?? '/')}
          className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
        >
          Ouvrir <ArrowRight size={11} />
        </button>
      </div>
    </div>
  );
}
