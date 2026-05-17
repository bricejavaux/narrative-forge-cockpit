import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { History, Save, GitCompare, RotateCcw, Loader2 } from 'lucide-react';

type AgentRow = { id: string; name: string; objective: string | null; default_model: string | null; selected_model: string | null; persistence_status: string | null };
type VersionRow = { id: string; version_number: number; objective: string | null; system_prompt: string | null; is_current: boolean; created_at: string; change_reason: string | null };

export default function AgentVersionEditorPanel() {
  const [agents, setAgents] = useState<AgentRow[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [versions, setVersions] = useState<VersionRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [draft, setDraft] = useState({ objective: '', system_prompt: '', operating_script: '', model_recommendations: '', inputs_schema: '', outputs_schema: '', index_dependencies: '', permission_policy: '' });

  useEffect(() => {
    (async () => {
      setLoading(true);
      const { data } = await supabase.from('agents').select('id,name,objective,default_model,selected_model,persistence_status').order('name', { ascending: true });
      const list = (data ?? []) as AgentRow[];
      setAgents(list);
      if (list.length > 0) setSelectedId(list[0].id);
      setLoading(false);
    })();
  }, []);

  useEffect(() => {
    if (!selectedId) return;
    (async () => {
      const { data } = await supabase
        .from('agent_versions')
        .select('id,version_number,objective,system_prompt,is_current,created_at,change_reason')
        .eq('agent_id', selectedId)
        .order('version_number', { ascending: false });
      const list = (data ?? []) as VersionRow[];
      setVersions(list);
      const current = list.find(v => v.is_current) ?? list[0];
      if (current) {
        setDraft({
          objective: current.objective ?? '',
          system_prompt: current.system_prompt ?? '',
          operating_script: '',
          model_recommendations: '',
          inputs_schema: '',
          outputs_schema: '',
          index_dependencies: '',
          permission_policy: '',
        });
      }
    })();
  }, [selectedId]);

  const selected = agents.find(a => a.id === selectedId);

  return (
    <div className="cockpit-card space-y-3">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h3 className="text-sm font-display font-semibold text-foreground flex items-center gap-2">
            <History size={14} /> Agent Studio · Éditeur &amp; versions
          </h3>
          <p className="text-[11px] text-muted-foreground">
            Lecture Supabase <span className="font-mono">agents</span> / <span className="font-mono">agent_versions</span>.
            Édition désactivée tant que la persistance n'est pas branchée.
          </p>
        </div>
        <span className="text-[10px] font-mono px-1.5 py-0.5 rounded border bg-amber-500/10 text-amber-700 border-amber-500/30">
          agent persistence pending
        </span>
      </div>

      {loading && <p className="text-xs text-muted-foreground"><Loader2 size={11} className="inline animate-spin mr-1" /> Chargement…</p>}

      {!loading && agents.length === 0 && (
        <p className="text-xs text-muted-foreground italic">
          Aucun agent en base — fallback dummy actif. Bouton « Initialiser agents par défaut dans Supabase » disponible plus haut.
        </p>
      )}

      {agents.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
          <div className="md:col-span-1 space-y-1 max-h-72 overflow-y-auto">
            {agents.map(a => (
              <button key={a.id} onClick={() => setSelectedId(a.id)}
                className={`w-full text-left px-2 py-1.5 rounded text-xs border ${selectedId === a.id ? 'border-primary/40 bg-primary/10 text-primary' : 'border-border text-foreground/80 hover:border-primary/30'}`}>
                {a.name}
                <div className="text-[10px] text-muted-foreground font-mono">{a.persistence_status ?? 'suggestions_only'}</div>
              </button>
            ))}
          </div>

          <div className="md:col-span-3 space-y-3">
            {selected && (
              <>
                <div className="grid grid-cols-2 gap-2">
                  {(['objective', 'system_prompt', 'operating_script', 'model_recommendations', 'inputs_schema', 'outputs_schema', 'index_dependencies', 'permission_policy'] as const).map(field => (
                    <label key={field} className="text-[11px] text-muted-foreground">
                      <span className="font-mono">{field}</span>
                      <textarea
                        readOnly
                        value={(draft as any)[field] ?? ''}
                        placeholder={field === 'objective' ? 'objectif de l\'agent' : `${field} — édition pending`}
                        className="mt-0.5 w-full min-h-[48px] text-xs bg-secondary/30 border border-border rounded px-2 py-1 text-foreground/80 font-mono cursor-not-allowed"
                      />
                    </label>
                  ))}
                </div>

                <div className="flex items-center gap-2 flex-wrap">
                  <button disabled className="inline-flex items-center gap-1 text-xs px-2 py-1 rounded border border-border text-muted-foreground cursor-not-allowed" title="Persistance pending">
                    <Save size={11} /> Sauver nouvelle version
                  </button>
                  <button disabled className="inline-flex items-center gap-1 text-xs px-2 py-1 rounded border border-border text-muted-foreground cursor-not-allowed" title="UI de comparaison pending">
                    <GitCompare size={11} /> Comparer versions
                  </button>
                  <button disabled className="inline-flex items-center gap-1 text-xs px-2 py-1 rounded border border-border text-muted-foreground cursor-not-allowed" title="Persistance pending">
                    <RotateCcw size={11} /> Restaurer version
                  </button>
                  <span className="text-[10px] font-mono text-muted-foreground">
                    Boutons désactivés : edge functions <span className="font-mono">agent-save-version</span> / <span className="font-mono">agent-restore-version</span> non implémentées.
                  </span>
                </div>

                <div>
                  <p className="editorial-eyebrow mb-1">Historique des versions</p>
                  {versions.length === 0 ? (
                    <p className="text-[11px] text-muted-foreground italic">Aucune version persistée pour cet agent.</p>
                  ) : (
                    <ul className="text-xs divide-y divide-border">
                      {versions.map(v => (
                        <li key={v.id} className="flex items-center justify-between py-1">
                          <span className="font-mono">v{v.version_number} {v.is_current && <span className="text-emerald-600">· current</span>}</span>
                          <span className="text-[10px] text-muted-foreground">{new Date(v.created_at).toLocaleString()}</span>
                          <span className="text-[10px] text-muted-foreground truncate max-w-[40%]">{v.change_reason ?? '—'}</span>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
