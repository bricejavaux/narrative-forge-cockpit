import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Database, RefreshCw, CheckCircle2, AlertCircle, Minus, XCircle, ChevronDown } from 'lucide-react';
import { supabaseService, type CountStatus } from '@/services/supabaseService';

type Row = CountStatus & { label: string; route?: string };
type Section = { id: string; title: string; rows: Row[] };

const TABLES: Array<{ key: string; label: string; route?: string; section: string; filter?: (q: any) => any }> = [
  { key: 'canon_objects', label: 'canon_objects', route: '/canon', section: 'core' },
  { key: 'characters', label: 'characters', route: '/characters', section: 'core' },
  { key: 'chapters', label: 'chapters', route: '/architecture', section: 'core' },
  { key: 'beats', label: 'beats', route: '/production', section: 'core' },
  { key: 'rewrite_tasks', label: 'rewrite_tasks', route: '/production', section: 'prod' },
  { key: 'runs', label: 'runs', route: '/runs', section: 'prod' },
  { key: 'run_outputs', label: 'run_outputs', route: '/runs', section: 'prod' },
  { key: 'vector_source_packages', label: 'vector_source_packages', route: '/indexes', section: 'assets' },
  { key: 'exports', label: 'exports', route: '/exports', section: 'assets' },
  { key: 'import_jobs', label: 'import_jobs', route: '/settings', section: 'assets' },
  { key: 'audio_notes', label: 'audio_notes', route: '/audio', section: 'assets' },
];

const SECTIONS: Array<{ id: string; title: string }> = [
  { id: 'core', title: 'Noyau narratif' },
  { id: 'prod', title: 'État de production' },
  { id: 'assets', title: 'Assets & index' },
];

function RowIcon({ s }: { s: Row }) {
  if (!s.ok && s.missing) return <AlertCircle className="w-3 h-3 text-amber-500" />;
  if (!s.ok) return <XCircle className="w-3 h-3 text-rose-500" />;
  if (s.count > 0) return <CheckCircle2 className="w-3 h-3 text-emerald-500" />;
  return <Minus className="w-3 h-3 text-muted-foreground" />;
}

function rowState(s: Row): { tag: string; cls: string } {
  if (!s.ok && s.missing) return { tag: 'table manquante', cls: 'text-amber-600' };
  if (!s.ok) return { tag: 'lecture bloquée', cls: 'text-rose-600' };
  if (s.count === 0) return { tag: 'vide', cls: 'text-muted-foreground' };
  return { tag: '', cls: 'text-emerald-600' };
}

export default function SupabaseRepositoryPanel() {
  const [sections, setSections] = useState<Section[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [showDiag, setShowDiag] = useState(false);

  const refresh = async () => {
    setLoading(true);
    const results = await Promise.all(TABLES.map(async (t) => {
      const r = await supabaseService.countWithStatus(t.key, t.filter);
      return { ...r, label: t.label, route: t.route, section: t.section };
    }));
    setSections(SECTIONS.map(s => ({ id: s.id, title: s.title, rows: results.filter(r => (r as any).section === s.id) })));
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

  const allRows = sections?.flatMap(s => s.rows) ?? [];
  const blockedCount = allRows.filter(r => !r.ok).length;

  return (
    <div className="rounded-lg border border-border/60 bg-card/40 p-4 space-y-4">
      <div className="flex items-start justify-between">
        <div>
          <p className="editorial-eyebrow">Référentiel Supabase</p>
          <h3 className="text-lg editorial-heading text-foreground flex items-center gap-2">
            <Database className="w-4 h-4" /> Couche narrative active
          </h3>
          <p className="text-xs text-muted-foreground mt-1">Comptes diagnostiqués · une lecture bloquée n'est pas un compte zéro.</p>
        </div>
        <button onClick={triggerRefresh} className="text-xs flex items-center gap-1 text-muted-foreground hover:text-foreground">
          <RefreshCw className={`w-3 h-3 ${loading ? 'animate-spin' : ''}`} /> Rafraîchir
        </button>
      </div>

      {blockedCount > 0 && (
        <div className="text-[11px] text-rose-700 border border-rose-500/30 bg-rose-500/5 p-2 rounded">
          {blockedCount} table(s) en erreur de lecture — voir diagnostic technique ci-dessous.
        </div>
      )}

      {!sections && <p className="text-sm text-muted-foreground">Lecture des tables…</p>}

      {sections?.map((s) => (
        <div key={s.id} className="rounded-md border border-border/40 p-3">
          <p className="editorial-eyebrow mb-2">{s.title}</p>
          <div className="space-y-1">
            {s.rows.map((r) => {
              const st = rowState(r);
              const body = (
                <div className="flex items-center justify-between text-xs py-0.5">
                  <div className="flex items-center gap-2 min-w-0">
                    <RowIcon s={r} />
                    <span className="font-mono text-foreground truncate">{r.label}</span>
                    {st.tag && <span className={`text-[10px] ${st.cls}`}>{st.tag}</span>}
                  </div>
                  <span className={`font-mono text-[11px] ${r.ok && r.count > 0 ? 'text-emerald-600' : 'text-muted-foreground'}`}>
                    {r.ok ? r.count : '—'}
                  </span>
                </div>
              );
              return r.route ? (
                <Link key={r.label} to={r.route} className="block hover:bg-secondary/40 rounded px-1" title={r.error || ''}>{body}</Link>
              ) : (
                <div key={r.label} title={r.error || ''}>{body}</div>
              );
            })}
          </div>
        </div>
      ))}

      <button onClick={() => setShowDiag(s => !s)} className="text-[11px] flex items-center gap-1 text-muted-foreground hover:text-foreground">
        <ChevronDown className={`w-3 h-3 transition-transform ${showDiag ? 'rotate-180' : ''}`} />
        Afficher diagnostic technique
      </button>
      {showDiag && (
        <pre className="text-[10px] bg-secondary/30 p-2 rounded max-h-60 overflow-auto whitespace-pre-wrap">
{JSON.stringify(allRows.map(r => ({ table: r.label, ok: r.ok, count: r.count, missing: r.missing, error: r.error })), null, 2)}
        </pre>
      )}
    </div>
  );
}
