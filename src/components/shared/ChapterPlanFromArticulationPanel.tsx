import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Loader2, RefreshCw, Sparkles, AlertTriangle } from 'lucide-react';

type Preview = {
  mode?: string;
  model?: string;
  count?: number;
  chapters?: Array<{ number: number; title: string; scale?: string; main_arc?: string; summary?: string }>;
  inserted?: number;
  updated?: number;
  errors?: string[];
  error?: string;
};

type ChapterRow = {
  id: string;
  number: number;
  title: string;
  scale: string | null;
  main_arc: string | null;
  status: string | null;
  production_status: string | null;
};

export default function ChapterPlanFromArticulationPanel() {
  const [loading, setLoading] = useState(false);
  const [persisting, setPersisting] = useState(false);
  const [preview, setPreview] = useState<Preview | null>(null);
  const [persisted, setPersisted] = useState<ChapterRow[]>([]);
  const [readError, setReadError] = useState<string | null>(null);

  const refresh = async () => {
    const { data, error } = await supabase
      .from('chapters')
      .select('id,number,title,scale,main_arc,status,production_status')
      .order('number', { ascending: true })
      .limit(200);
    if (error) setReadError(error.message);
    else {
      setReadError(null);
      setPersisted((data as ChapterRow[]) ?? []);
    }
  };

  useEffect(() => {
    refresh();
  }, []);

  const runPreview = async () => {
    setLoading(true);
    setPreview(null);
    try {
      const { data, error } = await supabase.functions.invoke('chapter-plan-from-articulation', { body: { persist: false } });
      if (error) setPreview({ error: error.message });
      else setPreview(data as Preview);
    } catch (e) {
      setPreview({ error: e instanceof Error ? e.message : 'unknown' });
    } finally {
      setLoading(false);
    }
  };

  const runPersist = async () => {
    if (!confirm('Persister le plan chapitres extrait depuis articulation.txt ? (upsert par external_id)')) return;
    setPersisting(true);
    try {
      const { data, error } = await supabase.functions.invoke('chapter-plan-from-articulation', { body: { persist: true } });
      if (error) setPreview({ error: error.message });
      else setPreview(data as Preview);
      await refresh();
    } finally {
      setPersisting(false);
    }
  };

  return (
    <div className="cockpit-card p-6 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <p className="editorial-eyebrow">Phase 2A — Plan chapitres</p>
          <h2 className="text-lg text-foreground">Importer depuis articulation.txt</h2>
        </div>
        <div className="flex gap-2">
          <button
            onClick={runPreview}
            disabled={loading || persisting}
            className="text-xs px-3 py-1.5 rounded border border-border hover:bg-secondary disabled:opacity-50 inline-flex items-center gap-1.5"
          >
            {loading ? <Loader2 size={12} className="animate-spin" /> : <Sparkles size={12} />}
            Preview OpenAI
          </button>
          <button
            onClick={runPersist}
            disabled={loading || persisting || !preview?.chapters?.length}
            className="text-xs px-3 py-1.5 rounded bg-primary text-primary-foreground hover:opacity-90 disabled:opacity-50 inline-flex items-center gap-1.5"
          >
            {persisting ? <Loader2 size={12} className="animate-spin" /> : <Sparkles size={12} />}
            Persister
          </button>
          <button
            onClick={refresh}
            className="text-xs px-3 py-1.5 rounded border border-border hover:bg-secondary inline-flex items-center gap-1.5"
          >
            <RefreshCw size={12} /> Refresh
          </button>
        </div>
      </div>

      {preview?.error && (
        <div className="text-xs p-3 rounded border border-destructive/40 bg-destructive/5 text-destructive inline-flex items-start gap-2">
          <AlertTriangle size={12} className="mt-0.5" /> {preview.error}
        </div>
      )}

      {preview && !preview.error && (
        <div className="text-xs text-muted-foreground space-y-2">
          <div className="font-mono">
            mode={preview.mode} · model={preview.model} · count={preview.count}
            {preview.inserted !== undefined && ` · inserted=${preview.inserted} · updated=${preview.updated}`}
          </div>
          {preview.errors && preview.errors.length > 0 && (
            <div className="text-amber font-mono">errors: {preview.errors.join(' | ')}</div>
          )}
          {preview.chapters && preview.chapters.length > 0 && (
            <details className="text-foreground">
              <summary className="cursor-pointer text-xs text-muted-foreground">Preview ({preview.chapters.length})</summary>
              <ul className="mt-2 space-y-1 max-h-64 overflow-auto">
                {preview.chapters.map((c) => (
                  <li key={c.number} className="font-mono text-[11px]">
                    #{c.number} · {c.title} <span className="text-muted-foreground">[{c.scale ?? '—'}]</span>
                  </li>
                ))}
              </ul>
            </details>
          )}
        </div>
      )}

      <div className="pt-3 border-t border-border">
        <p className="text-xs editorial-eyebrow mb-2">Chapitres persistés ({persisted.length})</p>
        {readError && <p className="text-xs text-destructive font-mono">{readError}</p>}
        {!readError && persisted.length === 0 && (
          <p className="text-xs text-muted-foreground">Aucun chapitre persisté. Lance Preview puis Persister.</p>
        )}
        {persisted.length > 0 && (
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead className="text-[10px] uppercase text-muted-foreground">
                <tr className="border-b border-border">
                  <th className="text-left py-1 px-2">#</th>
                  <th className="text-left py-1 px-2">Titre</th>
                  <th className="text-left py-1 px-2">Échelle</th>
                  <th className="text-left py-1 px-2">Arc principal</th>
                  <th className="text-left py-1 px-2">Statut</th>
                </tr>
              </thead>
              <tbody>
                {persisted.map((c) => (
                  <tr key={c.id} className="border-b border-border/40">
                    <td className="py-1 px-2 font-mono text-muted-foreground">{c.number}</td>
                    <td className="py-1 px-2 text-foreground">{c.title}</td>
                    <td className="py-1 px-2 text-muted-foreground">{c.scale ?? '—'}</td>
                    <td className="py-1 px-2 text-muted-foreground truncate max-w-[260px]">{c.main_arc ?? '—'}</td>
                    <td className="py-1 px-2 font-mono text-[10px] text-muted-foreground">{c.production_status ?? c.status ?? '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
