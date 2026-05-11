import { useEffect, useMemo, useState } from 'react';
import { agents } from '@/data/dummyData';
import StatusBadge from '@/components/shared/StatusBadge';
import NoteComposer from '@/components/shared/NoteComposer';
import PersistedAgentsPanel from '@/components/shared/PersistedAgentsPanel';
import { Bot, X, Sliders, Brain, ArrowDownToLine, ArrowUpFromLine, AlertTriangle, DollarSign, Clock, Database, Play, Loader2, ListChecks, Shield } from 'lucide-react';
import { OPENAI_MODELS, CUSTOM_MODEL_OPTION_ID, defaultModelForCategory, defaultProfileForCategory, modelById } from '@/lib/openaiModels';
import { supabaseService, type ConnectionReadiness } from '@/services/supabaseService';
import { openaiService } from '@/services/openaiService';

const categories = ['Tous', 'génération', 'audit', 'diagnostic', 'réécriture', 'style', 'export'];

// Per-category model recommendation set: [fast, balanced, premium, reasoning?]
function recommendationsFor(category: string): { fast: string; balanced: string; premium: string; reasoning?: string } {
  switch (category) {
    case 'génération':   return { fast: 'gpt-4.1-mini', balanced: 'gpt-4.1', premium: 'gpt-5', reasoning: 'o4-mini' };
    case 'réécriture':   return { fast: 'gpt-4.1-mini', balanced: 'gpt-4.1', premium: 'gpt-5', reasoning: 'o4-mini' };
    case 'audit':        return { fast: 'gpt-4.1-mini', balanced: 'gpt-4.1', premium: 'o4-mini', reasoning: 'gpt-5' };
    case 'diagnostic':   return { fast: 'gpt-4.1-nano', balanced: 'gpt-4.1-mini', premium: 'gpt-4.1', reasoning: 'o4-mini' };
    case 'style':        return { fast: 'gpt-4.1-nano', balanced: 'gpt-4.1-mini', premium: 'gpt-4.1' };
    case 'export':       return { fast: 'gpt-4.1-nano', balanced: 'gpt-4.1-mini', premium: 'gpt-4.1' };
    default:             return { fast: 'gpt-4.1-nano', balanced: 'gpt-4.1-mini', premium: 'gpt-4.1' };
  }
}

function operatingScript(category: string): string[] {
  if (category === 'génération') return [
    'Charger l\'objet cible (chapitre / scène / arc)',
    'Charger le canon actif (Supabase)',
    'Charger personnages / arcs / chapitres référencés',
    'Consulter les indexes vectoriels disponibles (si pgvector actif)',
    'Appeler le modèle OpenAI sélectionné',
    'Générer un brouillon structuré + métadonnées',
    'Créer findings / recommandations / rewrite_tasks',
    'Validation humaine requise',
    'Persistance optionnelle dans Supabase — jamais d\'écriture directe du texte du chapitre',
  ];
  if (category === 'réécriture') return [
    'Charger l\'objet cible et sa version courante',
    'Charger canon, personnages, arcs liés',
    'Consulter indexes vectoriels (si pgvector actif)',
    'Appeler OpenAI avec instruction de réécriture',
    'Produire un diff justifié + niveau de confiance',
    'Créer un rewrite_task (status: pending)',
    'Validation humaine obligatoire avant intégration',
    'Aucune modification directe du texte du chapitre',
  ];
  if (category === 'export') return [
    'Charger l\'objet cible (chapitre / canon / scope)',
    'Mettre en forme selon format (txt / md / json)',
    'Renvoyer le contenu structuré',
    'Persistance optionnelle export_jobs',
    'Upload optionnel OneDrive 04_exports (validation manuelle)',
  ];
  return [
    'Charger l\'objet (ou les objets) cible',
    'Charger canon actif + personnages / arcs / chapitres liés',
    'Consulter indexes vectoriels (si pgvector actif)',
    'Appeler OpenAI avec le profil qualité sélectionné',
    'Retourner une sortie structurée (JSON)',
    'Créer findings / recommandations',
    'Validation humaine requise',
    'Persistance optionnelle audit_findings — pas d\'écriture du texte',
  ];
}

