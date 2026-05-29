import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Loader2, RefreshCw, Sparkles, AlertTriangle, Check, X, Save, ShieldCheck } from 'lucide-react';

type Chapter = {
  id: string;
  number: number;
  title: string;
  scale: string | null;
  main_arc: string | null;
};

type PreviewBeat = {
  beat_number: number;
  title: string;
  objective?: string;
  narrative_function?: string;
  characters?: string[];
  arcs?: string[];
  canon_links?: string[];
  tension_start?: number;
  tension_end?: number;
  scientific_density?: number;
  emotional_density?: number;
  decision_made?: string;
  consequence?: string;
  revelation?: string;
  payoff?: string;
  required_detail?: string;
  risk_flags?: string[];
};

type PersistedBeat = {
  id: string;
  beat_number: number | null;
  title: string;
  status: string | null;
  validation_status: string | null;
  narrative_function: string | null;
};

type PreviewResp = {
  mode?: string;
  model?: string;
  chapter_title?: string;
  count?: number;
  beats?: PreviewBeat[];
  warnings?: string[];
  error?: string;
};

export default function BeatsPlanPanel() {
  const [chapters, setChapters] = useState<Chapter[]>([]);
  const [selected, setSelected] = useState<string | null>(null);
  const [persisted, setPersisted] = useState<PersistedBeat[]>([]);
  const [preview, setPreview] = useState<PreviewResp | null>(null);
  const [loading, setLoading] = useState(false);
  const [persisting, setPersisting] = useState(false);
  const [validating, setValidating] = useState(false);
  const [readError, setReadError] = useState<string | null>(null);
  const [model, setModel] = useState<string>('');

  const loadChapters = async () => {
    const { data, error } = await supabase
      .from('chapters')
      .select('id,number,title,scale,main_arc')
      .order('number', { ascending: true })
      .limit(200);
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
      .from('beats')
      .select('id,beat_number,title,status,validation_status,narrative_function')
      .eq('chapter_id', chapter_id)
      .eq('beat_type', 'planned')
      .order('beat_number', { ascending: true });
    if (error) setReadError(error.message);
    else setPersisted((data as PersistedBeat[]) ?? []);
  };

  useEffect(() => { loadChapters(); }, []);
  useEffect(() => { if (selected) loadPersisted(selected); }, [selected]);

  const runPreview = async () => {
    if (!selected) return;
    setLoading(true);
    setPreview(null);
    try {
      const { data, error } = await supabase.functions.invoke('beats-preview', {
        body: { chapter_id: selected, model: model || undefined, beat_count_target: 6 },
      });
      if (error) setPreview({ error: error.message });
      else setPreview(data as PreviewResp);
    } finally {
      setLoading(false);
    }
  };

  const runPersist = async () => {
    if (!selected || !preview?.beats?.length) return;
    if (!confirm(`Persister ${preview.beats.length} beats validés pour ce chapitre ? (upsert par beat_number)`)) return;
    setPersisting(true);
    try {
      const { data, error } = await supabase.functions.invoke('beats-persist', {
        body: {
          chapter_id: selected,
          beats: preview.beats,
          validation: 'human_confirmed',
          model: preview.model ?? null,
        },
      });
      if (error) alert(`Erreur persist: ${error.message}`);
      else if ((data as any)?.error) alert(`Erreur persist: ${(data as any).error}`);
      await loadPersisted(selected);
    } finally {
      setPersisting(false);
    }
  };

  const validateAll = async () => {
    if (!selected || persisted.length === 0) return;
    if (!confirm(`Valider ${persisted.length} beats prévus de ce chapitre ?`)) return;
    setValidating(true);
    try {
      const { error } = await supabase.functions.invoke('governance-update', {
        body: {
          target_table: 'beats',
          record_ids: persisted.map((b) => b.id),
          action: 'mark_validated',
        },
      });
      if (error) alert(`Erreur validation: ${error.message}`);
      await loadPersisted(selected);
    } finally {
      setValidating(false);
    }
  };

  const editBeat = (i: number, field: keyof PreviewBeat, value: any) => {
    if (!preview?.beats) return;
    const next = [...preview.beats];
    next[i] = { ...next[i], [field]: value };
    setPreview({ ...preview, beats: next });
  };

  const removeBeat = (i: number) => {
    if (!preview?.beats) return;
    const next = preview.beats.filter((_, idx) => idx !== i);
    setPreview({ ...preview, beats: next });
  };

  const selChapter = chapters.find((c) => c.id === selected);

  return (
    <div className="cockpit-card p-6 space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <p className="editorial-eyebrow">Phase 2B — Beats prévus</p>
          <h2 className="text-lg text-foreground">Planification beats par chapitre</h2>
        </div>
        <div className="flex gap-2 items-center">
          <input
            placeholder="model (optionnel)"
            value={model}
            onChange={(e) => setModel(e.target.value)}
            className="text-xs px-2 py-1 rounded border border-border bg-background w-40"
          />
          <button onClick={() => { loadChapters(); if (selected) loadPersisted(selected); }}
            className="text-xs px-3 py-1.5 rounded border border-border hover:bg-secondary inline-flex items-center gap-1.5">
            <RefreshCw size={12} /> Refresh
          </button>
        </div>
      </div>

      {readError && (
        <div className="text-xs p-3 rounded border border-destructive/40 bg-destructive/5 text-destructive inline-flex items-start gap-2">
          <AlertTriangle size={12} className="mt-0.5" /> {readError}
        </div>
      )}

      {chapters.length === 0 && !readError && (
        <p className="text-xs text-muted-foreground">
          Plan de chapitres requis — importer depuis articulation.txt.
        </p>
      )}

      {chapters.length > 0 && (
        <div className="grid grid-cols-12 gap-4">
          <div className="col-span-4 space-y-1 max-h-[400px] overflow-y-auto pr-2 border-r border-border">
            <p className="editorial-eyebrow mb-2">Chapitres ({chapters.length})</p>
            {chapters.map((c) => (
              <button
                key={c.id}
                onClick={() => setSelected(c.id)}
                className={`w-full text-left px-2 py-1.5 rounded text-xs transition-colors ${
                  selected === c.id ? 'bg-primary/10 text-primary' : 'text-muted-foreground hover:bg-secondary/40 hover:text-foreground'
                }`}
              >
                <span className="font-mono">#{c.number}</span> {c.title}
                {c.scale && <span className="ml-1 text-[10px] text-muted-foreground">[{c.scale}]</span>}
              </button>
            ))}
          </div>

          <div className="col-span-8 space-y-3">
            {selChapter && (
              <div>
                <p className="text-xs text-foreground">
                  <span className="font-mono text-muted-foreground">#{selChapter.number}</span>{' '}
                  {selChapter.title}
                </p>
                {selChapter.main_arc && (
                  <p className="text-[11px] text-muted-foreground mt-0.5">Arc : {selChapter.main_arc}</p>
                )}
              </div>
            )}

            <div className="flex gap-2 flex-wrap">
              <button
                onClick={runPreview}
                disabled={loading || persisting || !selected}
                className="text-xs px-3 py-1.5 rounded border border-border hover:bg-secondary disabled:opacity-50 inline-flex items-center gap-1.5"
              >
                {loading ? <Loader2 size={12} className="animate-spin" /> : <Sparkles size={12} />}
                Preview beats OpenAI
              </button>
              <button
                onClick={runPersist}
                disabled={loading || persisting || !preview?.beats?.length}
                className="text-xs px-3 py-1.5 rounded bg-primary text-primary-foreground hover:opacity-90 disabled:opacity-50 inline-flex items-center gap-1.5"
              >
                {persisting ? <Loader2 size={12} className="animate-spin" /> : <Save size={12} />}
                Persister beats validés
              </button>
              <button
                onClick={validateAll}
                disabled={validating || persisted.length === 0}
                className="text-xs px-3 py-1.5 rounded border border-emerald/40 text-emerald hover:bg-emerald/5 disabled:opacity-50 inline-flex items-center gap-1.5"
              >
                {validating ? <Loader2 size={12} className="animate-spin" /> : <ShieldCheck size={12} />}
                Valider tous ({persisted.length})
              </button>
            </div>

            {preview?.error && (
              <div className="text-xs p-2 rounded border border-destructive/40 bg-destructive/5 text-destructive">
                {preview.error}
              </div>
            )}

            {preview && !preview.error && preview.beats && preview.beats.length > 0 && (
              <div className="space-y-2">
                <p className="text-[11px] font-mono text-muted-foreground">
                  Preview · model={preview.model} · count={preview.count}
                  {preview.warnings && preview.warnings.length > 0 && (
                    <span className="text-amber"> · {preview.warnings.length} warnings</span>
                  )}
                </p>
                <div className="space-y-2 max-h-[360px] overflow-y-auto">
                  {preview.beats.map((b, i) => (
                    <div key={i} className="border border-border rounded p-2 space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-[10px] text-muted-foreground">#{b.beat_number}</span>
                        <input
                          value={b.title}
                          onChange={(e) => editBeat(i, 'title', e.target.value)}
                          className="flex-1 text-xs px-1 py-0.5 rounded bg-transparent border border-transparent hover:border-border focus:border-primary text-foreground"
                        />
                        <button onClick={() => removeBeat(i)} className="text-destructive opacity-60 hover:opacity-100">
                          <X size={12} />
                        </button>
                      </div>
                      {b.objective && (
                        <textarea
                          value={b.objective}
                          onChange={(e) => editBeat(i, 'objective', e.target.value)}
                          rows={2}
                          className="w-full text-[11px] px-1 py-0.5 rounded bg-transparent border border-transparent hover:border-border focus:border-primary text-foreground/80"
                        />
                      )}
                      <div className="flex gap-3 text-[10px] text-muted-foreground font-mono flex-wrap">
                        {b.narrative_function && <span>fn: {b.narrative_function}</span>}
                        {typeof b.tension_start === 'number' && (
                          <span>tens: {b.tension_start}→{b.tension_end}</span>
                        )}
                        {b.risk_flags && b.risk_flags.length > 0 && (
                          <span className="text-amber">⚠ {b.risk_flags.join(', ')}</span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="pt-3 border-t border-border">
              <p className="text-xs editorial-eyebrow mb-2">Beats persistés ({persisted.length})</p>
              {persisted.length === 0 && (
                <p className="text-xs text-muted-foreground">
                  {chapters.length > 0 ? 'Chapitres actifs. Générer les beats prévus.' : '—'}
                </p>
              )}
              {persisted.length > 0 && (
                <ul className="space-y-1 max-h-48 overflow-y-auto">
                  {persisted.map((b) => (
                    <li key={b.id} className="text-xs flex items-center gap-2">
                      <span className="font-mono text-[10px] text-muted-foreground w-6">#{b.beat_number}</span>
                      <span className="flex-1 text-foreground">{b.title}</span>
                      <span className={`text-[10px] font-mono px-1.5 py-0.5 rounded border ${
                        b.validation_status === 'validated'
                          ? 'border-emerald/40 text-emerald bg-emerald/5'
                          : b.validation_status === 'rejected'
                          ? 'border-destructive/40 text-destructive bg-destructive/5'
                          : 'border-amber/40 text-amber bg-amber/5'
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
