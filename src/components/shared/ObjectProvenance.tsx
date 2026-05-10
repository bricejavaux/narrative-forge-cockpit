import { Database, HardDrive, FileText, Mic, Save, RefreshCw, CheckCircle2, Clock } from 'lucide-react';

export type Provenance = {
  sourceFile?: string | null; // OneDrive remote path
  activeRecord?: string | null; // Supabase table.row label
  lastModified?: string | null; // ISO or human date
  version?: number | null;
  validationStatus?: 'pending' | 'reviewed' | 'validated' | 'draft' | string | null;
  needsIndexRefresh?: boolean;
  needsReview?: boolean;
};

type Props = {
  provenance: Provenance;
  onAddTextNote?: () => void;
  onAddAudioNote?: () => void;
  onSave?: () => void;
  saving?: boolean;
  disabled?: boolean;
};

const Pill = ({ children, tone = 'neutral' }: { children: React.ReactNode; tone?: 'neutral' | 'ok' | 'warn' | 'info' }) => {
  const cls = {
    neutral: 'bg-muted/40 text-muted-foreground border-border/60',
    ok: 'bg-emerald-500/10 text-emerald-600 border-emerald-500/30',
    warn: 'bg-amber-500/10 text-amber-700 border-amber-500/30',
    info: 'bg-sky-500/10 text-sky-700 border-sky-500/30',
  }[tone];
  return <span className={`text-[10px] font-mono px-1.5 py-0.5 rounded border ${cls}`}>{children}</span>;
};

export default function ObjectProvenance({ provenance: p, onAddTextNote, onAddAudioNote, onSave, saving, disabled }: Props) {
  const validatedTone =
    p.validationStatus === 'validated' ? 'ok' :
    p.validationStatus === 'reviewed' ? 'info' :
    p.validationStatus === 'pending' ? 'warn' : 'neutral';

  return (
    <div className="rounded-lg border border-border/60 bg-card/40 p-3 space-y-2">
      <div className="flex flex-wrap items-center gap-2">
        <span className="inline-flex items-center gap-1.5 text-[11px] text-muted-foreground">
          <HardDrive className="w-3 h-3" /> Source : OneDrive
        </span>
        <code className="text-[10px] font-mono text-foreground/80 truncate max-w-[60%]">{p.sourceFile ?? '—'}</code>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <span className="inline-flex items-center gap-1.5 text-[11px] text-muted-foreground">
          <Database className="w-3 h-3" /> Enregistrement actif : Supabase
        </span>
        <code className="text-[10px] font-mono text-foreground/80">{p.activeRecord ?? '—'}</code>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <Pill tone="neutral">v{p.version ?? '?'}</Pill>
        <Pill tone={validatedTone as any}>{p.validationStatus ?? 'draft'}</Pill>
        {p.needsReview && <Pill tone="warn">review requise</Pill>}
        <Pill tone={p.needsIndexRefresh ? 'warn' : 'ok'}>
          index {p.needsIndexRefresh ? 'à rafraîchir' : 'à jour'}
        </Pill>
        <span className="inline-flex items-center gap-1 text-[10px] text-muted-foreground ml-auto">
          <Clock className="w-3 h-3" /> {p.lastModified ?? '—'}
        </span>
      </div>
      <p className="text-[10px] text-muted-foreground italic">
        Les modifications mettent à jour Supabase. Export vers OneDrive : manuel uniquement.
      </p>
      <div className="flex flex-wrap items-center gap-2 pt-1">
        <button
          type="button"
          onClick={onAddTextNote}
          disabled={disabled}
          className="text-[11px] px-2 py-1 rounded-md border border-border bg-card hover:bg-accent disabled:opacity-50 inline-flex items-center gap-1"
        >
          <FileText className="w-3 h-3" /> Note texte
        </button>
        <button
          type="button"
          onClick={onAddAudioNote}
          disabled={disabled}
          className="text-[11px] px-2 py-1 rounded-md border border-border bg-card hover:bg-accent disabled:opacity-50 inline-flex items-center gap-1"
        >
          <Mic className="w-3 h-3" /> Note audio
        </button>
        <button
          type="button"
          onClick={onSave}
          disabled={disabled || saving}
          className="text-[11px] px-2 py-1 rounded-md border border-primary/40 bg-primary/10 text-primary hover:bg-primary/15 disabled:opacity-50 inline-flex items-center gap-1 ml-auto"
        >
          {saving ? <RefreshCw className="w-3 h-3 animate-spin" /> : <Save className="w-3 h-3" />}
          Enregistrer dans Supabase
        </button>
      </div>
    </div>
  );
}

export { Pill as ProvenancePill, CheckCircle2 as ProvenanceCheck };
