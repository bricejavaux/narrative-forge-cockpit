import { useEffect, useMemo, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import {
  Loader2, RefreshCw, Sparkles, AlertTriangle, X, Save, ShieldCheck, Layers,
  StopCircle, Plus, Copy, Trash2, ClipboardCheck,
} from 'lucide-react';
import { OPENAI_MODELS, CUSTOM_MODEL_OPTION_ID } from '@/lib/openaiModels';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from '@/components/ui/dialog';

type Chapter = { id: string; number: number; title: string; scale?: string | null; main_arc?: string | null };

type EditableBeat = {
  _key: string; // local stable key
  id?: string | null; // persisted id (if any)
  beat_number: number;
  title: string;
  objective?: string | null;
  narrative_function?: string | null;
  decision_made?: string | null;
  consequence?: string | null;
  revelation?: string | null;
  payoff?: string | null;
  required_detail?: string | null;
  characters?: string[];
  arcs?: string[];
  canon_links?: string[];
  tension_start?: number | null;
  tension_end?: number | null;
  scientific_density?: number | null;
  emotional_density?: number | null;
  risk_flags?: string[];
  status?: string | null;
  validation_status?: string | null;
  _dirty?: boolean;
};

type PersistedBeat = {
  id: string; beat_number: number | null; title: string;
  status: string | null; validation_status: string | null; narrative_function: string | null;
  objective: string | null; consequence: string | null; required_detail: string | null;
  tension_start: number | null; tension_end: number | null;
  decision_made: string | null; payoff: string | null; revelation: string | null;
  characters: any; arcs: any; canon_links: any;
  scientific_density: number | null; emotional_density: number | null;
};

type PreviewResp = {
  mode?: string; model?: string; chapter_title?: string; chapter_id?: string;
  count?: number; beats?: any[]; warnings?: string[]; error?: string;
};

type BatchEntry = { chapter_id: string; chapter_title: string; status: 'pending' | 'running' | 'success' | 'error'; message?: string };

const BATCH_LS_KEY = 'beats_batch_job_v2';
let keyCounter = 0;
const newKey = () => `b_${Date.now()}_${++keyCounter}`;

const REQUIRED_FIELDS: (keyof EditableBeat)[] = ['title', 'objective', 'narrative_function', 'consequence'];

function isComplete(b: EditableBeat) {
  return REQUIRED_FIELDS.every((f) => {
    const v = b[f];
    return typeof v === 'string' && v.trim().length > 0;
  });
}

function fromPersisted(p: PersistedBeat): EditableBeat {
  return {
    _key: newKey(),
    id: p.id,
    beat_number: p.beat_number ?? 0,
    title: p.title ?? '',
    objective: p.objective,
    narrative_function: p.narrative_function,
    decision_made: p.decision_made,
    consequence: p.consequence,
    revelation: p.revelation,
    payoff: p.payoff,
    required_detail: p.required_detail,
    characters: Array.isArray(p.characters) ? p.characters : [],
    arcs: Array.isArray(p.arcs) ? p.arcs : [],
    canon_links: Array.isArray(p.canon_links) ? p.canon_links : [],
    tension_start: p.tension_start,
    tension_end: p.tension_end,
    scientific_density: p.scientific_density,
    emotional_density: p.emotional_density,
    status: p.status,
    validation_status: p.validation_status,
  };
}

function fromPreviewBeat(b: any, idx: number): EditableBeat {
  return {
    _key: newKey(),
    beat_number: Number(b.beat_number ?? idx + 1),
    title: String(b.title ?? `Beat ${idx + 1}`),
    objective: b.objective ?? '',
    narrative_function: b.narrative_function ?? '',
    decision_made: b.decision_made ?? '',
    consequence: b.consequence ?? '',
    revelation: b.revelation ?? '',
    payoff: b.payoff ?? '',
    required_detail: b.required_detail ?? '',
    characters: Array.isArray(b.characters) ? b.characters : [],
    arcs: Array.isArray(b.arcs) ? b.arcs : [],
    canon_links: Array.isArray(b.canon_links) ? b.canon_links : [],
    tension_start: b.tension_start ?? null,
    tension_end: b.tension_end ?? null,
    scientific_density: b.scientific_density ?? null,
    emotional_density: b.emotional_density ?? null,
    risk_flags: Array.isArray(b.risk_flags) ? b.risk_flags : [],
    _dirty: true,
  };
}

export default function ProductionBeatsWorkshop({
  chapters,
  selectedChapter,
  onSelectChapter,
  chapterHasFullText,
}: {
  chapters: Chapter[];
  selectedChapter: Chapter | null;
  onSelectChapter: (c: Chapter | null) => void;
  chapterHasFullText?: boolean;
}) {
  // === STATE ===
  const [persisted, setPersisted] = useState<PersistedBeat[]>([]);
  const [preview, setPreview] = useState<EditableBeat[] | null>(null);
  const [previewChapterId, setPreviewChapterId] = useState<string | null>(null);
  const [previewMeta, setPreviewMeta] = useState<{ model?: string; mode?: string } | null>(null);
  const [selectedBeatKey, setSelectedBeatKey] = useState<string | null>(null);
  const [readError, setReadError] = useState<string | null>(null);

  const [loading, setLoading] = useState(false);
  const [persisting, setPersisting] = useState(false);
  const [validating, setValidating] = useState(false);

  // model
  const [modelId, setModelId] = useState<string>('gpt-4.1-mini');
  const [customModel, setCustomModel] = useState<string>('');
  const effectiveModel = modelId === CUSTOM_MODEL_OPTION_ID ? customModel.trim() : modelId;

  // batch
  const [batch, setBatch] = useState<BatchEntry[] | null>(null);
  const [batchRunning, setBatchRunning] = useState(false);
  const [stopRequested, setStopRequested] = useState(false);

  // modals
  const [chapterChangeModal, setChapterChangeModal] = useState<{ target: Chapter | null } | null>(null);
  const [previewAgainModal, setPreviewAgainModal] = useState(false);
  const [saveModal, setSaveModal] = useState(false);
  const [auditOpen, setAuditOpen] = useState(false);
  const [auditResults, setAuditResults] = useState<Array<{ severity: 'info' | 'warn' | 'error'; beat_key?: string; message: string }>>([]);
  const [auditScienceContext, setAuditScienceContext] = useState<{ used: boolean; active: string[]; pending: string[]; count: number } | null>(null);

  // === LOADERS ===
  const loadPersisted = async (chapter_id: string) => {
    const { data, error } = await supabase
      .from('beats')
      .select('id,beat_number,title,status,validation_status,narrative_function,objective,consequence,required_detail,tension_start,tension_end,decision_made,payoff,revelation,characters,arcs,canon_links,scientific_density,emotional_density')
      .eq('chapter_id', chapter_id)
      .eq('beat_type', 'planned')
      .neq('status', 'deleted')
      .order('beat_number', { ascending: true });
    if (error) setReadError(error.message);
    else { setReadError(null); setPersisted((data as PersistedBeat[]) ?? []); }
  };

  useEffect(() => {
    if (selectedChapter) loadPersisted(selectedChapter.id);
    else setPersisted([]);
  }, [selectedChapter?.id]);

  // Hydrate batch
  useEffect(() => {
    try { const raw = localStorage.getItem(BATCH_LS_KEY); if (raw) setBatch(JSON.parse(raw)); } catch {}
  }, []);
  useEffect(() => {
    try { if (batch) localStorage.setItem(BATCH_LS_KEY, JSON.stringify(batch)); } catch {}
  }, [batch]);

  // === DERIVED ===
  const previewBelongsToSelected = !!preview && previewChapterId === selectedChapter?.id;
  const hasUnsavedPreview = !!preview && preview.some((b) => b._dirty);
  const selectedBeat = preview?.find((b) => b._key === selectedBeatKey) ?? null;
  const completeCount = useMemo(() => persisted.filter((p) => p.validation_status === 'validated').length, [persisted]);

  // === CHAPTER SWITCH ===
  const requestSelectChapter = (c: Chapter) => {
    if (selectedChapter?.id === c.id) return;
    if (preview && hasUnsavedPreview) {
      setChapterChangeModal({ target: c });
      return;
    }
    setPreview(null); setPreviewChapterId(null); setPreviewMeta(null); setSelectedBeatKey(null);
    onSelectChapter(c);
  };

  const confirmChapterChange = async (action: 'abandon' | 'stay' | 'save') => {
    if (!chapterChangeModal) return;
    if (action === 'stay') { setChapterChangeModal(null); return; }
    if (action === 'save') {
      // Save preview to its original chapter, then switch.
      if (preview && previewChapterId) {
        try {
          setPersisting(true);
          const payload = preview.map((b) => ({
            beat_number: b.beat_number, title: b.title, objective: b.objective,
            narrative_function: b.narrative_function, decision_made: b.decision_made,
            consequence: b.consequence, revelation: b.revelation, payoff: b.payoff,
            required_detail: b.required_detail,
            characters: b.characters ?? [], arcs: b.arcs ?? [], canon_links: b.canon_links ?? [],
            tension_start: b.tension_start, tension_end: b.tension_end,
            scientific_density: b.scientific_density, emotional_density: b.emotional_density,
            risk_flags: b.risk_flags ?? [],
          }));
          const { error } = await supabase.functions.invoke('beats-persist', {
            body: { chapter_id: previewChapterId, beats: payload, validation: 'human_confirmed', model: previewMeta?.model ?? null, strategy: 'replace' },
          });
          if (error) { alert(`Enregistrement échoué: ${error.message}. Changement annulé.`); setChapterChangeModal(null); return; }
        } finally { setPersisting(false); }
      }
    }
    setPreview(null); setPreviewChapterId(null); setPreviewMeta(null); setSelectedBeatKey(null);
    onSelectChapter(chapterChangeModal.target);
    setChapterChangeModal(null);
  };

  // === PREVIEW ===
  const callPreview = async (chapter_id: string): Promise<PreviewResp> => {
    const { data, error } = await supabase.functions.invoke('beats-preview', {
      body: { chapter_id, model: effectiveModel || undefined, mode: 'balanced', beat_count_target: 6 },
    });
    if (error) return { error: error.message, chapter_id };
    return { ...(data as PreviewResp), chapter_id };
  };

  const runPreview = async (strategy: 'replace' | 'merge' = 'replace') => {
    if (!selectedChapter) return;
    setLoading(true);
    try {
      const res = await callPreview(selectedChapter.id);
      if (res.error) { alert(`Erreur prévisualisation: ${res.error}`); return; }
      const newBeats = (res.beats ?? []).map((b: any, i: number) => fromPreviewBeat(b, i));
      if (strategy === 'replace' || !preview) {
        setPreview(newBeats);
      } else {
        // merge by beat_number
        const map = new Map<number, EditableBeat>();
        for (const b of preview ?? []) map.set(b.beat_number, b);
        for (const b of newBeats) map.set(b.beat_number, b);
        setPreview(Array.from(map.values()).sort((a, b) => a.beat_number - b.beat_number));
      }
      setPreviewChapterId(selectedChapter.id);
      setPreviewMeta({ model: res.model, mode: res.mode });
      if (newBeats.length > 0) setSelectedBeatKey(newBeats[0]._key);
    } finally { setLoading(false); }
  };

  const onPreviewClick = () => {
    if (preview && previewBelongsToSelected && preview.length > 0) {
      setPreviewAgainModal(true);
    } else {
      runPreview('replace');
    }
  };

  // === BEAT EDIT ===
  const updateBeat = (key: string, patch: Partial<EditableBeat>) => {
    setPreview((prev) => prev?.map((b) => b._key === key ? { ...b, ...patch, _dirty: true } : b) ?? null);
  };

  const addBeat = (after?: string) => {
    if (!preview) setPreview([]);
    setPreview((prev) => {
      const list = [...(prev ?? [])];
      const idx = after ? list.findIndex((b) => b._key === after) : list.length - 1;
      const insertAt = idx >= 0 ? idx + 1 : list.length;
      const nb: EditableBeat = {
        _key: newKey(),
        beat_number: insertAt + 1,
        title: `Beat ${insertAt + 1}`,
        objective: '', narrative_function: '', consequence: '', required_detail: '',
        _dirty: true,
      };
      list.splice(insertAt, 0, nb);
      // renumber
      list.forEach((b, i) => { b.beat_number = i + 1; });
      setSelectedBeatKey(nb._key);
      return list;
    });
    if (!previewChapterId && selectedChapter) setPreviewChapterId(selectedChapter.id);
  };

  const duplicateBeat = (key: string) => {
    setPreview((prev) => {
      if (!prev) return prev;
      const idx = prev.findIndex((b) => b._key === key);
      if (idx < 0) return prev;
      const src = prev[idx];
      const copy: EditableBeat = { ...src, _key: newKey(), id: undefined, title: `${src.title} (copie)`, _dirty: true };
      const list = [...prev.slice(0, idx + 1), copy, ...prev.slice(idx + 1)];
      list.forEach((b, i) => { b.beat_number = i + 1; });
      setSelectedBeatKey(copy._key);
      return list;
    });
  };

  const deletePreviewBeat = (key: string) => {
    if (!confirm('Supprimer ce beat de la prévisualisation ?')) return;
    setPreview((prev) => {
      if (!prev) return prev;
      const list = prev.filter((b) => b._key !== key);
      list.forEach((b, i) => { b.beat_number = i + 1; });
      if (selectedBeatKey === key) setSelectedBeatKey(list[0]?._key ?? null);
      return list;
    });
  };

  const moveBeat = (key: string, dir: -1 | 1) => {
    setPreview((prev) => {
      if (!prev) return prev;
      const idx = prev.findIndex((b) => b._key === key);
      const tgt = idx + dir;
      if (idx < 0 || tgt < 0 || tgt >= prev.length) return prev;
      const list = [...prev];
      [list[idx], list[tgt]] = [list[tgt], list[idx]];
      list.forEach((b, i) => { b.beat_number = i + 1; b._dirty = true; });
      return list;
    });
  };

  const deletePersistedBeat = async (id: string) => {
    if (!confirm('Soft-delete ce beat persisté (status=deleted, validation=rejected) ?')) return;
    const { error } = await supabase.functions.invoke('governance-update', {
      body: { target_table: 'beats', record_ids: [id], action: 'mark_deleted' },
    });
    if (error) { alert(`Erreur: ${error.message}`); return; }
    if (selectedChapter) await loadPersisted(selectedChapter.id);
  };

  // === SAVE ===
  const onSaveClick = () => {
    if (!preview || !preview.length || !selectedChapter) return;
    if (previewChapterId !== selectedChapter.id) {
      alert("La prévisualisation appartient à un autre chapitre."); return;
    }
    if (persisted.length > 0) setSaveModal(true);
    else doSave('replace');
  };

  const doSave = async (strategy: 'replace' | 'merge' | 'append') => {
    if (!preview || !selectedChapter) return;
    setSaveModal(false);
    setPersisting(true);
    try {
      const payload = preview.map((b) => ({
        beat_number: b.beat_number,
        title: b.title,
        objective: b.objective,
        narrative_function: b.narrative_function,
        decision_made: b.decision_made,
        consequence: b.consequence,
        revelation: b.revelation,
        payoff: b.payoff,
        required_detail: b.required_detail,
        characters: b.characters ?? [],
        arcs: b.arcs ?? [],
        canon_links: b.canon_links ?? [],
        tension_start: b.tension_start,
        tension_end: b.tension_end,
        scientific_density: b.scientific_density,
        emotional_density: b.emotional_density,
        risk_flags: b.risk_flags ?? [],
      }));
      const { data, error } = await supabase.functions.invoke('beats-persist', {
        body: {
          chapter_id: selectedChapter.id,
          beats: payload,
          validation: 'human_confirmed',
          model: previewMeta?.model ?? null,
          strategy,
        },
      });
      if (error) { alert(`Erreur enregistrement: ${error.message}`); return; }
      const d = data as any;
      alert(
        `Enregistré (${strategy}). +${d?.inserted ?? 0} insérés · ~${d?.updated ?? 0} mis à jour · -${d?.soft_deleted ?? 0} soft-deleted. Total visible: ${d?.service_role_visible_count ?? '?'}.`
      );
      await loadPersisted(selectedChapter.id);
      // mark preview as saved
      setPreview((prev) => prev?.map((b) => ({ ...b, _dirty: false })) ?? null);
    } finally { setPersisting(false); }
  };

  // === VALIDATE ===
  const validateAll = async () => {
    if (!selectedChapter || persisted.length === 0) return;
    const complete = persisted.filter((p) => {
      const eb = fromPersisted(p); return isComplete(eb);
    });
    if (complete.length === 0) { alert('Aucun beat persisté complet (champs requis manquants).'); return; }
    if (!confirm(`Valider ${complete.length} beats persistés complets sur ${persisted.length} ?`)) return;
    setValidating(true);
    try {
      const { error } = await supabase.functions.invoke('governance-update', {
        body: { target_table: 'beats', record_ids: complete.map((b) => b.id), action: 'mark_validated' },
      });
      if (error) { alert(`Erreur validation: ${error.message}`); return; }
      await loadPersisted(selectedChapter.id);
    } finally { setValidating(false); }
  };

  // === AUDIT PLANNED BEATS ===
  const runPlannedAudit = () => {
    if (!selectedChapter || persisted.length === 0) {
      alert('Audit possible uniquement sur des beats persistés. Enregistrez la prévisualisation avant.');
      return;
    }
    const findings: typeof auditResults = [];
    const seenNumbers = new Set<number>();
    const seenTitles = new Set<string>();
    let prevTension: number | null = null;

    persisted.forEach((p) => {
      if (!p.objective) findings.push({ severity: 'error', message: `Beat #${p.beat_number} «${p.title}» — objective manquant.` });
      if (!p.narrative_function) findings.push({ severity: 'error', message: `Beat #${p.beat_number} «${p.title}» — narrative_function manquante.` });
      if (!p.consequence && !p.payoff) findings.push({ severity: 'warn', message: `Beat #${p.beat_number} «${p.title}» — ni consequence ni payoff.` });
      if (p.beat_number != null) {
        if (seenNumbers.has(p.beat_number)) findings.push({ severity: 'error', message: `Beat #${p.beat_number} dupliqué.` });
        seenNumbers.add(p.beat_number);
      }
      const tkey = (p.title ?? '').trim().toLowerCase();
      if (tkey && seenTitles.has(tkey)) findings.push({ severity: 'warn', message: `Titre dupliqué : «${p.title}».` });
      seenTitles.add(tkey);
      if (typeof p.tension_start === 'number') {
        if (prevTension !== null && Math.abs(p.tension_start - prevTension) > 4) {
          findings.push({ severity: 'warn', message: `Saut brutal de tension entre beat précédent (${prevTension}) et #${p.beat_number} (${p.tension_start}).` });
        }
        prevTension = typeof p.tension_end === 'number' ? p.tension_end : p.tension_start;
      }
      const linksEmpty = (Array.isArray(p.characters) ? p.characters.length === 0 : true)
        && (Array.isArray(p.canon_links) ? p.canon_links.length === 0 : true);
      if (linksEmpty) findings.push({ severity: 'info', message: `Beat #${p.beat_number} «${p.title}» — aucun lien personnage/canon.` });
    });

    if (persisted.length >= 7 && !persisted.some((p) => /climax|résolution|resolution|payoff/i.test(`${p.title} ${p.narrative_function ?? ''}`))) {
      findings.push({ severity: 'warn', message: `≥7 beats sans climax/résolution évidente — vérifier la courbe.` });
    }

    if (findings.length === 0) findings.push({ severity: 'info', message: 'Aucun défaut détecté sur les beats prévus.' });
    setAuditResults(findings);
    setAuditOpen(true);
  };

  // === BATCH ===
  const runBatchAll = async () => {
    if (chapters.length === 0) return;
    if (!confirm(`Prévisualiser les beats pour ${chapters.length} chapitres ? (aucune sauvegarde automatique)`)) return;
    const initial: BatchEntry[] = chapters.map((c) => ({ chapter_id: c.id, chapter_title: c.title, status: 'pending' }));
    setBatch(initial); setBatchRunning(true); setStopRequested(false);
    for (let i = 0; i < initial.length; i++) {
      if (stopRequested) break;
      setBatch((prev) => prev?.map((e, idx) => idx === i ? { ...e, status: 'running' } : e) ?? null);
      const res = await callPreview(initial[i].chapter_id);
      setBatch((prev) => prev?.map((e, idx) => idx === i
        ? { ...e, status: res.error ? 'error' : 'success', message: res.error ?? `${res.count ?? 0} beats` }
        : e) ?? null);
    }
    setBatchRunning(false);
  };

  // === RENDER ===
  const batchProgress = batch ? `${batch.filter((e) => e.status === 'success' || e.status === 'error').length}/${batch.length}` : '';

  return (
    <div className="space-y-4">
      {/* Workflow help — permanent */}
      <div className="cockpit-card p-4 rounded border border-primary/20 bg-primary/5 text-[12px] text-foreground/85 leading-snug">
        <p className="editorial-eyebrow mb-1">Atelier Beats — ordre obligatoire</p>
        <ol className="space-y-0.5 list-decimal list-inside">
          <li><strong>Prévisualiser</strong> = OpenAI propose des beats temporaires (non persistés).</li>
          <li><strong>Modifier</strong> les beats dans l'éditeur de détail (zone C).</li>
          <li><strong>Enregistrer en base</strong> = les beats deviennent objets Supabase.</li>
          <li><strong>Valider pour génération</strong> = approuver comme entrée officielle de génération.</li>
          <li><strong>Auditer les beats prévus</strong> = contrôle de cohérence avant génération du chapitre.</li>
        </ol>
        <p className="mt-1 text-muted-foreground">
          La prévisualisation ne modifie pas la base. Validation et audit ne s'appliquent qu'aux beats persistés.
        </p>
      </div>

      {/* ============ ZONE A — TOME BATCH ============ */}
      <div className="cockpit-card p-4 space-y-3 border-l-4 border-violet-500/40">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div>
            <p className="editorial-eyebrow">Zone A — Actions globales tome</p>
            <h3 className="font-display text-sm text-foreground">Prévisualisation batch tous chapitres</h3>
          </div>
          <div className="flex gap-2">
            <button onClick={runBatchAll} disabled={batchRunning || chapters.length === 0}
              className="text-xs px-3 py-1.5 rounded border border-violet-500/40 text-violet-700 hover:bg-violet-500/5 disabled:opacity-50 inline-flex items-center gap-1.5">
              {batchRunning ? <Loader2 size={12} className="animate-spin" /> : <Layers size={12} />}
              Prévisualiser tous les chapitres ({chapters.length})
            </button>
            {batchRunning && (
              <button onClick={() => setStopRequested(true)} className="text-xs px-3 py-1.5 rounded border border-rose-500/40 text-rose-700 inline-flex items-center gap-1.5">
                <StopCircle size={12} /> Stop
              </button>
            )}
            {batch && !batchRunning && (
              <button onClick={() => { setBatch(null); try { localStorage.removeItem(BATCH_LS_KEY); } catch {} }}
                className="text-xs px-3 py-1.5 rounded border border-border text-muted-foreground hover:text-foreground inline-flex items-center gap-1.5">
                <X size={12} /> Effacer
              </button>
            )}
          </div>
        </div>
        <p className="text-[11px] text-muted-foreground">
          Batch preview local — durable job Supabase à venir. Le batch ne sauvegarde jamais automatiquement et est stocké dans le navigateur (localStorage). Ouvrez chaque chapitre dans la zone B pour vérifier, enregistrer puis valider.
        </p>
        {batch && (
          <div className="rounded border border-border p-2">
            <p className="text-[11px] font-mono text-muted-foreground mb-1">Batch · {batchProgress}{stopRequested ? ' · arrêt demandé' : ''}</p>
            <div className="max-h-40 overflow-y-auto space-y-0.5">
              {batch.map((e) => {
                const c = chapters.find((x) => x.id === e.chapter_id);
                return (
                  <div key={e.chapter_id} className="text-[11px] flex items-center gap-2">
                    <span className={`w-2 h-2 rounded-full ${
                      e.status === 'success' ? 'bg-emerald-500' :
                      e.status === 'error' ? 'bg-rose-500' :
                      e.status === 'running' ? 'bg-sky-500 animate-pulse' : 'bg-slate-400/40'}`} />
                    <button onClick={() => c && requestSelectChapter(c)}
                      className="truncate flex-1 text-left hover:text-primary">{e.chapter_title}</button>
                    <span className="font-mono text-[10px] text-muted-foreground">{e.message ?? e.status}</span>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* model picker (shared) */}
      <div className="cockpit-card p-3 flex items-end gap-3 flex-wrap">
        <div>
          <p className="editorial-eyebrow mb-1">Modèle OpenAI</p>
          <select value={modelId} onChange={(e) => setModelId(e.target.value)}
            className="text-xs px-2 py-1 rounded border border-border bg-background min-w-[14rem]">
            {OPENAI_MODELS.map((m) => (
              <option key={m.id} value={m.id}>{m.label} · {m.tier}</option>
            ))}
            <option value={CUSTOM_MODEL_OPTION_ID}>Modèle personnalisé…</option>
          </select>
        </div>
        {modelId === CUSTOM_MODEL_OPTION_ID && (
          <input value={customModel} onChange={(e) => setCustomModel(e.target.value)} placeholder="ex: gpt-5.5"
            className="text-xs px-2 py-1 rounded border border-border bg-background w-44" />
        )}
        <button onClick={() => { if (selectedChapter) loadPersisted(selectedChapter.id); }}
          className="ml-auto text-xs px-3 py-1.5 rounded border border-border hover:bg-secondary inline-flex items-center gap-1.5">
          <RefreshCw size={12} /> Rafraîchir beats persistés
        </button>
      </div>

      {readError && (
        <div className="text-xs p-3 rounded border border-destructive/40 bg-destructive/5 text-destructive inline-flex items-start gap-2">
          <AlertTriangle size={12} className="mt-0.5" /> {readError}
        </div>
      )}

      <div className="grid grid-cols-12 gap-4">
        {/* Chapter list */}
        <div className="col-span-3 cockpit-card p-3 space-y-1 max-h-[600px] overflow-y-auto">
          <p className="editorial-eyebrow mb-2">Chapitres ({chapters.length})</p>
          {chapters.length === 0 && <p className="text-xs text-muted-foreground">Aucun chapitre.</p>}
          {chapters.map((c) => (
            <button key={c.id} onClick={() => requestSelectChapter(c)}
              className={`w-full text-left px-2 py-1.5 rounded text-xs transition-colors ${
                selectedChapter?.id === c.id ? 'bg-primary/10 text-primary' : 'text-muted-foreground hover:bg-secondary/40 hover:text-foreground'
              }`}>
              <span className="font-mono">#{c.number}</span> {c.title}
            </button>
          ))}
        </div>

        {/* ============ ZONE B — SELECTED CHAPTER ============ */}
        <div className="col-span-5 cockpit-card p-4 space-y-3 border-l-4 border-sky-500/40">
          <div>
            <p className="editorial-eyebrow">Zone B — Chapitre sélectionné</p>
            {selectedChapter ? (
              <h3 className="font-display text-sm text-foreground">
                #{selectedChapter.number} — {selectedChapter.title}
              </h3>
            ) : (
              <p className="text-xs text-muted-foreground">Sélectionnez un chapitre.</p>
            )}
          </div>

          {selectedChapter && (
            <>
              {/* Preview status */}
              {preview && (
                <div className={`text-[11px] px-2 py-1 rounded border ${
                  previewBelongsToSelected
                    ? 'border-amber-500/40 bg-amber-500/5 text-amber-700'
                    : 'border-rose-500/40 bg-rose-500/5 text-rose-700'
                }`}>
                  {previewBelongsToSelected
                    ? `Prévisualisation pour ce chapitre · ${preview.length} beats · ${hasUnsavedPreview ? 'non enregistrée' : 'enregistrée'}`
                    : '⚠ Prévisualisation appartient à un autre chapitre — non utilisable ici'}
                </div>
              )}

              {/* Actions */}
              <div className="flex flex-wrap gap-2">
                <button onClick={onPreviewClick} disabled={loading}
                  className="text-xs px-3 py-1.5 rounded border border-border hover:bg-secondary disabled:opacity-50 inline-flex items-center gap-1.5">
                  {loading ? <Loader2 size={12} className="animate-spin" /> : <Sparkles size={12} />}
                  1. Prévisualiser
                </button>
                <button onClick={onSaveClick}
                  disabled={!preview?.length || persisting || !previewBelongsToSelected}
                  className="text-xs px-3 py-1.5 rounded bg-primary text-primary-foreground hover:opacity-90 disabled:opacity-50 inline-flex items-center gap-1.5">
                  {persisting ? <Loader2 size={12} className="animate-spin" /> : <Save size={12} />}
                  2. Enregistrer en base
                </button>
                <button onClick={validateAll} disabled={validating || persisted.length === 0}
                  title={persisted.length === 0 ? 'Aucun beat persisté' : 'Valider les beats complets'}
                  className="text-xs px-3 py-1.5 rounded border border-emerald-500/40 text-emerald-700 hover:bg-emerald-500/5 disabled:opacity-50 inline-flex items-center gap-1.5">
                  {validating ? <Loader2 size={12} className="animate-spin" /> : <ShieldCheck size={12} />}
                  3. Valider pour génération
                </button>
                <button onClick={runPlannedAudit} disabled={persisted.length === 0}
                  className="text-xs px-3 py-1.5 rounded border border-violet-500/40 text-violet-700 hover:bg-violet-500/5 disabled:opacity-50 inline-flex items-center gap-1.5">
                  <ClipboardCheck size={12} /> 4a. Audit local (règles)
                </button>
                <button
                  onClick={async () => {
                    if (!selectedChapter || persisted.length === 0) { alert('Aucun beat persisté à auditer.'); return; }
                    // Resolve agent_audit_planned_beats by external_id (no direct openai-agent-run call).
                    const { data: agentRow } = await supabase.from('agents')
                      .select('id').or('external_id.eq.agent_audit_planned_beats,external_id.eq.audit_planned_beats')
                      .limit(1).maybeSingle();
                    const { data, error } = await supabase.functions.invoke('run-execute', {
                      body: {
                        run_type: 'audit_planned_beats',
                        agent_id: agentRow?.id ?? null,
                        target_type: 'chapter', target_id: selectedChapter.id, mode: 'live',
                        instruction: `Audit des beats prévus du chapitre ${selectedChapter.number ?? ''} — ${selectedChapter.title ?? ''}.`,
                        payload: { beats: persisted.map((p) => ({ beat_number: p.beat_number, title: p.title, objective: p.objective, narrative_function: p.narrative_function })) },
                      },
                    });
                    if (error) { alert(`Audit agent: ${error.message}`); return; }
                    const f = (data as any)?.findings ?? [];
                    const used = !!(data as any)?.vector_context_used;
                    const active = Array.isArray((data as any)?.indexes_active) ? (data as any).indexes_active : [];
                    const pending = Array.isArray((data as any)?.indexes_pending) ? (data as any).indexes_pending : [];
                    const chunkCount = Array.isArray((data as any)?.retrieved_chunks) ? (data as any).retrieved_chunks.length : 0;
                    setAuditScienceContext({ used, active, pending, count: chunkCount });
                    setAuditResults(f.length === 0
                      ? [{ severity: 'info', message: `Agent: aucun défaut signalé. Trace run ${String((data as any)?.run_id ?? '').slice(0, 8)}.` }]
                      : f.map((x: any) => ({ severity: (x?.severity ?? 'info') as 'info'|'warn'|'error', message: `[${x?.severity ?? 'info'}] ${x?.title ?? ''} — ${x?.note ?? x?.detail ?? ''}` })));
                    setAuditOpen(true);
                  }}
                  disabled={persisted.length === 0}
                  className="text-xs px-3 py-1.5 rounded border border-primary/40 text-primary hover:bg-primary/5 disabled:opacity-50 inline-flex items-center gap-1.5"
                  title="Lance l'agent d'audit via run-execute (run persisté visible dans Runs)."
                >
                  <ClipboardCheck size={12} /> 4b. Audit agent → Runs
                </button>
              </div>

              <p className="text-[10px] text-muted-foreground font-mono">
                {persisted.length} persistés · {completeCount} validés
              </p>

              {/* Preview list */}
              {preview && previewBelongsToSelected && (
                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <p className="editorial-eyebrow">Prévisualisation ({preview.length})</p>
                    <button onClick={() => addBeat()} className="text-[11px] text-primary hover:underline inline-flex items-center gap-1">
                      <Plus size={10} /> Ajouter beat
                    </button>
                  </div>
                  <ul className="space-y-1 max-h-[260px] overflow-y-auto">
                    {preview.map((b) => {
                      const ok = isComplete(b);
                      return (
                        <li key={b._key}>
                          <button onClick={() => setSelectedBeatKey(b._key)}
                            className={`w-full text-left text-xs p-2 rounded border flex items-center gap-2 ${
                              selectedBeatKey === b._key ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/40'
                            }`}>
                            <span className="font-mono text-[10px] text-muted-foreground w-6">#{b.beat_number}</span>
                            <span className="flex-1 truncate">{b.title || '(sans titre)'}</span>
                            <span className={`text-[9px] font-mono px-1 rounded ${ok ? 'bg-emerald-500/10 text-emerald-700' : 'bg-amber-500/10 text-amber-700'}`}>
                              {ok ? 'OK' : 'incomplet'}
                            </span>
                          </button>
                        </li>
                      );
                    })}
                  </ul>
                </div>
              )}

              {/* Persisted list */}
              <div className="pt-2 border-t border-border">
                <p className="editorial-eyebrow mb-1">Beats persistés ({persisted.length})</p>
                {persisted.length === 0 && <p className="text-[11px] text-muted-foreground">Aucun beat en base.</p>}
                <ul className="space-y-0.5 max-h-[180px] overflow-y-auto">
                  {persisted.map((p) => (
                    <li key={p.id} className="text-[11px] flex items-center gap-2 px-2 py-1 rounded hover:bg-secondary/40">
                      <span className="font-mono text-[10px] text-muted-foreground w-6">#{p.beat_number}</span>
                      <span className="flex-1 truncate text-foreground">{p.title}</span>
                      <span className={`text-[9px] font-mono px-1 rounded border ${
                        p.validation_status === 'validated' ? 'border-emerald-500/40 text-emerald-700' :
                        p.validation_status === 'rejected' ? 'border-destructive/40 text-destructive' :
                        'border-amber-500/40 text-amber-700'
                      }`}>
                        {p.validation_status ?? '—'}
                      </span>
                      <button onClick={() => deletePersistedBeat(p.id)} title="Soft delete"
                        className="text-destructive opacity-60 hover:opacity-100">
                        <Trash2 size={11} />
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            </>
          )}
        </div>

        {/* ============ ZONE C — BEAT DETAIL EDITOR ============ */}
        <div className="col-span-4 cockpit-card p-4 space-y-2 border-l-4 border-emerald-500/40">
          <div>
            <p className="editorial-eyebrow">Zone C — Détail beat</p>
            {!selectedBeat ? (
              <p className="text-xs text-muted-foreground mt-1">Sélectionnez un beat dans la prévisualisation.</p>
            ) : (
              <h3 className="font-display text-sm text-foreground">Beat #{selectedBeat.beat_number}</h3>
            )}
          </div>
          {selectedBeat && (
            <div className="space-y-2 max-h-[600px] overflow-y-auto pr-1">
              <BeatField label="Titre *" value={selectedBeat.title} onChange={(v) => updateBeat(selectedBeat._key, { title: v })} />
              <BeatField label="Objectif *" multiline value={selectedBeat.objective ?? ''} onChange={(v) => updateBeat(selectedBeat._key, { objective: v })} />
              <BeatField label="Fonction narrative *" value={selectedBeat.narrative_function ?? ''} onChange={(v) => updateBeat(selectedBeat._key, { narrative_function: v })} />
              <BeatField label="Décision prise" multiline value={selectedBeat.decision_made ?? ''} onChange={(v) => updateBeat(selectedBeat._key, { decision_made: v })} />
              <BeatField label="Conséquence *" multiline value={selectedBeat.consequence ?? ''} onChange={(v) => updateBeat(selectedBeat._key, { consequence: v })} />
              <BeatField label="Révélation" multiline value={selectedBeat.revelation ?? ''} onChange={(v) => updateBeat(selectedBeat._key, { revelation: v })} />
              <BeatField label="Payoff" multiline value={selectedBeat.payoff ?? ''} onChange={(v) => updateBeat(selectedBeat._key, { payoff: v })} />
              <BeatField label="Détail requis" multiline value={selectedBeat.required_detail ?? ''} onChange={(v) => updateBeat(selectedBeat._key, { required_detail: v })} />
              <div className="grid grid-cols-2 gap-2">
                <BeatNumField label="Tension start" value={selectedBeat.tension_start} onChange={(v) => updateBeat(selectedBeat._key, { tension_start: v })} />
                <BeatNumField label="Tension end" value={selectedBeat.tension_end} onChange={(v) => updateBeat(selectedBeat._key, { tension_end: v })} />
                <BeatNumField label="Densité scientifique" value={selectedBeat.scientific_density} onChange={(v) => updateBeat(selectedBeat._key, { scientific_density: v })} />
                <BeatNumField label="Densité émotionnelle" value={selectedBeat.emotional_density} onChange={(v) => updateBeat(selectedBeat._key, { emotional_density: v })} />
              </div>
              <BeatField label="Personnages (séparés par virgule)" value={(selectedBeat.characters ?? []).join(', ')}
                onChange={(v) => updateBeat(selectedBeat._key, { characters: v.split(',').map((s) => s.trim()).filter(Boolean) })} />
              <BeatField label="Liens canon (séparés par virgule)" value={(selectedBeat.canon_links ?? []).join(', ')}
                onChange={(v) => updateBeat(selectedBeat._key, { canon_links: v.split(',').map((s) => s.trim()).filter(Boolean) })} />

              <div className="flex flex-wrap gap-1 pt-2 border-t border-border">
                <IconBtn onClick={() => addBeat(selectedBeat._key)} title="Ajouter après"><Plus size={11} /></IconBtn>
                <IconBtn onClick={() => duplicateBeat(selectedBeat._key)} title="Dupliquer"><Copy size={11} /></IconBtn>
                <IconBtn onClick={() => deletePreviewBeat(selectedBeat._key)} title="Supprimer" destructive><Trash2 size={11} /></IconBtn>
              </div>
              <p className="text-[10px] text-muted-foreground">L'ordre des beats suit le champ « n° de beat » dans la liste. Pas de réordonnancement par flèches : modifier le numéro pour replacer un beat.</p>

              {!isComplete(selectedBeat) && (
                <p className="text-[10px] text-amber-700 mt-1">Champs requis : titre, objectif, fonction narrative, conséquence.</p>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Future panels notice */}
      {!chapterHasFullText && (
        <details className="cockpit-card p-3 text-xs text-muted-foreground">
          <summary className="cursor-pointer editorial-eyebrow">Étapes futures (après génération du chapitre)</summary>
          <p className="mt-2">
            L'audit beats prévus vs beats observés, la comparaison de couverture et les tâches de réécriture ciblée n'apparaîtront qu'une fois le texte complet du chapitre généré et les beats observés extraits. Ces panels sont volontairement masqués pour ne pas afficher de comparaison vide.
          </p>
        </details>
      )}

      {/* ========== MODALS ========== */}
      <Dialog open={!!chapterChangeModal} onOpenChange={(o) => !o && setChapterChangeModal(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Prévisualisation non enregistrée</DialogTitle>
            <DialogDescription>
              Une prévisualisation non enregistrée existe pour le chapitre précédent. Action par défaut : rester sur le chapitre.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="flex-wrap">
            <button onClick={() => confirmChapterChange('stay')} className="text-xs px-3 py-1.5 rounded bg-primary text-primary-foreground">
              Rester sur le chapitre (sûr)
            </button>
            <button onClick={() => confirmChapterChange('save')} disabled={persisting} className="text-xs px-3 py-1.5 rounded border border-emerald-500/40 text-emerald-700 hover:bg-emerald-500/5 disabled:opacity-50">
              {persisting ? 'Enregistrement…' : 'Enregistrer la prévisualisation puis changer'}
            </button>
            <button onClick={() => confirmChapterChange('abandon')} className="text-xs px-3 py-1.5 rounded border border-destructive/40 text-destructive hover:bg-destructive/5">
              Abandonner la prévisualisation et changer
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={previewAgainModal} onOpenChange={setPreviewAgainModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Prévisualisation existante</DialogTitle>
            <DialogDescription>
              Une prévisualisation existe déjà pour ce chapitre. Comment fusionner la nouvelle ?
              {persisted.length > 0 && (
                <span className="block mt-2 text-amber-700">
                  Note : des beats existent déjà en base. La prévisualisation ne modifie pas la base tant que vous ne cliquez pas sur Enregistrer.
                </span>
              )}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <button onClick={() => setPreviewAgainModal(false)} className="text-xs px-3 py-1.5 rounded border border-border">Annuler</button>
            <button onClick={() => { setPreviewAgainModal(false); runPreview('merge'); }}
              className="text-xs px-3 py-1.5 rounded border border-border">Fusionner</button>
            <button onClick={() => { setPreviewAgainModal(false); runPreview('replace'); }}
              className="text-xs px-3 py-1.5 rounded bg-primary text-primary-foreground">Remplacer (recommandé)</button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={saveModal} onOpenChange={setSaveModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Beats déjà enregistrés</DialogTitle>
            <DialogDescription>
              {persisted.length} beats persistés existent déjà pour ce chapitre. Stratégie d'enregistrement ?
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="flex-wrap">
            <button onClick={() => setSaveModal(false)} className="text-xs px-3 py-1.5 rounded border border-border">Annuler</button>
            <button onClick={() => doSave('append')} className="text-xs px-3 py-1.5 rounded border border-border">Ajouter à la suite</button>
            <button onClick={() => doSave('merge')} className="text-xs px-3 py-1.5 rounded border border-border">Fusionner par n°</button>
            <button onClick={() => doSave('replace')} className="text-xs px-3 py-1.5 rounded bg-primary text-primary-foreground">Remplacer (recommandé)</button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={auditOpen} onOpenChange={setAuditOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Audit des beats prévus</DialogTitle>
            <DialogDescription>
              Contrôle local sur les {persisted.length} beats persistés (champs requis, doublons, courbe de tension, liens).
            </DialogDescription>
            {auditScienceContext && (
              <div className="mt-2 flex flex-wrap gap-1.5 text-[10px] font-mono">
                {auditScienceContext.used && auditScienceContext.active.includes('science_index') ? (
                  <span className="px-1.5 py-0.5 rounded border bg-emerald-500/10 text-emerald-700 border-emerald-500/30">
                    Contexte scientifique : science_portals actif ({auditScienceContext.count} chunk{auditScienceContext.count > 1 ? 's' : ''})
                  </span>
                ) : (
                  <span className="px-1.5 py-0.5 rounded border bg-amber-500/10 text-amber-700 border-amber-500/30">
                    Contexte scientifique non utilisé{auditScienceContext.pending.includes('science_index') ? ' — science_portals pending_pgvector' : ''}
                  </span>
                )}
              </div>
            )}
          </DialogHeader>
          <ul className="space-y-1 max-h-[400px] overflow-y-auto">
            {auditResults.map((r, i) => (
              <li key={i} className={`text-xs px-2 py-1 rounded border ${
                r.severity === 'error' ? 'border-destructive/40 bg-destructive/5 text-destructive' :
                r.severity === 'warn' ? 'border-amber-500/40 bg-amber-500/5 text-amber-700' :
                'border-border bg-muted/30 text-muted-foreground'
              }`}>
                <span className="font-mono uppercase text-[9px] mr-2">{r.severity}</span>{r.message}
              </li>
            ))}
          </ul>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function BeatField({ label, value, onChange, multiline }: { label: string; value: string; onChange: (v: string) => void; multiline?: boolean }) {
  return (
    <label className="block">
      <span className="editorial-eyebrow block mb-0.5">{label}</span>
      {multiline ? (
        <textarea value={value} onChange={(e) => onChange(e.target.value)} rows={2}
          className="w-full text-xs px-2 py-1 rounded border border-border bg-background text-foreground" />
      ) : (
        <input value={value} onChange={(e) => onChange(e.target.value)}
          className="w-full text-xs px-2 py-1 rounded border border-border bg-background text-foreground" />
      )}
    </label>
  );
}

function BeatNumField({ label, value, onChange }: { label: string; value: number | null | undefined; onChange: (v: number | null) => void }) {
  return (
    <label className="block">
      <span className="editorial-eyebrow block mb-0.5">{label}</span>
      <input type="number" value={value ?? ''} onChange={(e) => onChange(e.target.value === '' ? null : Number(e.target.value))}
        className="w-full text-xs px-2 py-1 rounded border border-border bg-background text-foreground" />
    </label>
  );
}

function IconBtn({ children, onClick, title, destructive, disabled }: { children: React.ReactNode; onClick: () => void; title: string; destructive?: boolean; disabled?: boolean }) {
  return (
    <button onClick={onClick} title={title} disabled={disabled}
      className={`p-1.5 rounded border disabled:opacity-40 disabled:cursor-not-allowed ${destructive ? 'border-destructive/40 text-destructive hover:bg-destructive/5' : 'border-border text-muted-foreground hover:text-foreground hover:bg-secondary/40'}`}>
      {children}
    </button>
  );
}
