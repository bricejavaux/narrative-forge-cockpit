import { useEffect, useState } from 'react';
import { Loader2, RefreshCcw, Save, History, Bot, Database, AlertTriangle } from 'lucide-react';
import { agentsService, type AgentRow, type AgentVersionRow, type AgentBindingRow } from '@/services/agentsService';

export default function PersistedAgentsPanel() {
  const [loading, setLoading] = useState(false);
  const [agents, setAgents] = useState<AgentRow[]>([]);
  const [selected, setSelected] = useState<AgentRow | null>(null);
  const [version, setVersion] = useState<AgentVersionRow | null>(null);
  const [versions, setVersions] = useState<AgentVersionRow[]>([]);
  const [bindings, setBindings] = useState<AgentBindingRow[]>([]);
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  // edit fields
  const [editSystem, setEditSystem] = useState('');
  const [editObjective, setEditObjective] = useState('');
  const [editScript, setEditScript] = useState('[]');
  const [reason, setReason] = useState('');

  const load = async () => {
    setLoading(true); setErr(null);
    try {
      const list = await agentsService.list();
      setAgents(list);
      if (!selected && list.length) await pick(list[0]);
    } catch (e) { setErr(e instanceof Error ? e.message : String(e)); }
    finally { setLoading(false); }
  };

  const pick = async (a: AgentRow) => {
    setSelected(a);
    const v = await agentsService.getCurrentVersion(a.id);
    setVersion(v);
    setVersions(await agentsService.listVersions(a.id));
    setBindings(await agentsService.listBindings(a.id));
    setEditObjective(v?.objective ?? a.objective ?? '');
    setEditSystem(v?.system_prompt ?? '');
    setEditScript(JSON.stringify(v?.operating_script ?? [], null, 2));
    setReason('');
  };

  useEffect(() => { load(); /* eslint-disable-next-line */ }, []);

  const bootstrap = async () => {
    setBusy(true); setErr(null);
    try { await agentsService.bootstrap(); await load(); }
    catch (e) { setErr(e instanceof Error ? e.message : String(e)); }
    finally { setBusy(false); }
  };

  const saveVersion = async () => {
    if (!selected) return;
    setBusy(true); setErr(null);
    try {
      let script: any = [];
      try { script = JSON.parse(editScript); } catch { throw new Error('Operating script must be valid JSON'); }
      await agentsService.saveVersion(selected.id, {
        objective: editObjective,
        system_prompt: editSystem,
        operating_script: script,
        index_bindings: version?.index_bindings ?? [],
        model_recommendations: version?.model_recommendations ?? {},
        parameters: version?.parameters ?? {},
        permission_policy: version?.permission_policy ?? { permission_level: selected.permission_level, rewrite_rights: selected.rewrite_rights },
      }, reason || 'manual edit');
      await pick(selected);
    } catch (e) { setErr(e instanceof Error ? e.message : String(e)); }
    finally { setBusy(false); }
  };

  const restore = async (id: string) => {
    if (!selected) return;
    setBusy(true);
    try { await agentsService.restoreVersion(selected.id, id); await pick(selected); }
    finally { setBusy(false); }
  };

  return (
    <div className="cockpit-card space-y-3">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="editorial-heading text-foreground text-lg">Agents persistés (Supabase)</h3>
          <p className="text-xs text-muted-foreground">
            Source de vérité : Supabase. Le catalogue local (mock) sert uniquement de fallback si la base est vide.
          </p>
        </div>
        <div className="flex gap-2">
          <button onClick={load} className="text-[10px] font-mono px-2 py-1 rounded border border-border text-muted-foreground hover:text-foreground">
            {loading ? <Loader2 size={10} className="animate-spin" /> : <RefreshCcw size={10} />}
          </button>
          <button
            onClick={bootstrap}
            disabled={busy}
            className="text-[11px] font-mono px-2 py-1 rounded border border-primary/40 bg-primary/5 text-primary hover:bg-primary/10 disabled:opacity-40"
          >
            {busy && <Loader2 size={10} className="animate-spin inline mr-1" />}
            Initialize default agents in Supabase
          </button>
        </div>
      </div>

      {err && <div className="text-[11px] text-rose flex items-center gap-1"><AlertTriangle size={11} /> {err}</div>}

      {agents.length === 0 ? (
        <p className="text-xs text-muted-foreground italic">
          Aucun agent persisté pour l'instant. Cliquez sur « Initialize » pour insérer les agents par défaut.
          En attendant, le studio affiche le catalogue mock ci-dessous.
        </p>
      ) : (
        <div className="grid grid-cols-12 gap-3">
          <div className="col-span-4 space-y-1 max-h-80 overflow-auto pr-1">
            {agents.map((a) => (
              <button
                key={a.id}
                onClick={() => pick(a)}
                className={`w-full text-left rounded border px-2 py-1.5 text-xs transition-colors ${selected?.id === a.id ? 'border-primary/40 bg-primary/5' : 'border-border hover:border-primary/30'}`}
              >
                <div className="flex items-center gap-1.5">
                  <Bot size={10} className="text-primary" />
                  <span className="text-foreground">{a.name}</span>
                </div>
                <p className="text-[10px] text-muted-foreground font-mono mt-0.5">
                  {a.selected_model ?? a.default_model ?? '—'} · {a.persistence_status ?? 'suggestions_only'}
                </p>
              </button>
            ))}
          </div>

          {selected && (
            <div className="col-span-8 space-y-2 text-xs">
              <div className="flex items-center justify-between">
                <p className="font-display text-sm text-foreground">{selected.name}</p>
                <div className="flex gap-1">
                  <span className="text-[10px] font-mono px-1.5 py-0.5 rounded border bg-secondary text-muted-foreground border-border">
                    v{version?.version_number ?? '—'} {version?.is_current ? '(current)' : ''}
                  </span>
                  <span className="text-[10px] font-mono px-1.5 py-0.5 rounded border bg-amber/10 text-amber border-amber/30">
                    {selected.vector_context_status}
                  </span>
                </div>
              </div>

              <div className="space-y-1">
                <p className="editorial-eyebrow">Objectif</p>
                <textarea value={editObjective} onChange={(e) => setEditObjective(e.target.value)}
                  className="w-full rounded border border-border bg-background px-2 py-1 text-xs min-h-[50px]" />
              </div>

              <div className="space-y-1">
                <p className="editorial-eyebrow">System prompt</p>
                <textarea value={editSystem} onChange={(e) => setEditSystem(e.target.value)}
                  className="w-full rounded border border-border bg-background px-2 py-1 text-xs font-mono min-h-[80px]" />
              </div>

              <div className="space-y-1">
                <p className="editorial-eyebrow">Operating script (JSON)</p>
                <textarea value={editScript} onChange={(e) => setEditScript(e.target.value)}
                  className="w-full rounded border border-border bg-background px-2 py-1 text-[11px] font-mono min-h-[100px]" />
              </div>

              <div className="space-y-1">
                <p className="editorial-eyebrow flex items-center gap-1"><Database size={9} /> Index bindings</p>
                {bindings.length === 0 ? <p className="text-[11px] text-muted-foreground">Aucun</p> : (
                  <div className="flex flex-wrap gap-1">
                    {bindings.map((b) => (
                      <span key={b.id} className="text-[10px] font-mono px-1.5 py-0.5 rounded border border-border bg-secondary/50">
                        {b.index_name} · top_k={b.top_k} · sim≥{b.similarity_threshold} · {b.status}
                      </span>
                    ))}
                  </div>
                )}
              </div>

              <div className="flex items-end gap-2 pt-2 border-t border-border">
                <input value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Raison du changement…"
                  className="flex-1 rounded border border-border bg-background px-2 py-1 text-xs" />
                <button onClick={saveVersion} disabled={busy}
                  className="inline-flex items-center gap-1 text-[11px] px-2 py-1 rounded border border-primary/40 bg-primary/5 text-primary hover:bg-primary/10 disabled:opacity-40">
                  {busy ? <Loader2 size={10} className="animate-spin" /> : <Save size={10} />} Save new version
                </button>
              </div>

              {versions.length > 0 && (
                <details className="text-[11px]">
                  <summary className="text-muted-foreground cursor-pointer flex items-center gap-1"><History size={10} /> Historique ({versions.length})</summary>
                  <ul className="mt-1 space-y-1">
                    {versions.map((v) => (
                      <li key={v.id} className="flex items-center justify-between border border-border rounded px-2 py-1">
                        <span className="font-mono">v{v.version_number} · {new Date(v.created_at).toLocaleString()} · {v.change_reason ?? '—'}</span>
                        {!v.is_current && (
                          <button onClick={() => restore(v.id)} className="text-[10px] px-1.5 py-0.5 rounded border border-border hover:border-primary/40">
                            Restore
                          </button>
                        )}
                      </li>
                    ))}
                  </ul>
                </details>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
