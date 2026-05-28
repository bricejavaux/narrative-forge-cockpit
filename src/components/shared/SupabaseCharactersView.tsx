import { useEffect, useMemo, useState } from 'react';
import { CheckCircle2, AlertTriangle, RefreshCw, User, Loader2 } from 'lucide-react';
import { supabaseService, type ActiveCharacter } from '@/services/supabaseService';
import NoteComposer from '@/components/shared/NoteComposer';
import ScoreBar from '@/components/shared/ScoreBar';

export default function SupabaseCharactersView({ records, onRefresh }: { records: ActiveCharacter[]; onRefresh: () => void }) {
  const [selectedId, setSelectedId] = useState<string | null>(records[0]?.id ?? null);
  const [busy, setBusy] = useState<string | null>(null);

  useEffect(() => { if (!selectedId && records.length) setSelectedId(records[0].id); }, [records, selectedId]);

  const sorted = useMemo(() => [...records].sort((a, b) => (b.narrative_weight ?? 0) - (a.narrative_weight ?? 0)), [records]);
  const selected = records.find((r) => r.id === selectedId);

  const markReviewed = async (id: string) => {
    setBusy(id);
    await supabaseService.updateCharacter(id, { needs_review: false, validation_status: 'validated' });
    setBusy(null);
    onRefresh();
  };

  return (
    <div className="grid grid-cols-12 gap-6">
      <div className={`${selected ? 'col-span-5' : 'col-span-12'} space-y-3`}>
        <div className="flex items-center justify-between">
          <p className="editorial-eyebrow">Supabase actif · {records.length} personnage(s)</p>
          <button onClick={onRefresh} className="text-[11px] flex items-center gap-1 text-muted-foreground hover:text-foreground">
            <RefreshCw size={11} /> Rafraîchir
          </button>
        </div>
        <div className={`grid ${selected ? 'grid-cols-1' : 'grid-cols-2 lg:grid-cols-3'} gap-4`}>
          {sorted.map((c) => (
            <button key={c.id} onClick={() => setSelectedId(c.id)}
              className={`text-left cockpit-card cursor-pointer hover:border-primary/40 transition-all ${selectedId === c.id ? 'cockpit-glow-cyan' : ''}`}>
              <div className="flex items-center gap-3 mb-3">
                <div className="w-11 h-11 rounded-full bg-gradient-to-br from-primary/20 to-accent/20 border border-border flex items-center justify-center">
                  <User size={18} className="text-foreground/70" />
                </div>
                <div className="min-w-0">
                  <h3 className="font-display text-[15px] text-foreground truncate" style={{ fontWeight: 500 }}>{c.name}</h3>
                  <p className="text-xs text-muted-foreground truncate">{c.role ?? '—'}</p>
                </div>
              </div>
              <div className="space-y-1.5">
                <div className="flex justify-between text-xs"><span className="text-muted-foreground">Poids narratif</span><span className="font-mono text-foreground">{c.narrative_weight ?? '—'}</span></div>
                <ScoreBar value={c.narrative_weight ?? 0} color="cyan" />
                <div className="flex justify-between text-xs"><span className="text-muted-foreground">Exposition</span><span className="font-mono text-foreground">{c.exposure_level ?? '—'}</span></div>
                <ScoreBar value={c.exposure_level ?? 0} color="amber" />
              </div>
              <div className="mt-2 pt-2 border-t border-border flex items-center gap-2 text-[10px] font-mono text-muted-foreground">
                {c.validation_status === 'validated'
                  ? <span className="inline-flex items-center gap-1 text-emerald-600"><CheckCircle2 size={10} /> validé</span>
                  : <span className="inline-flex items-center gap-1 text-amber-700"><AlertTriangle size={10} /> {c.validation_status ?? 'pending'}</span>}
                {c.needs_review && <span className="text-amber-700">à valider</span>}
              </div>
            </button>
          ))}
        </div>
      </div>

      {selected && (
        <aside className="col-span-7 space-y-4">
          <div className="cockpit-card-elevated space-y-4">
            <div className="flex items-start justify-between">
              <div>
                <p className="editorial-eyebrow mb-0.5">{selected.role ?? 'rôle —'}</p>
                <h2 className="text-2xl editorial-heading text-foreground">{selected.name}</h2>
              </div>
              <div className="flex items-center gap-2 text-[11px] font-mono">
                {selected.validation_status === 'validated'
                  ? <span className="px-2 py-0.5 rounded border border-emerald-500/40 bg-emerald-500/10 text-emerald-700">validé</span>
                  : <span className="px-2 py-0.5 rounded border border-amber-500/40 bg-amber-500/10 text-amber-700">{selected.validation_status ?? 'pending'}</span>}
              </div>
            </div>

            {selected.function && <p className="text-sm text-foreground/85 leading-relaxed">{selected.function}</p>}

            <div className="grid grid-cols-2 gap-x-5 gap-y-3 text-sm">
              {([
                ['Objectif apparent', selected.apparent_goal],
                ['Objectif réel', selected.real_goal],
                ['Faille', selected.flaw],
                ['Secret', selected.secret],
                ['Interdit', selected.forbidden],
                ['Seuil de rupture', selected.breaking_point],
              ] as const).map(([label, value]) => (
                <div key={label}>
                  <p className="editorial-eyebrow mb-0.5">{label}</p>
                  <p className="text-foreground/85 leading-snug">{value || <span className="italic text-muted-foreground">—</span>}</p>
                </div>
              ))}
            </div>

            {selected.emotional_trajectory && (
              <div>
                <p className="editorial-eyebrow mb-1">Trajectoire émotionnelle</p>
                <div className="flex items-center gap-2 overflow-x-auto pb-2">
                  {selected.emotional_trajectory.split('→').map((step, i, arr) => (
                    <div key={i} className="flex items-center gap-2 shrink-0">
                      <div className="px-3 py-1.5 rounded-full border border-border bg-secondary/40 text-xs text-foreground">{step.trim()}</div>
                      {i < arr.length - 1 && <span className="text-muted-foreground">→</span>}
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="soft-divider" />
            <div className="flex flex-wrap items-center gap-2">
              <button disabled={busy === selected.id} onClick={() => markReviewed(selected.id)}
                className="text-xs px-3 py-1.5 rounded-lg bg-primary text-primary-foreground hover:opacity-90 disabled:opacity-40 inline-flex items-center gap-1.5">
                {busy === selected.id ? <Loader2 size={11} className="animate-spin" /> : <CheckCircle2 size={11} />} Marquer validé
              </button>
              <span className="text-[10px] text-muted-foreground font-mono">maj · {new Date(selected.updated_at).toLocaleString('fr-FR')}</span>
            </div>
          </div>

          <NoteComposer target={selected.name} targetType="character" targetId={selected.id} />
        </aside>
      )}
    </div>
  );
}
