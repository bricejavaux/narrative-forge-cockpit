import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Database, RefreshCw, CheckCircle2, AlertCircle, Minus, XCircle, ChevronDown, Clock } from 'lucide-react';
import { supabaseService, type CountStatus } from '@/services/supabaseService';

type Row = CountStatus & { label: string; route?: string; phase?: 'core' | 'prod' | 'assets' };
type Section = { id: string; title: string; rows: Row[] };

const TABLES: Array<{ key: string; label: string; route?: string; section: 'core' | 'prod' | 'assets'; filter?: (q: any) => any }> = [
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

const SECTIONS = [
  { id: 'core' as const, title: 'Noyau narratif' },
  { id: 'prod' as const, title: 'État de production' },
  { id: 'assets' as const, title: 'Assets & index' },
];

function rowState(s: Row): { tag: string; cls: string; Icon: typeof CheckCircle2 } {
  switch (s.status) {
    case 'active': return { tag: '', cls: 'text-emerald-600', Icon: CheckCircle2 };
    case 'empty': return { tag: 'vide', cls: 'text-muted-foreground', Icon: Minus };
    case 'missing_table': return { tag: 'table manquante', cls: 'text-amber-600', Icon: AlertCircle };
    case 'not_created_yet': return { tag: 'table non encore créée — phase suivante', cls: 'text-muted-foreground', Icon: Clock };
    case 'rls_blocked': return { tag: 'lecture bloquée — RLS', cls: 'text-rose-600', Icon: XCircle };
    case 'phase_next': return { tag: 'phase suivante', cls: 'text-muted-foreground', Icon: Clock };
    case 'unknown_error':
    default: return { tag: s.error_message || s.error || 'erreur inconnue', cls: 'text-rose-600', Icon: XCircle };
  }
}

export default function SupabaseRepositoryPanel() {
  const [sections, setSections] = useState<Section[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [showDiag, setShowDiag] = useState(false);

  const refresh = async () => {
    setLoading(true);
    const results = await Promise.all(TABLES.map(async (t) => {
      const r = await supabaseService.countWithStatus(t.key, t.filter);
      return { ...r, label: t.label, route: t.route, phase: t.section } as Row;
    }));
    setSections(SECTIONS.map(s => ({ id: s.id, title: s.title, rows: results.filter(r => r.phase === s.id) })));
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
  const requiredBlocked = allRows.filter(r => r.required && !r.ok).length;

  return (
    <div className="rounded-lg border border-border/60 bg-card/40 p-4 space-y-4">
      <div className="flex items-start justify-between">
        <div>
          <p className="editorial-eyebrow">Référentiel Supabase</p>
          <h3 className="text-lg editorial-heading text-foreground flex items-center gap-2">
            <Database className="w-4 h-4" /> Couche narrative active
          </h3>
          <p className="text-xs text-muted-foreground mt-1">Diagnostic classé : vide ≠ lecture bloquée ≠ table non créée ≠ phase suivante.</p>
        </div>
        <button onClick={triggerRefresh} className="text-xs flex items-center gap-1 text-muted-foreground hover:text-foreground">
          <RefreshCw className={`w-3 h-3 ${loading ? 'animate-spin' : ''}`} /> Rafraîchir
        </button>
      </div>

      {requiredBlocked > 0 && (
        <div className="text-[11px] text-rose-700 border border-rose-500/30 bg-rose-500/5 p-2 rounded">
          {requiredBlocked} table(s) requises pour Production Test en erreur — voir diagnostic technique ci-dessous.
        </div>
      )}

      {!sections && <p className="text-sm text-muted-foreground">Lecture des tables…</p>}

      {sections?.map((s) => (
        <div key={s.id} className="rounded-md border border-border/40 p-3">
          <p className="editorial-eyebrow mb-2">{s.title}</p>
          <div className="space-y-1">
            {s.rows.map((r) => {
              const st = rowState(r);
              const Icon = st.Icon;
              const title = r.error || r.error_message || '';
              const body = (
                <div className="flex items-center justify-between text-xs py-0.5">
                  <div className="flex items-center gap-2 min-w-0">
                    <Icon className={`w-3 h-3 ${st.cls}`} />
                    <span className="font-mono text-foreground truncate">{r.label}</span>
                    {!r.required && <span className="text-[9px] font-mono px-1 rounded bg-secondary/60 text-muted-foreground">phase 2</span>}
                    {st.tag && <span className={`text-[10px] ${st.cls}`}>{st.tag}</span>}
                  </div>
                  <span className={`font-mono text-[11px] ${r.ok && r.count > 0 ? 'text-emerald-600' : 'text-muted-foreground'}`}>
                    {r.ok ? r.count : '—'}
                  </span>
                </div>
              );
              return r.route ? (
                <Link key={r.label} to={r.route} className="block hover:bg-secondary/40 rounded px-1" title={title}>{body}</Link>
              ) : (
                <div key={r.label} title={title}>{body}</div>
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
{JSON.stringify(allRows.map(r => ({ table: r.label, required: r.required, status: r.status, ok: r.ok, count: r.count, error_code: r.error_code, error_message: r.error_message, error_details: r.error_details, error_hint: r.error_hint })), null, 2)}
        </pre>
      )}
    </div>
  );
}
