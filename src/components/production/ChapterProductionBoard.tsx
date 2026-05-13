import { STAGE_ORDER, statusColor, type ProductionStatus } from '@/lib/productionDoctrine';

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

export default function ChapterProductionBoard({
  chapter,
  stageStatuses,
}: {
  chapter: { id: string; number: number; title: string; locked?: boolean };
  stageStatuses?: Partial<Record<string, ProductionStatus>>;
}) {
  return (
    <div className="cockpit-card space-y-2">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs font-display font-medium text-foreground">Ch.{chapter.number} — {chapter.title}</p>
          <p className="text-[10px] text-muted-foreground">{chapter.locked ? 'Verrouillé' : 'Non verrouillé'}</p>
        </div>
      </div>
      <div className="flex items-center gap-1">
        {STAGES.map((s) => {
          const status = stageStatuses?.[s.id] ?? 'not_started';
          const c = COLOR[statusColor(status as any)];
          return (
            <div key={s.id} className="flex-1 flex flex-col items-center gap-1">
              <div className={`h-1.5 w-full rounded ${c}`} />
              <span className="text-[9px] uppercase tracking-wider text-muted-foreground">{s.label}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
