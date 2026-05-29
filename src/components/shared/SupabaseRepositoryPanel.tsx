import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Database, RefreshCw, CheckCircle2, AlertCircle, Minus } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { supabaseService } from '@/services/supabaseService';

type Row = {
  key: string;
  label: string;
  count: number | null;
  status: 'active' | 'empty' | 'missing';
  route?: string;
  error?: string;
};

type Section = { id: string; title: string; rows: Row[] };

async function safeCount(table: string): Promise<{ count: number | null; missing: boolean; error?: string }> {
  try {
    const { count, error } = await supabase.from(table as any).select('id', { count: 'exact', head: true });
    if (error) {
      const msg = error.message || '';
      const missing = /relation .* does not exist|not found|schema cache/i.test(msg);
      return { count: null, missing, error: msg };
    }
    return { count: count ?? 0, missing: false };
  } catch (e) {
    return { count: null, missing: true, error: e instanceof Error ? e.message : 'unknown' };
  }
}

export default function SupabaseRepositoryPanel() {
  const [sections, setSections] = useState<Section[] | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = async () => {
    setLoading(true);
    const counts = await supabaseService.getProductionCounts().catch(() => null);
    const tables = await Promise.all([
      ['vector_source_packages', 'Paquets vectoriels', '/indexes'],
      ['exports', 'Exports', '/exports'],
      ['import_jobs', 'Jobs d\'import', '/settings'],
      ['audio_notes', 'Notes audio', '/audio'],
      ['runs', 'Runs', '/runs'],
      ['run_outputs', 'Run outputs', '/runs'],
      ['rewrite_tasks', 'Tâches de réécriture', '/production'],
    ].map(async ([t, label, route]) => {
      const r = await safeCount(t);
      return { key: t, label, route, ...r };
    }));

    const mk = (key: string, label: string, route?: string, n?: number): Row => ({
      key, label, route,
      count: n ?? 0,
      status: (n ?? 0) > 0 ? 'active' : 'empty',
    });

    const c = counts ?? { canon_count: 0, characters_count: 0, chapters_count: 0, planned_beats_count: 0, validated_beats_count: 0, chapter_full_text_count: 0, open_rewrite_tasks_count: 0, locked_chapters_count: 0 };

    const tableRow = (key: string, label: string, route?: string): Row => {
      const r = tables.find(x => x.key === key);
      if (!r) return { key, label, count: 0, status: 'empty', route };
      if (r.missing) return { key, label, count: null, status: 'missing', route, error: r.error };
      return { key, label, count: r.count ?? 0, status: (r.count ?? 0) > 0 ? 'active' : 'empty', route };
    };

    setSections([
      {
        id: 'core', title: 'Noyau narratif',
        rows: [
          mk('canon_objects', 'canon_objects', '/canon', c.canon_count),
          mk('characters', 'characters', '/characters', c.characters_count),
          mk('chapters', 'chapters', '/architecture', c.chapters_count),
          mk('beats', 'beats (total prévus)', '/production', c.planned_beats_count),
          mk('beats_validated', 'beats validés', '/production', c.validated_beats_count),
        ],
      },
      {
        id: 'prod', title: 'État de production',
        rows: [
          mk('chapter_full_text', 'chapitres avec full_text', '/architecture', c.chapter_full_text_count),
          mk('open_rewrites', 'rewrite_tasks ouvertes', '/production', c.open_rewrite_tasks_count),
          mk('locked', 'chapitres verrouillés', '/production', c.locked_chapters_count),
          tableRow('runs', 'runs', '/runs'),
          tableRow('run_outputs', 'run_outputs', '/runs'),
        ],
      },
      {
        id: 'assets', title: 'Assets & index',
        rows: [
          tableRow('vector_source_packages', 'vector_source_packages', '/indexes'),
          tableRow('exports', 'exports', '/exports'),
          tableRow('import_jobs', 'import_jobs', '/settings'),
          tableRow('audio_notes', 'audio_notes', '/audio'),
        ],
      },
    ]);
    setLoading(false);
  };

  useEffect(() => {
    refresh();
    const h = () => refresh();
    window.addEventListener('supabase-records-refresh', h);
    window.addEventListener('canon-imported', h);
    window.addEventListener('characters-imported', h);
    return () => {
      window.removeEventListener('supabase-records-refresh', h);
      window.removeEventListener('canon-imported', h);
      window.removeEventListener('characters-imported', h);
    };
  }, []);

  const triggerRefresh = () => {
    refresh();
    try { window.dispatchEvent(new CustomEvent('supabase-records-refresh')); } catch {}
  };

  return (
    <div className="rounded-lg border border-border/60 bg-card/40 p-4 space-y-4">
      <div className="flex items-start justify-between">
        <div>
          <p className="editorial-eyebrow">Référentiel Supabase</p>
          <h3 className="text-lg editorial-heading text-foreground flex items-center gap-2">
            <Database className="w-4 h-4" /> Couche narrative active
          </h3>
          <p className="text-xs text-muted-foreground mt-1">
            Objets importés, validés, modifiés et utilisés par les agents.
          </p>
        </div>
        <button onClick={triggerRefresh} className="text-xs flex items-center gap-1 text-muted-foreground hover:text-foreground">
          <RefreshCw className={`w-3 h-3 ${loading ? 'animate-spin' : ''}`} /> Rafraîchir Supabase
        </button>
      </div>

      {!sections && <p className="text-sm text-muted-foreground">Lecture des tables…</p>}

      {sections?.map((s) => (
        <div key={s.id} className="rounded-md border border-border/40 p-3">
          <p className="editorial-eyebrow mb-2">{s.title}</p>
          <div className="space-y-1">
            {s.rows.map((r) => {
              const Icon = r.status === 'active' ? CheckCircle2 : r.status === 'missing' ? AlertCircle : Minus;
              const color = r.status === 'active' ? 'text-emerald-500' : r.status === 'missing' ? 'text-rose-500' : 'text-muted-foreground';
              const body = (
                <div className="flex items-center justify-between text-xs py-0.5">
                  <div className="flex items-center gap-2">
                    <Icon className={`w-3 h-3 ${color}`} />
                    <span className="font-mono text-foreground">{r.label}</span>
                    {r.status === 'missing' && <span className="text-[10px] text-rose-600">table absente</span>}
                  </div>
                  <span className={`font-mono text-[11px] ${r.status === 'active' ? 'text-emerald-600' : 'text-muted-foreground'}`}>
                    {r.count === null ? '—' : r.count}
                  </span>
                </div>
              );
              return r.route ? (
                <Link key={r.key} to={r.route} className="block hover:bg-secondary/40 rounded px-1" title={r.error}>
                  {body}
                </Link>
              ) : (
                <div key={r.key} title={r.error}>{body}</div>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}
