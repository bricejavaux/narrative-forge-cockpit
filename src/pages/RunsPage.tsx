import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Play, Loader2, AlertTriangle, RefreshCcw, CheckCircle2, XCircle, Clock } from 'lucide-react';
import { agentsService, type AgentRow } from '@/services/agentsService';

type RunType =
  | 'openai_connection_test'
  | 'structure_text_note'
  | 'run_selected_agent'
  | 'audit_chapter_plan'
  | 'audit_planned_beats'
  | 'diagnostic_tome_live'
  | 'export_test';

const RUN_TYPES: { id: RunType; label: string; needsAgent?: boolean; needsTarget?: boolean }[] = [
  { id: 'openai_connection_test', label: 'OpenAI connection test' },
  { id: 'structure_text_note', label: 'Structure text note' },
  { id: 'run_selected_agent', label: 'Run selected agent', needsAgent: true },
  { id: 'audit_chapter_plan', label: 'Audit chapter plan (live)' },
  { id: 'audit_planned_beats', label: 'Audit planned beats (live)', needsTarget: true },
  { id: 'diagnostic_tome_live', label: 'Diagnostic tome (live)' },
  { id: 'export_test', label: 'Export test' },
];

const FUTURE_RUN_TYPES = [
  'generate_chapter_draft',
  'extract_observed_beats',
  'audit_chapter_vs_beats',
  'targeted_rewrite',
  'pgvector_retrieval',
  'autonomous_rewrite',
];

type RunRow = {
  id: string; name: string; status: string; mode: string;
  started_at: string | null; finished_at: string | null;
  duration: string | null; findings: number; payload: any; result: any;
};

