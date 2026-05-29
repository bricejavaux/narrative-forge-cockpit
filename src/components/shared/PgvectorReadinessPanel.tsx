import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { CheckCircle2, Circle, AlertTriangle, Loader2, RefreshCw } from 'lucide-react';

type Check = { key: string; label: string; ok: boolean; detail?: string };

export default function PgvectorReadinessPanel() {
  const [loading, setLoading] = useState(true);
  const [checks, setChecks] = useState<Check[]>([]);
  const [error, setError] = useState<string | null>(null);

  const refresh = async () => {
    setLoading(true);
    setError(null);
    try {
      const [canonRes, charRes, chapterRes, pkgRes, bindingRes] = await Promise.all([
        supabase.from('canon_objects').select('id', { count: 'exact', head: true }),
        supabase.from('characters').select('id', { count: 'exact', head: true }),
        supabase.from('chapters').select('id', { count: 'exact', head: true }),
        supabase.from('vector_source_packages' as any).select('id', { count: 'exact', head: true }),
        supabase.from('agent_index_bindings').select('id,status', { count: 'exact' }),
      ]);

      const bindingActive = (bindingRes.data ?? []).filter((b: any) => b.status === 'active').length;
      const bindingTotal = bindingRes.count ?? 0;

      const next: Check[] = [
        { key: 'canon', label: 'Canon importé', ok: (canonRes.count ?? 0) > 0, detail: `${canonRes.count ?? 0} records` },
        { key: 'characters', label: 'Personnages importés', ok: (charRes.count ?? 0) > 0, detail: `${charRes.count ?? 0} records` },
        { key: 'chapters', label: 'Plan chapitres présent', ok: (chapterRes.count ?? 0) > 0, detail: `${chapterRes.count ?? 0} chapitres` },
        {
          key: 'packages',
          label: 'Vector packages synchronisés (OneDrive)',
          ok: !pkgRes.error && (pkgRes.count ?? 0) > 0,
          detail: pkgRes.error ? `table absente : ${pkgRes.error.message}` : `${pkgRes.count ?? 0} paquets`,
        },
        {
          key: 'extension',
          label: 'Extension pgvector activée',
          ok: false,
          detail: 'Phase 2B — non activée (CREATE EXTENSION vector requis)',
        },
        {
          key: 'embeddings_table',
          label: 'Table embeddings + index HNSW créés',
          ok: false,
          detail: 'Phase 2B — schema embeddings à provisionner',
        },
        {
          key: 'ingestion',
          label: 'Pipeline ingestion → embeddings opérationnel',
          ok: false,
          detail: 'Phase 2B — edge function vector-ingest-package en stub',
        },
        {
          key: 'bindings',
          label: 'Bindings agents → indexes',
          ok: bindingActive > 0,
          detail: `${bindingActive}/${bindingTotal} actifs (le reste = pending_pgvector)`,
        },
      ];
      setChecks(next);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'unknown');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refresh();
  }, []);

  const okCount = checks.filter((c) => c.ok).length;
  const total = checks.length;

  return (
    <div className="cockpit-card p-6 space-y-3">
      <div className="flex items-center justify-between">
        <div>
          <p className="editorial-eyebrow">Readiness</p>
          <h2 className="text-lg text-foreground">pgvector — état de préparation</h2>
          <p className="text-xs text-muted-foreground mt-1">
            Liste actionable des prérequis avant d'activer la recherche sémantique. pgvector reste désactivé en Production Test.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[10px] font-mono px-2 py-0.5 rounded-full border bg-secondary/40 text-muted-foreground border-border">
            {okCount}/{total} prêts
          </span>
          <button
            onClick={refresh}
            disabled={loading}
            className="text-[10px] font-mono px-2 py-1 rounded border border-border hover:bg-secondary inline-flex items-center gap-1"
          >
            {loading ? <Loader2 size={10} className="animate-spin" /> : <RefreshCw size={10} />}
            Rafraîchir
          </button>
        </div>
      </div>

      {error && (
        <div className="text-xs p-2 rounded border border-destructive/40 bg-destructive/5 text-destructive inline-flex items-center gap-1.5">
          <AlertTriangle size={12} /> {error}
        </div>
      )}

      <ul className="space-y-1.5">
        {checks.map((c) => (
          <li
            key={c.key}
            className="flex items-start gap-2 text-xs border border-border/50 rounded px-2 py-1.5 bg-secondary/20"
          >
            {c.ok ? (
              <CheckCircle2 size={14} className="text-emerald-500 mt-0.5 shrink-0" />
            ) : (
              <Circle size={14} className="text-muted-foreground mt-0.5 shrink-0" />
            )}
            <div className="flex-1">
              <p className={`${c.ok ? 'text-foreground' : 'text-muted-foreground'}`}>{c.label}</p>
              {c.detail && <p className="text-[10px] font-mono text-muted-foreground mt-0.5">{c.detail}</p>}
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
