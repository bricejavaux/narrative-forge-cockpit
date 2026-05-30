import { STAGE_ORDER, statusColor, type ProductionStatus } from '@/lib/productionDoctrine';
import { Lock } from 'lucide-react';

const STAGES: { id: string; label: string }[] = [
  { id: 'architecture', label: 'Archi' },
  { id: 'planned_beats', label: 'Beats prévus' },
  { id: 'beat_validation', label: 'Valid.' },
  { id: 'chapter_generation', label: 'Génération' },
  { id: 'chapter_audit', label: 'Audit' },
  { id: 'targeted_rewrite', label: 'Réécriture' },
  { id: 'chapter_lock', label: 'Lock' },
  { id: 'export', label: 'Export' },
];

const COLOR: Record<string, string> = {
  green: 'bg-emerald-500',
  amber: 'bg-amber-500',
  red: 'bg-rose-500',
  blue: 'bg-sky-500',
  grey: 'bg-slate-400/40',
};

const LOCK_HINT =
  "Verrouillé = stable pour la suite. Réouvrir nécessite une justification et marque les dépendances aval comme potentiellement obsolètes.";

export default function ChapterProductionBoard({
  chapter,
  stageStatuses,
  selected,
}: {
  chapter: { id: string; number: number; title: string; locked?: boolean; production_status?: string | null };
  stageStatuses?: Partial<Record<string, ProductionStatus>>;
  selected?: boolean;
}) {
  return (
    <div className={`cockpit-card space-y-2 ${selected ? 'ring-2 ring-primary/40' : ''}`}>
      <div className="flex items-center justify-between">
        <div className="min-w-0">
          <p className="text-xs font-display font-medium text-foreground truncate">
            Ch.{chapter.number} — {chapter.title}
          </p>
          <p className="text-[10px] text-muted-foreground">
            Statut : {chapter.production_status ?? 'architecture_planned'}
          </p>
        </div>
        {chapter.locked && (
          <span title={LOCK_HINT} className="inline-flex items-center gap-1 text-[9px] font-mono px-1.5 py-0.5 rounded border border-emerald-500/40 bg-emerald-500/5 text-emerald-700 cursor-help">
            <Lock size={9} /> verrouillé
          </span>
        )}
      </div>
      <div className="flex items-center gap-1">
        {STAGES.map((s) => {
          const status = stageStatuses?.[s.id] ?? 'not_started';
          const c = COLOR[statusColor(status as any)];
          return (
            <div key={s.id} className="flex-1 flex flex-col items-center gap-1" title={`${s.label}: ${status}`}>
              <div className={`h-1.5 w-full rounded ${c}`} />
              <span className="text-[9px] uppercase tracking-wider text-muted-foreground">{s.label}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export function ChapterBoardLegend() {
  const items = [
    { c: 'bg-emerald-500', l: 'validé / live' },
    { c: 'bg-amber-500', l: 'à revoir' },
    { c: 'bg-rose-500', l: 'bloqué / erreur' },
    { c: 'bg-sky-500', l: 'actif' },
    { c: 'bg-slate-400/40', l: 'non commencé' },
  ];
  return (
    <div className="flex items-center gap-3 text-[10px] text-muted-foreground flex-wrap">
      {items.map((i) => (
        <span key={i.l} className="inline-flex items-center gap-1.5">
          <span className={`inline-block w-2.5 h-1.5 rounded ${i.c}`} /> {i.l}
        </span>
      ))}
    </div>
  );
}