export default function RunsPage() {
  const [runType, setRunType] = useState<RunType>('openai_connection_test');
  const [agents, setAgents] = useState<AgentRow[]>([]);
  const [agentId, setAgentId] = useState<string>('');
  const [chapters, setChapters] = useState<any[]>([]);
  const [chapterId, setChapterId] = useState<string>('');
  const [model, setModel] = useState<string>('');
  const [instruction, setInstruction] = useState<string>('');
  const [rawText, setRawText] = useState<string>('');
  const [running, setRunning] = useState(false);
  const [runs, setRuns] = useState<RunRow[]>([]);
  const [selectedRun, setSelectedRun] = useState<RunRow | null>(null);
  const [outputs, setOutputs] = useState<any[]>([]);
  const [err, setErr] = useState<string | null>(null);

  const loadRuns = async () => {
    const { data } = await supabase.from('runs').select('id,name,status,mode,started_at,finished_at,duration,findings,payload,result').order('created_at', { ascending: false }).limit(40);
    setRuns((data ?? []) as RunRow[]);
  };

  useEffect(() => {
    loadRuns();
    agentsService.list().then((l) => { setAgents(l); if (l[0]) setAgentId(l[0].id); });
    supabase.from('chapters').select('id,number,title').order('number').limit(50).then(({ data }) => {
      setChapters(data ?? []); if (data?.[0]) setChapterId(data[0].id);
    });
  }, []);

  const def = RUN_TYPES.find((r) => r.id === runType)!;

  const execute = async () => {
    setRunning(true); setErr(null);
    try {
      const body: any = { run_type: runType, mode: 'live', model: model || null };
      if (def.needsAgent) body.agent_id = agentId;
      if (def.needsTarget && chapterId) { body.target_type = 'chapter'; body.target_id = chapterId; }
      if (runType === 'structure_text_note') body.payload = { raw_text: rawText };
      if (instruction) body.instruction = instruction;
      const { data, error } = await supabase.functions.invoke('run-execute', { body });
      if (error) setErr(error.message);
      await loadRuns();
      if (data?.run_id) {
        const { data: row } = await supabase.from('runs').select('*').eq('id', data.run_id).maybeSingle();
        if (row) await openRun(row as RunRow);
      }
    } catch (e) { setErr(e instanceof Error ? e.message : String(e)); }
    finally { setRunning(false); }
  };

  const openRun = async (r: RunRow) => {
    setSelectedRun(r);
    const { data } = await supabase.from('run_outputs').select('*').eq('run_id', r.id).order('created_at');
    setOutputs(data ?? []);
  };

  return (
    <div className="space-y-6 animate-slide-in">
      <div>
        <p className="editorial-eyebrow">Intelligence · Page technique</p>
        <h1 className="text-3xl editorial-heading text-foreground mt-1">Runs</h1>
        <p className="text-xs text-muted-foreground mt-1 max-w-3xl">
          Exécution technique et trace durable des runs. La production éditoriale (beats, chapitre, validation) reste dans <strong>Production</strong>. Les runs lancés ici (ou par Production) persistent dans <code>runs</code> + <code>run_outputs</code> + <code>audit_findings</code> + <code>rewrite_tasks</code>.
        </p>
      </div>

      <div className="grid grid-cols-12 gap-4">
        {/* Form */}
        <div className="col-span-12 lg:col-span-5 cockpit-card p-4 space-y-3">
          <h2 className="font-display text-sm text-foreground">Nouveau run technique</h2>

          <label className="block text-xs">
            <span className="editorial-eyebrow block mb-0.5">Type</span>
            <select value={runType} onChange={(e) => setRunType(e.target.value as RunType)}
              className="w-full text-xs px-2 py-1.5 rounded border border-border bg-background">
              <optgroup label="Disponibles">
                {RUN_TYPES.map((r) => <option key={r.id} value={r.id}>{r.label}</option>)}
              </optgroup>
              <optgroup label="Futurs (désactivés)">
                {FUTURE_RUN_TYPES.map((r) => <option key={r} value={r} disabled>{r} — non implémenté</option>)}
              </optgroup>
            </select>
          </label>

          {def.needsAgent && (
            <label className="block text-xs">
              <span className="editorial-eyebrow block mb-0.5">Agent</span>
              <select value={agentId} onChange={(e) => setAgentId(e.target.value)}
                className="w-full text-xs px-2 py-1.5 rounded border border-border bg-background">
                {agents.length === 0 && <option value="">Aucun agent — initialiser dans Agent Studio</option>}
                {agents.map((a) => <option key={a.id} value={a.id}>{a.name} {a.is_active ? '' : '· inactif'}</option>)}
              </select>
            </label>
          )}

          {def.needsTarget && (
            <label className="block text-xs">
              <span className="editorial-eyebrow block mb-0.5">Chapitre cible</span>
              <select value={chapterId} onChange={(e) => setChapterId(e.target.value)}
                className="w-full text-xs px-2 py-1.5 rounded border border-border bg-background">
                {chapters.length === 0 && <option value="">Aucun chapitre</option>}
                {chapters.map((c) => <option key={c.id} value={c.id}>#{c.number} {c.title}</option>)}
              </select>
            </label>
          )}

          <label className="block text-xs">
            <span className="editorial-eyebrow block mb-0.5">Modèle (optionnel)</span>
            <input value={model} onChange={(e) => setModel(e.target.value)} placeholder="ex: gpt-4.1-mini, gpt-5"
              className="w-full text-xs px-2 py-1.5 rounded border border-border bg-background" />
          </label>

          <label className="block text-xs">
            <span className="editorial-eyebrow block mb-0.5">Instruction (optionnel)</span>
            <textarea value={instruction} onChange={(e) => setInstruction(e.target.value)} rows={2}
              className="w-full text-xs px-2 py-1.5 rounded border border-border bg-background font-mono" />
          </label>

          {runType === 'structure_text_note' && (
            <label className="block text-xs">
              <span className="editorial-eyebrow block mb-0.5">Texte brut</span>
              <textarea value={rawText} onChange={(e) => setRawText(e.target.value)} rows={3}
                className="w-full text-xs px-2 py-1.5 rounded border border-border bg-background" />
            </label>
          )}

          <button onClick={execute} disabled={running}
            className="text-xs px-3 py-1.5 rounded bg-primary text-primary-foreground hover:opacity-90 disabled:opacity-50 inline-flex items-center gap-1.5">
            {running ? <Loader2 size={12} className="animate-spin" /> : <Play size={12} />}
            Exécuter live (persistance Supabase)
          </button>

          {err && (
            <div className="text-[11px] p-2 rounded border border-destructive/40 bg-destructive/5 text-destructive inline-flex items-start gap-1">
              <AlertTriangle size={11} className="mt-0.5" /> {err}
            </div>
          )}
        </div>

        {/* History */}
        <div className="col-span-12 lg:col-span-7 cockpit-card p-4 space-y-2">
          <div className="flex items-center justify-between">
            <h2 className="font-display text-sm text-foreground">Historique runs ({runs.length})</h2>
            <button onClick={loadRuns} className="text-[10px] font-mono px-2 py-1 rounded border border-border text-muted-foreground hover:text-foreground inline-flex items-center gap-1">
              <RefreshCcw size={10} /> Rafraîchir
            </button>
          </div>
          {runs.length === 0 ? (
            <p className="text-xs text-muted-foreground italic">Aucun run encore — lancez un run ci-contre.</p>
          ) : (
            <ul className="space-y-1 max-h-[300px] overflow-y-auto">
              {runs.map((r) => (
                <li key={r.id}>
                  <button onClick={() => openRun(r)}
                    className={`w-full text-left text-[11px] px-2 py-1.5 rounded border flex items-center gap-2 ${selectedRun?.id === r.id ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/40'}`}>
                    {r.status === 'completed' ? <CheckCircle2 size={11} className="text-emerald-600" /> :
                     r.status === 'failed' ? <XCircle size={11} className="text-destructive" /> :
                     r.status === 'running' ? <Loader2 size={11} className="animate-spin text-sky-500" /> :
                     <Clock size={11} className="text-muted-foreground" />}
                    <span className="flex-1 truncate font-mono">{r.name}</span>
                    <span className="text-[9px] text-muted-foreground">{r.duration ?? '—'}</span>
                    <span className="text-[9px] text-muted-foreground">{r.findings} finds</span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Run detail */}
        {selectedRun && (
          <div className="col-span-12 cockpit-card p-4 space-y-2">
            <div className="flex items-center justify-between">
              <h3 className="font-display text-sm text-foreground">Détail run · <span className="font-mono">{selectedRun.id.slice(0, 8)}</span></h3>
              <span className={`text-[10px] font-mono px-1.5 py-0.5 rounded border ${
                selectedRun.status === 'completed' ? 'bg-emerald-500/10 text-emerald-700 border-emerald-500/30' :
                selectedRun.status === 'failed' ? 'bg-destructive/10 text-destructive border-destructive/30' :
                'bg-amber-500/10 text-amber-700 border-amber-500/30'}`}>{selectedRun.status}</span>
            </div>
            <div className="grid grid-cols-2 gap-2 text-[11px]">
              <div>
                <p className="editorial-eyebrow mb-1">Payload (input)</p>
                <pre className="bg-muted/30 p-2 rounded font-mono max-h-48 overflow-auto">{JSON.stringify(selectedRun.payload, null, 2)}</pre>
              </div>
              <div>
                <p className="editorial-eyebrow mb-1">Result (summary)</p>
                <pre className="bg-muted/30 p-2 rounded font-mono max-h-48 overflow-auto">{JSON.stringify(selectedRun.result, null, 2)}</pre>
              </div>
            </div>
            <div>
              <p className="editorial-eyebrow mb-1">Outputs persistés ({outputs.length})</p>
              {outputs.length === 0 ? <p className="text-[11px] text-muted-foreground">Aucun</p> : (
                <ul className="space-y-1">
                  {outputs.map((o) => (
                    <li key={o.id} className="text-[11px] border border-border rounded p-2">
                      <span className="font-mono text-[10px] text-muted-foreground">{o.kind}</span>
                      <pre className="mt-1 bg-muted/20 p-1.5 rounded font-mono max-h-40 overflow-auto">{JSON.stringify(o.payload, null, 2)}</pre>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
