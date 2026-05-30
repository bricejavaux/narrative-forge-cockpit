import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { getProductionMode, isDemoMode } from '@/lib/productionMode';

type Check = { label: string; status: 'ok' | 'warn' | 'fail' | 'pending'; detail?: string };

// Vite injects build-time constants where available; we fall back gracefully.
const BUILD_TIME = (import.meta as any).env?.VITE_BUILD_TIME || new Date().toISOString();
const COMMIT_SHA = (import.meta as any).env?.VITE_COMMIT_SHA || 'unknown';

async function pingFunction(name: string): Promise<Check> {
  // Use OPTIONS (CORS preflight) to verify reachability without triggering
  // app-level 4xx errors from missing required params.
  try {
    const url = `https://${(import.meta as any).env?.VITE_SUPABASE_PROJECT_ID}.supabase.co/functions/v1/${name}`;
    const res = await fetch(url, { method: 'OPTIONS' });
    if (res.ok || res.status === 204) return { label: name, status: 'ok', detail: 'reachable' };
    return { label: name, status: 'warn', detail: `HTTP ${res.status}` };
  } catch (e) {
    return { label: name, status: 'fail', detail: e instanceof Error ? e.message : 'unknown' };
  }
}

async function tableReadable(name: 'chapters' | 'beats'): Promise<Check> {
  try {
    const { error, count } = await supabase.from(name).select('id', { count: 'exact', head: true });
    if (error) return { label: `table ${name}`, status: 'fail', detail: error.message };
    return { label: `table ${name}`, status: 'ok', detail: `${count ?? 0} rows visible` };
  } catch (e) {
    return { label: `table ${name}`, status: 'fail', detail: e instanceof Error ? e.message : 'unknown' };
  }
}

function StatusDot({ status }: { status: Check['status'] }) {
  const color =
    status === 'ok' ? 'bg-emerald'
    : status === 'warn' ? 'bg-amber'
    : status === 'fail' ? 'bg-destructive'
    : 'bg-muted-foreground';
  return <span className={`inline-block w-2 h-2 rounded-full ${color}`} />;
}

export default function BuildAlignmentPanel() {
  const [checks, setChecks] = useState<Check[]>([]);
  const [loading, setLoading] = useState(false);
  const mode = getProductionMode();

  const run = async () => {
    setLoading(true);
    const results = await Promise.all([
      pingFunction('beats-preview'),
      pingFunction('beats-persist'),
      pingFunction('governance-update'),
      pingFunction('chapter-plan-from-articulation'),
      tableReadable('chapters'),
      tableReadable('beats'),
    ]);
    setChecks(results);
    setLoading(false);
  };

  useEffect(() => { run(); }, []);

  const dummyActive = isDemoMode();

  return (
    <div className="cockpit-card space-y-3">
      <div className="flex items-center justify-between">
        <div>
          <p className="editorial-eyebrow">Diagnostic</p>
          <h3 className="text-base editorial-heading text-foreground">Alignement Build / Runtime / Supabase</h3>
        </div>
        <button
          onClick={run}
          disabled={loading}
          className="text-xs px-3 py-1.5 rounded-md border border-border bg-secondary/40 hover:bg-secondary disabled:opacity-50"
        >
          {loading ? 'Vérification…' : 'Revérifier'}
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-xs">
        <div className="rounded border border-border/60 p-2 flex justify-between">
          <span className="text-muted-foreground">Build timestamp</span>
          <span className="font-mono text-foreground">{BUILD_TIME}</span>
        </div>
        <div className="rounded border border-border/60 p-2 flex justify-between">
          <span className="text-muted-foreground">Commit SHA</span>
          <span className="font-mono text-foreground">{COMMIT_SHA}</span>
        </div>
        <div className="rounded border border-border/60 p-2 flex justify-between">
          <span className="text-muted-foreground">Mode</span>
          <span className="font-mono text-foreground">{mode}</span>
        </div>
        <div className="rounded border border-border/60 p-2 flex justify-between">
          <span className="text-muted-foreground">dummyData actif</span>
          <span className={`font-mono ${dummyActive ? 'text-amber' : 'text-emerald'}`}>
            {dummyActive ? 'oui (Demo)' : 'non (Production Test)'}
          </span>
        </div>
      </div>

      <div className="space-y-1">
        {checks.map((c) => (
          <div key={c.label} className="flex items-center justify-between py-1.5 px-2 rounded hover:bg-secondary/40 text-xs">
            <div className="flex items-center gap-2">
              <StatusDot status={c.status} />
              <span className="font-mono text-foreground">{c.label}</span>
            </div>
            <span className="text-muted-foreground truncate max-w-[60%] text-right">{c.detail}</span>
          </div>
        ))}
        {checks.length === 0 && !loading && (
          <p className="text-xs text-muted-foreground">Aucun check exécuté.</p>
        )}
      </div>

      {COMMIT_SHA === 'unknown' && (
        <p className="text-[11px] text-amber">
          ⚠ Commit SHA non injecté à la compilation — le runtime peut être en avance sur GitHub.
          Publier / synchroniser si l'audit GitHub ne reflète pas les fonctionnalités visibles ici.
        </p>
      )}
    </div>
  );
}
