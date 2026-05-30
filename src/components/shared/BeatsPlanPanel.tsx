import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import {
  Loader2, RefreshCw, Sparkles, AlertTriangle, X, Save, ShieldCheck, Layers, StopCircle,
} from 'lucide-react';
import { OPENAI_MODELS, CUSTOM_MODEL_OPTION_ID } from '@/lib/openaiModels';

type Chapter = { id: string; number: number; title: string; scale: string | null; main_arc: string | null };

type PreviewBeat = {
  beat_number: number; title: string; objective?: string; narrative_function?: string;
  characters?: string[]; arcs?: string[]; canon_links?: string[];
  tension_start?: number; tension_end?: number; scientific_density?: number; emotional_density?: number;
  decision_made?: string; consequence?: string; revelation?: string; payoff?: string;
  required_detail?: string; risk_flags?: string[];
};

type PersistedBeat = { id: string; beat_number: number | null; title: string; status: string | null; validation_status: string | null; narrative_function: string | null };

type PreviewResp = { mode?: string; model?: string; chapter_title?: string; count?: number; beats?: PreviewBeat[]; warnings?: string[]; error?: string };

type BeatMode = {
  id: string;
  name: string;
  description: string;
  whenToUse: string;
  detail: string;
  recommendedModel: string;
  costLatency: string;
  requiresPgvector: boolean;
  canRunNow: boolean;
  recommended?: boolean;
};

const BEAT_MODES: BeatMode[] = [
  { id: 'balanced', name: 'Balanced narrative beats', description: 'Beats équilibrés : objectif, fonction narrative, décision, conséquence, tension.', whenToUse: 'Cas général — production de tome.', detail: 'standard', recommendedModel: 'gpt-4.1-mini', costLatency: '~$0.05 · ~2s', requiresPgvector: false, canRunNow: true, recommended: true },
  { id: 'skeleton', name: 'Fast skeleton', description: 'Squelette rapide : titre + objectif + fonction.', whenToUse: 'Première passe ultra-rapide, gros volume.', detail: 'light', recommendedModel: 'gpt-4.1-nano', costLatency: '~$0.01 · ~1s', requiresPgvector: false, canRunNow: true },
  { id: 'detailed', name: 'Detailed narrative engineering', description: 'Beats riches : payoffs, révélations, required_detail, canon_links.', whenToUse: 'Chapitres critiques (climax, charnière).', detail: 'rich', recommendedModel: 'gpt-4.1', costLatency: '~$0.25 · ~4s', requiresPgvector: false, canRunNow: true },
  { id: 'character', name: 'Character-focused', description: 'Centré sur arcs et trajectoires émotionnelles personnages.', whenToUse: 'Chapitres pivots personnage.', detail: 'standard', recommendedModel: 'gpt-4.1-mini', costLatency: '~$0.05 · ~2s', requiresPgvector: false, canRunNow: true },
  { id: 'canon', name: 'Canon-heavy', description: 'Vérifie l\'ancrage canon (lore, règles, exceptions).', whenToUse: 'Quand le canon est dense ou contraignant.', detail: 'standard', recommendedModel: 'gpt-4.1', costLatency: '~$0.25 · ~4s', requiresPgvector: true, canRunNow: false },
  { id: 'science', name: 'Science-density aware', description: 'Module la densité scientifique attendue par beat.', whenToUse: 'Chapitres à forte charge technique.', detail: 'standard', recommendedModel: 'gpt-4.1', costLatency: '~$0.25 · ~4s', requiresPgvector: true, canRunNow: false },
  { id: 'tension', name: 'Tension escalation', description: 'Optimisé pour la courbe de tension start→end.', whenToUse: 'Chapitres d\'action / confrontation.', detail: 'standard', recommendedModel: 'gpt-4.1-mini', costLatency: '~$0.05 · ~2s', requiresPgvector: false, canRunNow: true },
  { id: 'minimal', name: 'Minimal compact', description: 'Beats compacts, peu d\'overhead.', whenToUse: 'Inter-chapitres / transitions.', detail: 'light', recommendedModel: 'gpt-4.1-nano', costLatency: '~$0.01 · ~1s', requiresPgvector: false, canRunNow: true },
];

type BatchEntry = { chapter_id: string; chapter_title: string; status: 'pending' | 'running' | 'success' | 'error'; message?: string };