function SliderParam({ label, value, min = 0, max = 100 }: { label: string; value: number; min?: number; max?: number }) {
  return (
    <div className="space-y-1">
      <div className="flex justify-between text-xs">
        <span className="text-muted-foreground">{label}</span>
        <span className="font-mono text-foreground">{value}</span>
      </div>
      <div className="h-1.5 bg-secondary rounded-full overflow-hidden">
        <div className="h-full bg-primary/80 rounded-full" style={{ width: `${((value - min) / (max - min)) * 100}%` }} />
      </div>
    </div>
  );
}

export default function AgentsPage() {
  const [filter, setFilter] = useState('Tous');
  const [selectedAgent, setSelectedAgent] = useState<string | null>(agents[0]?.id ?? null);
  const filtered = filter === 'Tous' ? agents : agents.filter((a) => a.category === filter);
  const agent = agents.find((a) => a.id === selectedAgent);

  // Readiness (live / mock)
  const [readiness, setReadiness] = useState<ConnectionReadiness | null>(null);
  useEffect(() => {
    supabaseService.getReadiness().then(setReadiness).catch(() => setReadiness(null));
  }, []);
  const openaiReady = !!readiness?.openai?.api_key_configured;

  // Per-agent model selection (persisted in localStorage)
  const [modelByAgent, setModelByAgent] = useState<Record<string, string>>(() => {
    try { return JSON.parse(localStorage.getItem('agent_model_map') ?? '{}'); } catch { return {}; }
  });
  const currentModel = useMemo(() => {
    if (!agent) return '';
    return modelByAgent[agent.id] || agent.defaultModel || defaultModelForCategory(agent.category);
  }, [agent, modelByAgent]);
  const setModel = (id: string, value: string) => {
    const next = { ...modelByAgent, [id]: value };
    setModelByAgent(next);
    localStorage.setItem('agent_model_map', JSON.stringify(next));
  };
  const modelMeta = modelById(currentModel);
  const profile = agent?.modelProfile || (agent ? defaultProfileForCategory(agent.category) : undefined);

  const [running, setRunning] = useState(false);
  const [lastRun, setLastRun] = useState<any>(null);
  const launchAgent = async () => {
    if (!agent) return;
    setRunning(true); setLastRun(null);
    try {
      const res = await openaiService.runAgent(agent.id, { objective: agent.objective }, { model: currentModel, qualityProfile: profile });
      setLastRun(res);
    } catch (e) {
      setLastRun({ error: e instanceof Error ? e.message : 'unknown' });
    } finally {
      setRunning(false);
    }
  };

  return (
    <div className="animate-slide-in space-y-6">
      <div>
        <p className="editorial-eyebrow">Intelligence</p>
        <h1 className="text-3xl editorial-heading text-foreground mt-1">Agent Studio</h1>
        <p className="text-sm text-muted-foreground mt-2 max-w-2xl">
          Chaque agent est un module d'intelligence orchestré par OpenAI. Inspectez son objectif,
          ses indexes consommés, sa mémoire, et ajustez son comportement par texte ou voix.
        </p>
        <div className="mt-2 flex items-center gap-2 text-[11px]">
          <span className={`px-2 py-0.5 rounded-full border font-mono ${openaiReady ? 'bg-emerald-500/10 text-emerald-600 border-emerald-500/30' : 'bg-amber-500/10 text-amber-600 border-amber-500/30'}`}>
            {openaiReady ? 'OpenAI : clé détectée — exécution live possible' : 'OpenAI : clé absente — mode mock'}
          </span>
          {readiness?.openai?.model && (
            <span className="text-muted-foreground font-mono">défaut Edge: {readiness.openai.model}</span>
          )}
        </div>
      </div>

      <div className="flex gap-2 flex-wrap">
        {categories.map((cat) => (
          <button
            key={cat}
            onClick={() => setFilter(cat)}
            className={`px-3 py-1.5 text-xs rounded-full border transition-colors ${
              filter === cat ? 'border-primary/50 bg-primary/10 text-primary' : 'border-border text-muted-foreground hover:text-foreground'
            }`}
          >
            {cat === 'Tous' ? 'Tous' : cat}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-12 gap-6">
        <div className={`${agent ? 'col-span-5' : 'col-span-12'} grid ${agent ? 'grid-cols-1' : 'grid-cols-2 lg:grid-cols-3'} gap-3 auto-rows-min`}>
          {filtered.map((a) => {
            // openaiReady drives runtime label
            const persistenceStatus = a.rewriteRights ? 'writes_pending_validation' : 'suggestions_only';
            return (
            <button
              key={a.id}
              onClick={() => setSelectedAgent(a.id)}
              className={`text-left cockpit-card cursor-pointer hover:border-primary/40 transition-all ${
                selectedAgent === a.id ? 'cockpit-glow-cyan' : ''
              }`}
            >
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <Bot size={14} className="text-primary" strokeWidth={1.75} />
                  <span className="font-display text-[14px] text-foreground" style={{ fontWeight: 500 }}>{a.name}</span>
                </div>
                <div className="flex flex-col items-end gap-0.5">
                  <span className={`text-[9px] font-mono px-1.5 py-0.5 rounded border ${openaiReady ? 'bg-emerald-500/10 text-emerald-600 border-emerald-500/30' : 'bg-slate-500/10 text-slate-600 border-slate-500/30'}`}>
                    {openaiReady ? 'live OpenAI test' : 'stubbed orchestration'}
                  </span>
                  <span className="text-[9px] font-mono px-1.5 py-0.5 rounded border bg-amber-500/10 text-amber-600 border-amber-500/30">
                    vector context pending
                  </span>
                </div>
              </div>
              <p className="text-xs text-foreground/70 mb-2 leading-snug">{a.objective}</p>
              <div className="flex items-center justify-between text-[11px] text-muted-foreground">
                <span className="font-mono">{a.simulatedCost}</span>
                <span className="text-[10px] uppercase tracking-wider">{persistenceStatus.replace(/_/g, ' ')}</span>
                {a.rewriteRights && <span className="text-amber">écriture</span>}
              </div>
            </button>
            );
          })}
        </div>

        {agent && (
          <aside className="col-span-7 space-y-4 animate-slide-in">
            <div className="cockpit-card-elevated space-y-3">
              <div className="flex items-start justify-between">
                <div>
                  <p className="editorial-eyebrow mb-0.5 capitalize">{agent.category}</p>
                  <h2 className="text-2xl editorial-heading text-foreground">{agent.name}</h2>
                </div>
                <button onClick={() => setSelectedAgent(null)} className="text-muted-foreground hover:text-foreground p-1 rounded hover:bg-secondary"><X size={16} /></button>
              </div>
              <p className="text-sm text-foreground/85 leading-relaxed">{agent.objective}</p>

              <div className="grid grid-cols-3 gap-2 pt-2">
                <div className="rounded-lg border border-border bg-secondary/30 p-2.5">
                  <p className="editorial-eyebrow flex items-center gap-1"><DollarSign size={9} /> Coût estimé</p>
                  <p className="text-sm font-mono text-foreground mt-0.5">{modelMeta?.costEstimate ?? agent.simulatedCost}</p>
                </div>
                <div className="rounded-lg border border-border bg-secondary/30 p-2.5">
                  <p className="editorial-eyebrow flex items-center gap-1"><Clock size={9} /> Latence estimée</p>
                  <p className="text-sm font-mono text-foreground mt-0.5">{modelMeta?.latencyEstimate ?? '~2.4s'}</p>
                </div>
                <div className="rounded-lg border border-border bg-secondary/30 p-2.5">
                  <p className="editorial-eyebrow flex items-center gap-1"><Database size={9} /> Modèle OpenAI</p>
                  <select
                    value={OPENAI_MODELS.some((m) => m.id === currentModel) ? currentModel : CUSTOM_MODEL_OPTION_ID}
                    onChange={(e) => {
                      const v = e.target.value;
                      if (v === CUSTOM_MODEL_OPTION_ID) setModel(agent.id, '');
                      else setModel(agent.id, v);
                    }}
                    className="mt-0.5 w-full bg-card border border-border rounded px-1.5 py-0.5 text-[11px] font-mono text-foreground"
                  >
                    {OPENAI_MODELS.map((m) => (
                      <option key={m.id} value={m.id}>{m.label} · {m.tier}{m.availability === 'configurable' ? ' · configurable' : ''}</option>
                    ))}
                    <option value={CUSTOM_MODEL_OPTION_ID}>Modèle personnalisé…</option>
                  </select>
                  {!OPENAI_MODELS.some((m) => m.id === currentModel) && (
                    <input
                      type="text"
                      placeholder="ex: gpt-5.5, my-org/model"
                      value={currentModel}
                      onChange={(e) => setModel(agent.id, e.target.value)}
                      className="mt-1 w-full bg-card border border-border rounded px-1.5 py-0.5 text-[11px] font-mono text-foreground"
                    />
                  )}
                  {modelMeta?.availability === 'configurable' && (
                    <p className="mt-1 text-[10px] text-amber-600">Disponibilité non garantie pour cette clé API.</p>
                  )}
                </div>
              </div>

              {(() => {
                const rec = recommendationsFor(agent.category);
                const Pill = ({ id, label }: { id: string; label: string }) => {
                  const isSel = currentModel === id;
                  const meta = modelById(id);
                  return (
                    <button
                      onClick={() => setModel(agent.id, id)}
                      className={`text-left rounded-md border px-2 py-1.5 text-[11px] transition-colors ${isSel ? 'border-primary/50 bg-primary/10 text-primary' : 'border-border hover:border-primary/30 text-foreground/80'}`}
                      title={meta?.note}
                    >
                      <div className="font-mono">{label}: {id}</div>
                      <div className="text-[10px] text-muted-foreground">{meta?.costEstimate} · {meta?.latencyEstimate}{meta?.availability === 'configurable' ? ' · configurable' : ''}</div>
                    </button>
                  );
                };
                return (
                  <div className="rounded-lg border border-border bg-secondary/30 p-2.5">
                    <p className="editorial-eyebrow mb-1">Modèles recommandés · profil <span className="font-mono">{profile}</span></p>
                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-1.5">
                      <Pill id={rec.fast} label="fast" />
                      <Pill id={rec.balanced} label="balanced" />
                      <Pill id={rec.premium} label="premium" />
                      {rec.reasoning && <Pill id={rec.reasoning} label="reasoning" />}
                    </div>
                    <p className="text-[10px] text-muted-foreground mt-1.5">
                      Critères : coût · latence · besoin de raisonnement · contexte long · qualité créative · fiabilité JSON.
                      {modelMeta?.availability === 'configurable' && ' Le modèle sélectionné est configurable — disponibilité non garantie selon votre compte OpenAI.'}
                    </p>
                  </div>
                );
              })()}

              <div className="flex items-center gap-2 pt-1 flex-wrap">
                <button
                  onClick={launchAgent}
                  disabled={running}
                  className="inline-flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-md border border-primary/40 bg-primary/10 text-primary hover:bg-primary/20 disabled:opacity-50"
                >
                  {running ? <Loader2 size={12} className="animate-spin" /> : <Play size={12} />}
                  {openaiReady ? 'Exécuter test live OpenAI' : 'Tester agent — stub'}
                </button>
                <span className={`text-[10px] font-mono px-1.5 py-0.5 rounded border ${openaiReady ? 'bg-emerald-500/10 text-emerald-600 border-emerald-500/30' : 'bg-slate-500/10 text-slate-600 border-slate-500/30'}`}>
                  runtime : {openaiReady ? 'live OpenAI test' : 'stubbed orchestration'}
                </span>
                <span className="text-[10px] font-mono px-1.5 py-0.5 rounded border bg-amber-500/10 text-amber-600 border-amber-500/30">
                  vector context pending
                </span>
                <span className={`text-[10px] font-mono px-1.5 py-0.5 rounded border ${agent.rewriteRights ? 'bg-amber-500/10 text-amber-600 border-amber-500/30' : 'bg-slate-500/10 text-slate-600 border-slate-500/30'}`}>
                  {agent.rewriteRights ? 'writes pending validation' : 'suggestions only'}
                </span>
                <span className="text-[10px] font-mono px-1.5 py-0.5 rounded border bg-slate-500/10 text-slate-600 border-slate-500/30">
                  no persistence yet
                </span>
              </div>

              {lastRun && (
                <div className="mt-1 space-y-1">
                  {lastRun.model_unavailable && (
                    <div className="flex items-start gap-2 rounded-md border border-rose-500/30 bg-rose-500/5 p-2 text-[11px] text-rose-600">
                      <AlertTriangle size={11} className="mt-0.5" />
                      Modèle indisponible pour cette clé API. Choisissez un autre modèle ou vérifiez l'accès à votre compte OpenAI.
                    </div>
                  )}
                  <details>
                    <summary className="text-[11px] text-muted-foreground cursor-pointer">Dernier appel — {lastRun.mode ?? 'error'} {lastRun.model ? `· ${lastRun.model}` : ''}</summary>
                    <pre className="text-[10px] font-mono bg-muted/40 p-2 rounded mt-1 overflow-auto max-h-48">{JSON.stringify(lastRun, null, 2)}</pre>
                  </details>
                </div>
              )}


              <div className="rounded-lg border border-border bg-secondary/30 p-2.5">
                <p className="editorial-eyebrow mb-1">Niveau de permission</p>
                <p className="text-xs text-foreground">
                  {agent.permissionLevel === 'read-only' && 'Lecture seule — diagnostic uniquement'}
                  {agent.permissionLevel === 'recommendation' && 'Recommandation — propose, n\'écrit pas'}
                  {agent.permissionLevel === 'targeted-rewrite-with-validation' && 'Réécriture ciblée — validation humaine requise'}
                  {agent.permissionLevel === 'deep-rewrite-with-validation' && 'Réécriture profonde — approbation auteur obligatoire'}
                  {!agent.permissionLevel && '—'}
                </p>
              </div>

              <div className="grid grid-cols-2 gap-3 pt-2 text-xs">
                <div className="rounded-lg border border-border p-2.5">
                  <p className="editorial-eyebrow flex items-center gap-1 mb-1"><ArrowDownToLine size={10} /> Inputs attendus</p>
                  <p className="text-foreground/80">Contexte narratif, fiches liées, dernières versions</p>
                </div>
                <div className="rounded-lg border border-border p-2.5">
                  <p className="editorial-eyebrow flex items-center gap-1 mb-1"><ArrowUpFromLine size={10} /> Outputs</p>
                  <p className="text-foreground/80">
                    {agent.category === 'audit' ? 'Findings, scores, recommandations'
                      : agent.category === 'réécriture' ? 'Diff de réécriture, justifications'
                      : 'Brouillon structuré + métadonnées'}
                  </p>
                </div>
              </div>

              <div>
                <p className="editorial-eyebrow mb-1.5">Indexes consultés (cibles design)</p>
                <div className="flex flex-wrap gap-1.5">
                  {agent.futureIndexes.map((idx) => (
                    <span key={idx} className="px-2 py-0.5 rounded text-[11px] font-mono bg-primary/10 text-primary border border-primary/20">
                      {idx} · pending
                    </span>
                  ))}
                </div>
                <p className="text-[10px] text-muted-foreground mt-1.5">
                  Contexte d'exécution actuel : payload sélectionné + objets Supabase / fallback démo. Récupération vectorielle <span className="font-mono text-amber">pending</span> (pgvector non actif).
                </p>
              </div>

              {/* Operating script */}
              <div className="rounded-lg border border-border bg-secondary/30 p-2.5">
                <p className="editorial-eyebrow flex items-center gap-1 mb-1.5"><ListChecks size={10} /> Script de fonctionnement</p>
                <ol className="text-[11px] space-y-0.5 text-foreground/85 list-decimal list-inside marker:text-muted-foreground">
                  {operatingScript(agent.category).map((s, i) => (<li key={i}>{s}</li>))}
                </ol>
              </div>

              {/* Persistence policy */}
              <div className="rounded-lg border border-border bg-secondary/30 p-2.5">
                <p className="editorial-eyebrow flex items-center gap-1 mb-1"><Shield size={10} /> Politique de persistance</p>
                <ul className="text-[11px] space-y-0.5 text-foreground/85 list-disc list-inside marker:text-muted-foreground">
                  <li>{agent.rewriteRights ? 'Peut produire des rewrite_tasks (jamais d\'écriture directe du texte du chapitre)' : 'Suggestions only — pas de réécriture'}</li>
                  <li>Écrit findings / recommandations seulement après validation</li>
                  <li>Validation humaine obligatoire avant toute intégration</li>
                  <li>Mode autonome : <span className="font-mono">future</span></li>
                </ul>
              </div>

              {agent.rewriteRights && (
                <div className="flex items-start gap-2 rounded-lg border border-amber/30 bg-amber/5 p-2.5 text-xs text-foreground">
                  <AlertTriangle size={12} className="text-amber mt-0.5" />
                  Cet agent dispose des droits de réécriture — validation humaine requise.
                </div>
              )}
            </div>

            {/* Sliders */}
            <div className="cockpit-card space-y-3">
              <div className="flex items-center gap-2">
                <Sliders size={13} className="text-primary" />
                <h3 className="editorial-eyebrow">Paramètres comportementaux</h3>
              </div>
              <div className="grid grid-cols-2 gap-x-5 gap-y-3">
                <SliderParam label="Tempo" value={65} />
                <SliderParam label="Compression" value={30} />
                <SliderParam label="Densité scientifique" value={55} />
                <SliderParam label="Amplitude émotionnelle" value={70} />
                <SliderParam label="Brutalité des pivots" value={45} />
                <SliderParam label="Degré de mystère" value={72} />
                <SliderParam label="Tolérance répétition" value={20} />
                <SliderParam label="Fragmentation POV" value={35} />
                <SliderParam label="Intensité réécriture" value={agent.rewriteRights ? 55 : 0} />
                <SliderParam label="Délai avant payoff" value={60} />
              </div>
            </div>

            {/* Memory & evolution */}
            <div className="cockpit-card space-y-3">
              <div className="flex items-center gap-2">
                <Brain size={13} className="text-accent" />
                <h3 className="editorial-eyebrow">Mémoire & évolution</h3>
              </div>
              <div className="space-y-2 text-xs">
                {[
                  { date: '2026-04-12', note: 'Auteur : "moins d\'adverbes, plus de gestes physiques"', via: 'voix' },
                  { date: '2026-04-08', note: 'Recalibrage de la densité scientifique (-15%)', via: 'texte' },
                  { date: '2026-04-02', note: 'Ajustement du seuil de validation humaine', via: 'texte' },
                ].map((h, i) => (
                  <div key={i} className="flex items-start gap-3 py-1.5 border-b border-border/60 last:border-0">
                    <span className="text-[10px] font-mono text-muted-foreground w-20 shrink-0">{h.date}</span>
                    <p className="flex-1 text-foreground/80">{h.note}</p>
                    <span className="text-[10px] uppercase tracking-wider text-muted-foreground">{h.via}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Tuning composer */}
            <NoteComposer target={`Tuning · ${agent.name}`} />
          </aside>
        )}
      </div>
    </div>
  );
}
