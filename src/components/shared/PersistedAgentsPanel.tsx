import { useEffect, useState } from 'react';
import { Loader2, RefreshCcw, Save, History, Bot, Database, AlertTriangle, Play, ExternalLink } from 'lucide-react';
import { agentsService, type AgentRow, type AgentVersionRow, type AgentBindingRow } from '@/services/agentsService';
import { supabase } from '@/integrations/supabase/client';
import { classifyAgentTestability, TESTABILITY_LABEL, type TestabilityCtx } from '@/lib/agentTestability';
import { Link } from 'react-router-dom';

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

  // env for testability classification
  const [env, setEnv] = useState<Omit<TestabilityCtx, 'bindings'> & { bindingsByAgent: Record<string, AgentBindingRow[]> }>({
    hasChapters: false, hasCanon: false, hasCharacters: false,
    hasPlannedBeats: false, hasValidatedBeats: false, hasFullText: false,
    pgvectorActive: false, openaiReady: false, bindingsByAgent: {},
  });

  const [testing, setTesting] = useState(false);
  const [lastRun, setLastRun] = useState<any>(null);

  const load = async () => {
    setLoading(true); setErr(null);
    try {
      const list = await agentsService.list();
      setAgents(list);
      const [chCount, caCount, chrCount, plannedCount, validatedCount, fullTextCount, allBindings, oaiSetting] = await Promise.all([
        supabase.from('chapters').select('id', { count: 'exact', head: true }),
        supabase.from('canon_objects').select('id', { count: 'exact', head: true }),
        supabase.from('characters').select('id', { count: 'exact', head: true }),
        supabase.from('beats').select('id', { count: 'exact', head: true }).eq('beat_type', 'planned').neq('status', 'deleted'),
        supabase.from('beats').select('id', { count: 'exact', head: true }).eq('beat_type', 'planned').eq('validation_status', 'validated'),
        supabase.from('chapters').select('id', { count: 'exact', head: true }).not('full_text', 'is', null),
        supabase.from('agent_index_bindings').select('id,agent_id,index_name,corpus_name,required,top_k,similarity_threshold,status'),
        supabase.from('app_settings').select('value').eq('key', 'openai').maybeSingle(),
      ]);
      const map: Record<string, AgentBindingRow[]> = {};
      ((allBindings.data ?? []) as any[]).forEach((b) => {
        if (!map[b.agent_id]) map[b.agent_id] = [];
        map[b.agent_id].push(b as AgentBindingRow);
      });
      const anyActive = ((allBindings.data ?? []) as any[]).some((b) => b.status === 'active');
      const openaiReady = !!(oaiSetting.data?.value as any)?.api_key_configured;
      setEnv({
        hasChapters: (chCount.count ?? 0) > 0,
        hasCanon: (caCount.count ?? 0) > 0,
        hasCharacters: (chrCount.count ?? 0) > 0,
        hasPlannedBeats: (plannedCount.count ?? 0) > 0,
        hasValidatedBeats: (validatedCount.count ?? 0) > 0,
        hasFullText: (fullTextCount.count ?? 0) > 0,
        pgvectorActive: anyActive, openaiReady,
        bindingsByAgent: map,
      });
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
            Source de vérité unique : Supabase. Aucun catalogue mock n'est chargé en Production Test.
          </p>
        </div>
        <div className="flex gap-2">
          <button onClick={load} className="text-[10px] font-mono px-2 py-1 rounded border border-border text-muted-foreground hover:text-foreground">
            {loading ? <Loader2 size={10} className="animate-spin" /> : <RefreshCcw size={10} />}
          </button>
          {agents.length > 0 && (
            <button
              onClick={bootstrap}
              disabled={busy}
              className="text-[11px] font-mono px-2 py-1 rounded border border-border text-muted-foreground hover:text-foreground disabled:opacity-40"
              title="Réapplique idempotemment les agents par défaut manquants."
            >
              {busy && <Loader2 size={10} className="animate-spin inline mr-1" />}
              Upsert defaults
            </button>
          )}
        </div>
      </div>

      {err && <div className="text-[11px] text-rose flex items-center gap-1"><AlertTriangle size={11} /> {err}</div>}

      {agents.length === 0 ? (
        <div className="rounded border border-primary/30 bg-primary/5 p-4 text-center space-y-2">
          <p className="text-xs text-muted-foreground">
            Aucun agent persisté dans Supabase pour l'instant.
          </p>
          <button
            onClick={bootstrap}
            disabled={busy}
            className="inline-flex items-center gap-1.5 text-xs font-mono px-3 py-1.5 rounded border border-primary/40 bg-primary/10 text-primary hover:bg-primary/20 disabled:opacity-40"
          >
            {busy ? <Loader2 size={12} className="animate-spin" /> : <Bot size={12} />}
            Initialiser les agents par défaut
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-12 gap-3">
          <div className="col-span-4 space-y-1 max-h-80 overflow-auto pr-1">
            {agents.map((a) => {
              const t = classifyAgentTestability(a, { ...env, bindings: env.bindingsByAgent[a.id] });
              const meta = TESTABILITY_LABEL[t.status];
              return (
              <button
                key={a.id}
                onClick={() => pick(a)}
                className={`w-full text-left rounded border px-2 py-1.5 text-xs transition-colors ${selected?.id === a.id ? 'border-primary/40 bg-primary/5' : 'border-border hover:border-primary/30'}`}
              >
                <div className="flex items-center justify-between gap-1.5">
                  <div className="flex items-center gap-1.5 min-w-0">
                    <Bot size={10} className="text-primary shrink-0" />
                    <span className="text-foreground truncate">{a.name}</span>
                  </div>
                  <span className={`text-[9px] font-mono px-1 py-0.5 rounded border shrink-0 ${meta.classes}`} title={t.reason}>
                    {meta.label}
                  </span>
                </div>
                <p className="text-[10px] text-muted-foreground font-mono mt-0.5">
                  {a.selected_model ?? a.default_model ?? '—'} · {a.persistence_status ?? 'suggestions_only'}
                </p>
              </button>
              );
            })}
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

              {(() => {
                const t = classifyAgentTestability(selected, { ...env, bindings: env.bindingsByAgent[selected.id] });
                const meta = TESTABILITY_LABEL[t.status];
                const canTest = t.can_run_now;
                const runTest = async () => {
                  setTesting(true); setLastRun(null);
                  try {
                    const { data, error } = await supabase.functions.invoke('run-execute', {
                      body: { run_type: 'run_selected_agent', agent_id: selected.id, mode: 'live', instruction: `Test live for ${selected.name}`, payload: { ping: true } },
                    });
                    setLastRun(error ? { error: error.message } : data);
                  } finally { setTesting(false); }
                };
                return (
                  <div className="rounded border border-border p-2 space-y-1.5 bg-secondary/20">
                    <div className="flex items-center justify-between gap-2 flex-wrap">
                      <span className={`text-[10px] font-mono px-1.5 py-0.5 rounded border ${meta.classes}`}>{meta.label}</span>
                      <span className="text-[10px] text-muted-foreground">{t.reason}</span>
                    </div>
                    {t.blockers.length > 0 && (
                      <p className="text-[10px] text-amber-700">→ {t.next_action}</p>
                    )}
                    <div className="flex items-center gap-2 flex-wrap">
                      <button onClick={runTest} disabled={!canTest || testing}
                        className="inline-flex items-center gap-1 text-[11px] px-2 py-1 rounded border border-emerald-500/40 bg-emerald-500/5 text-emerald-700 hover:bg-emerald-500/10 disabled:opacity-40">
                        {testing ? <Loader2 size={10} className="animate-spin" /> : <Play size={10} />} Test agent (run-execute)
                      </button>
                      <Link to="/runs" className="inline-flex items-center gap-1 text-[10px] text-muted-foreground hover:text-foreground">
                        <ExternalLink size={10} /> Voir dans Runs
                      </Link>
                    </div>
                    {lastRun && (
                      <details className="text-[10px]">
                        <summary className="cursor-pointer text-muted-foreground">Dernier run {lastRun?.run_id ? `· ${String(lastRun.run_id).slice(0, 8)}` : ''}</summary>
                        <pre className="bg-muted/40 rounded p-1 max-h-32 overflow-auto font-mono">{JSON.stringify(lastRun, null, 2)}</pre>
                      </details>
                    )}
                  </div>
                );
              })()}

              <div className="flex items-end gap-2 pt-2 border-t border-border">
                <input value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Raison du changement (obligatoire)…"
                  className="flex-1 rounded border border-border bg-background px-2 py-1 text-xs" />
                <button onClick={saveVersion} disabled={busy || !reason.trim()}
                  className="inline-flex items-center gap-1 text-[11px] px-2 py-1 rounded border border-primary/40 bg-primary/5 text-primary hover:bg-primary/10 disabled:opacity-40"
                  title={!reason.trim() ? 'Raison de changement obligatoire' : 'Saver nouvelle version'}>
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
