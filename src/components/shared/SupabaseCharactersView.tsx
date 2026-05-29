import { useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
import { CheckCircle2, AlertTriangle, RefreshCw, User, Loader2, History } from 'lucide-react';
import { supabaseService, type ActiveCharacter } from '@/services/supabaseService';
import NoteComposer from '@/components/shared/NoteComposer';
import ScoreBar from '@/components/shared/ScoreBar';

export default function SupabaseCharactersView({ records, onRefresh }: { records: ActiveCharacter[]; onRefresh: () => void }) {
  const [selectedId, setSelectedId] = useState<string | null>(records[0]?.id ?? null);
  const [batchBusy, setBatchBusy] = useState<string | null>(null);

  useEffect(() => { if (!selectedId && records.length) setSelectedId(records[0].id); }, [records, selectedId]);

  const sorted = useMemo(() => [...records].sort((a, b) => (b.narrative_weight ?? 0) - (a.narrative_weight ?? 0)), [records]);
  const selected = records.find((r) => r.id === selectedId);
  const pendingIds = useMemo(() => records.filter(r => r.validation_status !== 'validated' || r.needs_review).map(r => r.id), [records]);

  const runAction = async (label: string, ids: string[], fn: (ids: string[]) => Promise<{ ok: boolean; updated: number; failed: number; error?: string; errors?: any }>, key: string) => {
    if (!ids.length) { toast.info('Aucun personnage ciblé.'); return; }
    setBatchBusy(key);
    const r = await fn(ids);
    setBatchBusy(null);
    if (r.updated > 0) toast.success(`${label} — ${r.updated} mis à jour${r.failed ? ` · ${r.failed} échec(s)` : ''}`);
    else toast.error(`${label} échoué : ${r.error || JSON.stringify(r.errors) || 'aucune ligne modifiée'}`);
    onRefresh();
    try { window.dispatchEvent(new CustomEvent('supabase-records-refresh')); } catch {}
  };

  const validateOne = (id: string) => runAction('Personnage validé', [id], (ids) => supabaseService.validateCharacters(ids), `v-${id}`);
  const reviewedOne = (id: string) => runAction('Marqué reviewed', [id], (ids) => supabaseService.markCharactersReviewed(ids), `r-${id}`);
  const validateAll = () => {
    if (!window.confirm(`Valider ${pendingIds.length} personnage(s) en attente ?`)) return;
    runAction('Validation globale', pendingIds, (x) => supabaseService.validateCharacters(x), 'v-all');
  };
  const reviewedAll = () => {
    if (!window.confirm(`Marquer ${pendingIds.length} personnage(s) reviewed ?`)) return;
    runAction('Reviewed global', pendingIds, (x) => supabaseService.markCharactersReviewed(x), 'r-all');
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
        <div className="flex flex-wrap gap-2">
          <button disabled={!pendingIds.length || !!batchBusy} onClick={validateAll}
            className="text-[11px] px-2 py-1 rounded bg-primary/10 text-primary border border-primary/30 hover:bg-primary/20 disabled:opacity-40 inline-flex items-center gap-1.5">
            {batchBusy === 'v-all' ? <Loader2 size={10} className="animate-spin" /> : <CheckCircle2 size={10} />}
            Valider tous les personnages à valider ({pendingIds.length})
          </button>
          <button disabled={!pendingIds.length || !!batchBusy} onClick={reviewedAll}
            className="text-[11px] px-2 py-1 rounded border border-border hover:bg-secondary/60 disabled:opacity-40 inline-flex items-center gap-1.5">
            Marquer reviewed — tous
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
              <button disabled={!!batchBusy} onClick={() => validateOne(selected.id)}
                className="text-xs px-3 py-1.5 rounded-lg bg-primary text-primary-foreground hover:opacity-90 disabled:opacity-40 inline-flex items-center gap-1.5">
                {batchBusy === `v-${selected.id}` ? <Loader2 size={11} className="animate-spin" /> : <CheckCircle2 size={11} />} Valider le personnage sélectionné
              </button>
              <button disabled={!!batchBusy} onClick={() => reviewedOne(selected.id)}
                className="text-xs px-3 py-1.5 rounded-lg border border-border hover:bg-secondary/60 disabled:opacity-40 inline-flex items-center gap-1.5">
                Marquer reviewed — sélection
              </button>
              <span className="text-[10px] text-muted-foreground font-mono">maj · {new Date(selected.updated_at).toLocaleString('fr-FR')}</span>
            </div>
          </div>

          <HistoryPanel record={selected} />
          <NoteComposer target={selected.name} targetType="character" targetId={selected.id} onApplied={onRefresh} />
        </aside>
      )}
    </div>
  );
}

function HistoryPanel({ record }: { record: ActiveCharacter }) {
  const meta = (record.metadata && typeof record.metadata === 'object') ? record.metadata as any : {};
  const lastPatch = meta.last_note_patch;
  const pending = meta.pending_actions;
  return (
    <div className="rounded-lg border border-border/60 bg-card/40 p-4 space-y-2">
      <div className="flex items-center gap-2"><History className="w-4 h-4 text-muted-foreground" /><p className="editorial-eyebrow">Historique</p></div>
      <div className="text-xs text-foreground/80 space-y-1">
        <div>updated_at : <span className="font-mono text-muted-foreground">{new Date(record.updated_at).toLocaleString('fr-FR')}</span></div>
        <div>validation_status : <span className="font-mono">{record.validation_status}</span></div>
        {lastPatch && <div>dernier patch : <span className="font-mono text-muted-foreground">{new Date(lastPatch.applied_at).toLocaleString('fr-FR')}</span> — {Object.keys(lastPatch.patch || {}).join(', ') || '∅'}</div>}
        {Array.isArray(pending) && pending.length > 0 && <div>pending_actions : {pending.length}</div>}
        {!lastPatch && !pending && <div className="text-muted-foreground italic">Aucun événement enregistré dans metadata.</div>}
      </div>
    </div>
  );
}