export default function BeatsPlanPanel() {
  const [chapters, setChapters] = useState<Chapter[]>([]);
  const [selected, setSelected] = useState<string | null>(null);
  const [persisted, setPersisted] = useState<PersistedBeat[]>([]);
  const [preview, setPreview] = useState<PreviewResp | null>(null);
  const [loading, setLoading] = useState(false);
  const [persisting, setPersisting] = useState(false);
  const [validating, setValidating] = useState(false);
  const [readError, setReadError] = useState<string | null>(null);

  const [modeId, setModeId] = useState<string>('balanced');
  const mode = BEAT_MODES.find((m) => m.id === modeId)!;
  const [modelId, setModelId] = useState<string>(mode.recommendedModel);
  const [customModel, setCustomModel] = useState<string>('');

  const [batch, setBatch] = useState<BatchEntry[] | null>(null);
  const [batchRunning, setBatchRunning] = useState(false);
  const [stopRequested, setStopRequested] = useState(false);

  const effectiveModel = modelId === CUSTOM_MODEL_OPTION_ID ? customModel.trim() : modelId;
  const modelMeta = OPENAI_MODELS.find((m) => m.id === modelId);

  const loadChapters = async () => {
    const { data, error } = await supabase
      .from('chapters').select('id,number,title,scale,main_arc')
      .order('number', { ascending: true }).limit(200);
    if (error) setReadError(error.message);
    else {
      setReadError(null);
      const list = (data as Chapter[]) ?? [];
      setChapters(list);
      if (list.length > 0 && !selected) setSelected(list[0].id);
    }
  };

  const loadPersisted = async (chapter_id: string) => {
    const { data, error } = await supabase
      .from('beats').select('id,beat_number,title,status,validation_status,narrative_function')
      .eq('chapter_id', chapter_id).eq('beat_type', 'planned').order('beat_number', { ascending: true });
    if (error) setReadError(error.message);
    else setPersisted((data as PersistedBeat[]) ?? []);
  };

  useEffect(() => { loadChapters(); }, []);
  useEffect(() => { if (selected) loadPersisted(selected); }, [selected]);
  useEffect(() => { setModelId(mode.recommendedModel); }, [modeId]); // eslint-disable-line

  const runPreviewFor = async (chapter_id: string): Promise<PreviewResp> => {
    const { data, error } = await supabase.functions.invoke('beats-preview', {
      body: { chapter_id, model: effectiveModel || undefined, mode: modeId, beat_count_target: 6 },
    });
    if (error) return { error: error.message };
    return data as PreviewResp;
  };

  const runPreview = async () => {
    if (!selected) return;
    setLoading(true); setPreview(null);
    try { setPreview(await runPreviewFor(selected)); }
    finally { setLoading(false); }
  };

  const runPersist = async () => {
    if (!selected || !preview?.beats?.length) return;
    if (!confirm(`Persister ${preview.beats.length} beats validés pour ce chapitre ? (upsert par beat_number)`)) return;
    setPersisting(true);
    try {
      const { data, error } = await supabase.functions.invoke('beats-persist', {
        body: { chapter_id: selected, beats: preview.beats, validation: 'human_confirmed', model: preview.model ?? null },
      });
      if (error) alert(`Erreur persist: ${error.message}`);
      else if ((data as any)?.error) alert(`Erreur persist: ${(data as any).error}`);
      await loadPersisted(selected);
    } finally { setPersisting(false); }
  };

  const validateAll = async () => {
    if (!selected || persisted.length === 0) return;
    if (!confirm(`Valider ${persisted.length} beats prévus de ce chapitre ? Aucune auto-validation au-delà de cette confirmation.`)) return;
    setValidating(true);
    try {
      const { error } = await supabase.functions.invoke('governance-update', {
        body: { target_table: 'beats', record_ids: persisted.map((b) => b.id), action: 'mark_validated' },
      });
      if (error) alert(`Erreur validation: ${error.message}`);
      await loadPersisted(selected);
    } finally { setValidating(false); }
  };

  const runBatchAll = async () => {
    if (chapters.length === 0) return;
    if (!confirm(`Générer (preview) les beats pour ${chapters.length} chapitres en séquence ?\nMode: ${mode.name}\nModèle: ${effectiveModel}\nCela peut être long et coûteux.`)) return;
    const initial: BatchEntry[] = chapters.map((c) => ({ chapter_id: c.id, chapter_title: c.title, status: 'pending' }));
    setBatch(initial); setBatchRunning(true); setStopRequested(false);
    for (let i = 0; i < initial.length; i++) {
      if (stopRequested) break;
      setBatch((prev) => prev?.map((e, idx) => idx === i ? { ...e, status: 'running' } : e) ?? null);
      try {
        const res = await runPreviewFor(initial[i].chapter_id);
        if (res.error) {
          setBatch((prev) => prev?.map((e, idx) => idx === i ? { ...e, status: 'error', message: res.error } : e) ?? null);
        } else {
          setBatch((prev) => prev?.map((e, idx) => idx === i ? { ...e, status: 'success', message: `${res.count ?? 0} beats` } : e) ?? null);
        }
      } catch (e: any) {
        setBatch((prev) => prev?.map((er, idx) => idx === i ? { ...er, status: 'error', message: e?.message ?? 'unknown' } : er) ?? null);
      }
    }
    setBatchRunning(false);
  };

  const editBeat = (i: number, field: keyof PreviewBeat, value: any) => {
    if (!preview?.beats) return;
    const next = [...preview.beats];
    next[i] = { ...next[i], [field]: value };
    setPreview({ ...preview, beats: next });
  };
  const removeBeat = (i: number) => {
    if (!preview?.beats) return;
    setPreview({ ...preview, beats: preview.beats.filter((_, idx) => idx !== i) });
  };

  const selChapter = chapters.find((c) => c.id === selected);
  const batchProgress = batch ? `${batch.filter((e) => e.status === 'success' || e.status === 'error').length}/${batch.length}` : '';

  return (
    <div className="cockpit-card p-6 space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <p className="editorial-eyebrow">Atelier — Beats prévus (guidé)</p>
          <h2 className="text-lg text-foreground">Planification beats par chapitre</h2>
        </div>
        <button onClick={() => { loadChapters(); if (selected) loadPersisted(selected); }}
          className="text-xs px-3 py-1.5 rounded border border-border hover:bg-secondary inline-flex items-center gap-1.5">
          <RefreshCw size={12} /> Rafraîchir chapitres + beats
        </button>
      </div>

      {readError && (
        <div className="text-xs p-3 rounded border border-destructive/40 bg-destructive/5 text-destructive inline-flex items-start gap-2">
          <AlertTriangle size={12} className="mt-0.5" /> {readError}
        </div>
      )}

      {/* Mode picker */}
      <div className="space-y-2">
        <p className="editorial-eyebrow">Mode de génération · défaut : Balanced narrative beats</p>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
          {BEAT_MODES.map((m) => {
            const isSel = m.id === modeId;
            return (
              <button key={m.id} onClick={() => setModeId(m.id)}
                className={`text-left rounded border p-2 transition-colors ${isSel ? 'border-primary/60 bg-primary/5' : 'border-border hover:border-primary/30'}`}>
                <div className="flex items-center justify-between gap-1">
                  <span className="text-[11px] font-display font-medium text-foreground leading-tight">{m.name}</span>
                  {m.recommended && <span className="text-[9px] font-mono px-1 rounded bg-emerald-500/10 text-emerald-700 border border-emerald-500/30">reco</span>}
                </div>
                <p className="text-[10px] text-muted-foreground mt-1 leading-snug">{m.description}</p>
                <div className="mt-1 flex flex-wrap gap-1 text-[9px] font-mono text-muted-foreground">
                  <span>{m.costLatency}</span>
                  <span>· {m.detail}</span>
                  {m.requiresPgvector && <span className="text-amber-600">· pgvector</span>}
                  {!m.canRunNow && <span className="text-rose-600">· non disponible</span>}
                </div>
              </button>
            );
          })}
        </div>
        {!mode.canRunNow && (
          <p className="text-[11px] text-amber-700">
            Ce mode requiert pgvector — non activé pour l'instant. Choisis un mode "can run now".
          </p>
        )}
      </div>

      {/* Model picker */}
      <div className="flex items-end gap-2 flex-wrap">
        <div>
          <p className="editorial-eyebrow mb-1">Modèle</p>
          <select value={modelId} onChange={(e) => setModelId(e.target.value)}
            className="text-xs px-2 py-1 rounded border border-border bg-background min-w-[14rem]">
            {OPENAI_MODELS.map((m) => (
              <option key={m.id} value={m.id}>{m.label} · {m.tier}{m.availability === 'configurable' ? ' · configurable' : ''}</option>
            ))}
            <option value={CUSTOM_MODEL_OPTION_ID}>Modèle personnalisé…</option>
          </select>
        </div>
        {modelId === CUSTOM_MODEL_OPTION_ID && (
          <input value={customModel} onChange={(e) => setCustomModel(e.target.value)} placeholder="ex: gpt-5.5"
            className="text-xs px-2 py-1 rounded border border-border bg-background w-44" />
        )}
        {modelMeta?.availability === 'configurable' && (
          <span className="text-[10px] text-amber-700">⚠ disponibilité non garantie pour cette clé API</span>
        )}
        {modelMeta && (
          <span className="text-[10px] font-mono text-muted-foreground">{modelMeta.costEstimate} · {modelMeta.latencyEstimate}</span>
        )}
      </div>

      {chapters.length === 0 && !readError && (
        <p className="text-xs text-muted-foreground">Plan de chapitres requis — importer depuis articulation.txt.</p>
      )}

      {chapters.length > 0 && (
        <div className="grid grid-cols-12 gap-4">
          <div className="col-span-4 space-y-1 max-h-[400px] overflow-y-auto pr-2 border-r border-border">
            <p className="editorial-eyebrow mb-2">Chapitres ({chapters.length})</p>
            {chapters.map((c) => (
              <button key={c.id} onClick={() => setSelected(c.id)}
                className={`w-full text-left px-2 py-1.5 rounded text-xs transition-colors ${
                  selected === c.id ? 'bg-primary/10 text-primary' : 'text-muted-foreground hover:bg-secondary/40 hover:text-foreground'
                }`}>
                <span className="font-mono">#{c.number}</span> {c.title}
                {c.scale && <span className="ml-1 text-[10px] text-muted-foreground">[{c.scale}]</span>}
              </button>
            ))}
          </div>

          <div className="col-span-8 space-y-3">
            {selChapter && (
              <div>
                <p className="text-xs text-foreground">
                  <span className="font-mono text-muted-foreground">#{selChapter.number}</span> {selChapter.title}
                </p>
                {selChapter.main_arc && (
                  <p className="text-[11px] text-muted-foreground mt-0.5">Arc : {selChapter.main_arc}</p>
                )}
              </div>
            )}

            <div className="flex gap-2 flex-wrap">
              <button onClick={runPreview} disabled={loading || persisting || !selected || !mode.canRunNow}
                className="text-xs px-3 py-1.5 rounded border border-border hover:bg-secondary disabled:opacity-50 inline-flex items-center gap-1.5">
                {loading ? <Loader2 size={12} className="animate-spin" /> : <Sparkles size={12} />}
                Preview beats (chapitre sélectionné)
              </button>
              <button onClick={runPersist} disabled={loading || persisting || !preview?.beats?.length}
                className="text-xs px-3 py-1.5 rounded bg-primary text-primary-foreground hover:opacity-90 disabled:opacity-50 inline-flex items-center gap-1.5">
                {persisting ? <Loader2 size={12} className="animate-spin" /> : <Save size={12} />}
                Persister beats validés
              </button>
              <button onClick={validateAll} disabled={validating || persisted.length === 0}
                className="text-xs px-3 py-1.5 rounded border border-emerald-500/40 text-emerald-700 hover:bg-emerald-500/5 disabled:opacity-50 inline-flex items-center gap-1.5">
                {validating ? <Loader2 size={12} className="animate-spin" /> : <ShieldCheck size={12} />}
                Valider tous ({persisted.length})
              </button>
              <button onClick={runBatchAll} disabled={batchRunning || !mode.canRunNow}
                className="text-xs px-3 py-1.5 rounded border border-violet-500/40 text-violet-700 hover:bg-violet-500/5 disabled:opacity-50 inline-flex items-center gap-1.5">
                {batchRunning ? <Loader2 size={12} className="animate-spin" /> : <Layers size={12} />}
                Générer pour tous les chapitres ({chapters.length})
              </button>
              {batchRunning && (
                <button onClick={() => setStopRequested(true)} className="text-xs px-3 py-1.5 rounded border border-rose-500/40 text-rose-700 inline-flex items-center gap-1.5">
                  <StopCircle size={12} /> Stop
                </button>
              )}
            </div>

            {batch && (
              <div className="rounded border border-border p-2">
                <p className="text-[11px] font-mono text-muted-foreground mb-1">Batch · {batchProgress}{stopRequested ? ' · arrêt demandé' : ''}</p>
                <div className="max-h-40 overflow-y-auto space-y-0.5">
                  {batch.map((e) => (
                    <div key={e.chapter_id} className="text-[11px] flex items-center gap-2">
                      <span className={`w-2 h-2 rounded-full ${
                        e.status === 'success' ? 'bg-emerald-500' :
                        e.status === 'error' ? 'bg-rose-500' :
                        e.status === 'running' ? 'bg-sky-500 animate-pulse' : 'bg-slate-400/40'
                      }`} />
                      <span className="truncate flex-1">{e.chapter_title}</span>
                      <span className="font-mono text-[10px] text-muted-foreground">{e.message ?? e.status}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {preview?.error && (
              <div className="text-xs p-2 rounded border border-destructive/40 bg-destructive/5 text-destructive">
                {preview.error}
              </div>
            )}

            {preview && !preview.error && preview.beats && preview.beats.length > 0 && (
              <div className="space-y-2">
                <p className="text-[11px] font-mono text-muted-foreground">
                  Preview · mode={preview.mode ?? modeId} · model={preview.model} · count={preview.count}
                  {preview.warnings && preview.warnings.length > 0 && (
                    <span className="text-amber-600"> · {preview.warnings.length} warnings</span>
                  )}
                </p>
                <div className="space-y-2 max-h-[360px] overflow-y-auto">
                  {preview.beats.map((b, i) => (
                    <div key={i} className="border border-border rounded p-2 space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-[10px] text-muted-foreground">#{b.beat_number}</span>
                        <input value={b.title} onChange={(e) => editBeat(i, 'title', e.target.value)}
                          className="flex-1 text-xs px-1 py-0.5 rounded bg-transparent border border-transparent hover:border-border focus:border-primary text-foreground" />
                        <button onClick={() => removeBeat(i)} className="text-destructive opacity-60 hover:opacity-100">
                          <X size={12} />
                        </button>
                      </div>
                      {b.objective && (
                        <textarea value={b.objective} onChange={(e) => editBeat(i, 'objective', e.target.value)} rows={2}
                          className="w-full text-[11px] px-1 py-0.5 rounded bg-transparent border border-transparent hover:border-border focus:border-primary text-foreground/80" />
                      )}
                      <div className="flex gap-3 text-[10px] text-muted-foreground font-mono flex-wrap">
                        {b.narrative_function && <span>fn: {b.narrative_function}</span>}
                        {typeof b.tension_start === 'number' && (<span>tens: {b.tension_start}→{b.tension_end}</span>)}
                        {b.risk_flags && b.risk_flags.length > 0 && (<span className="text-amber-600">⚠ {b.risk_flags.join(', ')}</span>)}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="pt-3 border-t border-border">
              <p className="text-xs editorial-eyebrow mb-2">Beats persistés ({persisted.length})</p>
              {persisted.length === 0 && (
                <p className="text-xs text-muted-foreground">Aucun beat persisté pour ce chapitre.</p>
              )}
              {persisted.length > 0 && (
                <ul className="space-y-1 max-h-48 overflow-y-auto">
                  {persisted.map((b) => (
                    <li key={b.id} className="text-xs flex items-center gap-2">
                      <span className="font-mono text-[10px] text-muted-foreground w-6">#{b.beat_number}</span>
                      <span className="flex-1 text-foreground">{b.title}</span>
                      <span className={`text-[10px] font-mono px-1.5 py-0.5 rounded border ${
                        b.validation_status === 'validated' ? 'border-emerald-500/40 text-emerald-700 bg-emerald-500/5' :
                        b.validation_status === 'rejected' ? 'border-destructive/40 text-destructive bg-destructive/5' :
                        'border-amber-500/40 text-amber-700 bg-amber-500/5'
                      }`}>
                        {b.validation_status ?? '—'}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
