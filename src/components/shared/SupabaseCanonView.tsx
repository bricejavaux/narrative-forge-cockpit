import { useEffect, useMemo, useState } from 'react';
import { CheckCircle2, AlertTriangle, RefreshCw, BookOpen, Loader2, ChevronRight, ChevronDown, Save } from 'lucide-react';
import { supabaseService, type ActiveCanonObject } from '@/services/supabaseService';
import StatusBadge from '@/components/shared/StatusBadge';
import NoteComposer from '@/components/shared/NoteComposer';

export default function SupabaseCanonView({ records, onRefresh }: { records: ActiveCanonObject[]; onRefresh: () => void }) {
  const [selectedId, setSelectedId] = useState<string | null>(records[0]?.id ?? null);
  const [busy, setBusy] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});

  useEffect(() => {
    if (!selectedId && records.length) setSelectedId(records[0].id);
  }, [records, selectedId]);

  const grouped = useMemo(() => {
    const m: Record<string, ActiveCanonObject[]> = {};
    records.forEach((r) => { (m[r.category || 'Autre'] ||= []).push(r); });
    return m;
  }, [records]);

  const selected = records.find((r) => r.id === selectedId);

  const markReviewed = async (id: string) => {
    setBusy(id);
    await supabaseService.updateCanonObject(id, { needs_review: false, validation_status: 'validated' });
    setBusy(null);
    onRefresh();
  };
  const markIndexRefresh = async (id: string) => {
    setBusy(id);
    await supabaseService.updateCanonObject(id, { needs_index_refresh: true });
    setBusy(null);
    onRefresh();
  };

  return (
    <div className="grid grid-cols-12 gap-6">
      <aside className="col-span-3">
        <div className="cockpit-card sticky top-24 space-y-2">
          <div className="flex items-center justify-between">
            <p className="editorial-eyebrow">Supabase actif</p>
            <button onClick={onRefresh} className="text-[11px] flex items-center gap-1 text-muted-foreground hover:text-foreground">
              <RefreshCw size={11} /> Rafraîchir
            </button>
          </div>
          <div className="space-y-0.5 max-h-[calc(100vh-260px)] overflow-y-auto">
            {Object.entries(grouped).map(([cat, items]) => {
              const open = expanded[cat] ?? true;
              return (
                <div key={cat}>
                  <button onClick={() => setExpanded((s) => ({ ...s, [cat]: !open }))}
                    className="w-full flex items-center gap-1.5 px-2 py-1.5 text-xs text-foreground hover:bg-secondary/60 rounded-md">
                    {open ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
                    <span className="flex-1 text-left">{cat}</span>
                    <span className="text-[10px] text-muted-foreground font-mono">{items.length}</span>
                  </button>
                  {open && (
                    <div className="ml-5 border-l border-border pl-2 space-y-0.5">
                      {items.map((r) => (
                        <button key={r.id} onClick={() => setSelectedId(r.id)}
                          className={`w-full text-left px-2 py-1.5 rounded text-xs truncate transition-colors ${
                            selectedId === r.id ? 'bg-primary/10 text-primary' : 'text-muted-foreground hover:text-foreground hover:bg-secondary/40'
                          }`}>
                          {r.title}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </aside>

      <main className="col-span-9 space-y-4">
        {selected ? (
          <>
            <div className="cockpit-card-elevated space-y-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="editorial-eyebrow mb-1">{selected.external_id ?? selected.id.slice(0, 8)} · {selected.category}</p>
                  <h2 className="text-2xl editorial-heading text-foreground">{selected.title}</h2>
                </div>
                <div className="flex flex-wrap gap-2">
                  <StatusBadge status={selected.status as any} />
                  {selected.needs_review && <span className="px-2 py-0.5 rounded text-[11px] font-mono border border-amber-500/40 bg-amber-500/10 text-amber-700 inline-flex items-center gap-1"><AlertTriangle size={10} /> à valider</span>}
                  {selected.needs_index_refresh && <span className="px-2 py-0.5 rounded text-[11px] font-mono border border-violet-500/40 bg-violet-500/10 text-violet-700">index refresh requis</span>}
                  {selected.validation_status === 'validated' && <span className="px-2 py-0.5 rounded text-[11px] font-mono border border-emerald-500/40 bg-emerald-500/10 text-emerald-700 inline-flex items-center gap-1"><CheckCircle2 size={10} /> validé</span>}
                </div>
              </div>

              <div className="flex flex-wrap gap-2 text-[11px] font-mono">
                {selected.criticality && <span className="px-2 py-0.5 rounded border border-border bg-secondary/40 text-muted-foreground">criticité · {selected.criticality}</span>}
                {selected.rigidity && <span className="px-2 py-0.5 rounded border border-border bg-secondary/40 text-muted-foreground">rigidité · {selected.rigidity}</span>}
                <span className="px-2 py-0.5 rounded border border-border bg-secondary/40 text-muted-foreground">v{selected.version}</span>
                {selected.index_associated && <span className="px-2 py-0.5 rounded border border-border bg-primary/10 text-primary">index · {selected.index_associated}</span>}
              </div>

              <div className="space-y-3 text-sm">
                {selected.summary && <div><p className="editorial-eyebrow mb-1">Résumé</p><p className="text-foreground leading-relaxed">{selected.summary}</p></div>}
                {selected.description && <div><p className="editorial-eyebrow mb-1">Description</p><p className="text-foreground/85 leading-relaxed whitespace-pre-wrap">{selected.description}</p></div>}
                {selected.exceptions && <div><p className="editorial-eyebrow mb-1">Exceptions</p><p className="text-foreground/75 leading-relaxed italic whitespace-pre-wrap">{selected.exceptions}</p></div>}
                {selected.source_reference && <div><p className="editorial-eyebrow mb-1">Source</p><p className="text-foreground/75 font-mono text-[11px]">{selected.source_reference}</p></div>}
              </div>

              <div className="soft-divider" />

              <div className="flex flex-wrap gap-2">
                <button disabled={busy === selected.id} onClick={() => markReviewed(selected.id)}
                  className="text-xs px-3 py-1.5 rounded-lg bg-primary text-primary-foreground hover:opacity-90 disabled:opacity-40 inline-flex items-center gap-1.5">
                  {busy === selected.id ? <Loader2 size={11} className="animate-spin" /> : <CheckCircle2 size={11} />} Marquer validé
                </button>
                <button disabled={busy === selected.id} onClick={() => markIndexRefresh(selected.id)}
                  className="text-xs px-3 py-1.5 rounded-lg border border-border text-foreground hover:bg-secondary/60 disabled:opacity-40 inline-flex items-center gap-1.5">
                  <Save size={11} /> Marquer index refresh requis
                </button>
                <span className="text-[10px] text-muted-foreground font-mono self-center">
                  maj · {new Date(selected.updated_at).toLocaleString('fr-FR')}
                </span>
              </div>
            </div>

            <NoteComposer target={selected.title} targetType="canon_object" targetId={selected.id} />
          </>
        ) : (
          <div className="cockpit-card p-12 text-center text-muted-foreground">
            <BookOpen size={28} className="mx-auto mb-3 opacity-40" />
            <p className="text-sm">Sélectionne un objet Supabase</p>
          </div>
        )}
      </main>
    </div>
  );
}
