import { Link } from 'react-router-dom';
import { ChevronRight } from 'lucide-react';

export type StageStatus = 'live' | 'pending' | 'blocked' | 'future' | 'mock' | 'active';

export type ProductionStage = {
  step: number;
  name: string;
  status: StageStatus;
  inputs?: string;
  blocker?: string;
  nextAction?: string;
  route?: string;
  mockFallback?: boolean;
};

const STATUS_BG: Record<StageStatus, string> = {
  live: 'bg-emerald-500/15 border-emerald-500/40 text-emerald-700',
  active: 'bg-blue-500/15 border-blue-500/40 text-blue-700',
  pending: 'bg-amber-500/15 border-amber-500/40 text-amber-700',
  blocked: 'bg-rose-500/15 border-rose-500/40 text-rose-700',
  future: 'bg-violet-500/10 border-violet-500/30 text-violet-700',
  mock: 'bg-slate-500/10 border-slate-500/30 text-slate-600',
};

export const DEFAULT_STAGES: ProductionStage[] = [
  { step: 1, name: 'Canon actif', status: 'mock', mockFallback: true, route: '/canon', blocker: 'Aucun canon_object actif en Supabase.', nextAction: 'Importer articulation.txt.' },
  { step: 2, name: 'Architecture Tome', status: 'mock', mockFallback: true, route: '/architecture' },
  { step: 3, name: 'Plan chapitre', status: 'mock', mockFallback: true, route: '/architecture' },
  { step: 4, name: 'Beats prévus', status: 'pending', route: '/production', blocker: 'Beats prévus non générés.' },
  { step: 5, name: 'Validation beats', status: 'pending', route: '/production', blocker: 'Validation humaine requise.' },
  { step: 6, name: 'Génération chapitre', status: 'blocked', route: '/production', blocker: 'Beats validés requis.' },
  { step: 7, name: 'Beats observés', status: 'future', route: '/production' },
  { step: 8, name: 'Audit chapitre', status: 'future', route: '/production' },
  { step: 9, name: 'Réécriture ciblée', status: 'future', route: '/production' },
  { step: 10, name: 'Verrouillage chapitre', status: 'future', route: '/production' },
  { step: 11, name: 'Audit méta-tome', status: 'future', route: '/production' },
  { step: 12, name: 'Export', status: 'pending', route: '/exports' },
];

export default function ProductionFlowPanel({
  stages = DEFAULT_STAGES,
  title = 'Chaîne de production',
  compact = false,
}: {
  stages?: ProductionStage[];
  title?: string;
  compact?: boolean;
}) {
  return (
    <div className="cockpit-card space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-display font-semibold text-foreground">{title}</h3>
        <span className="text-[10px] font-mono text-muted-foreground">
          12 étapes · vert=live · ambre=pending · rouge=bloqué · gris=mock · violet=futur
        </span>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2">
        {stages.map((s) => {
          const Inner = (
            <div className={`rounded border p-2 ${STATUS_BG[s.status]} h-full`}>
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-mono opacity-70">#{s.step}</span>
                <span className="text-[9px] font-mono uppercase">{s.status}</span>
              </div>
              <p className="text-[11px] font-display font-semibold mt-1 leading-tight">{s.name}</p>
              {!compact && s.blocker && (
                <p className="text-[10px] opacity-80 mt-1 leading-snug">{s.blocker}</p>
              )}
              {!compact && s.nextAction && (
                <p className="text-[10px] mt-1 flex items-center gap-0.5 opacity-90">
                  <ChevronRight size={9} /> {s.nextAction}
                </p>
              )}
              {s.mockFallback && (
                <span className="inline-block mt-1 text-[9px] font-mono px-1 rounded border border-current opacity-70">
                  mock fallback
                </span>
              )}
            </div>
          );
          return s.route ? (
            <Link key={s.step} to={s.route} className="block hover:opacity-90 transition-opacity">{Inner}</Link>
          ) : (
            <div key={s.step}>{Inner}</div>
          );
        })}
      </div>
    </div>
  );
}
