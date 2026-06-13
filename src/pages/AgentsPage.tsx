import { useEffect, useState, lazy, Suspense } from 'react';
import { isDemoMode } from '@/lib/productionMode';
import PersistedAgentsPanel from '@/components/shared/PersistedAgentsPanel';
import { supabaseService, type ConnectionReadiness } from '@/services/supabaseService';

// Lazy-load the demo catalogue so production_test NEVER imports dummy data into the bundle path used by operations.
const AgentsDemoCatalogue = lazy(() => import('@/components/shared/AgentsDemoCatalogue'));

export default function AgentsPage() {
  const [readiness, setReadiness] = useState<ConnectionReadiness | null>(null);
  useEffect(() => {
    supabaseService.getReadiness().then(setReadiness).catch(() => setReadiness(null));
  }, []);
  const openaiReady = !!readiness?.openai?.api_key_configured;
  const demo = isDemoMode();

  return (
    <div className="animate-slide-in space-y-6">
      <div>
        <p className="editorial-eyebrow">Intelligence · Configuration</p>
        <h1 className="text-3xl editorial-heading text-foreground mt-1">Agent Studio</h1>
        <p className="text-sm text-muted-foreground mt-2 max-w-3xl">
          Configurez ici les agents. Exécutez et tracez les runs dans <strong>Runs</strong>. La production éditoriale (beats, validation) reste dans <strong>Production</strong>.
        </p>
        <div className="mt-2 flex items-center gap-2 text-[11px] flex-wrap">
          <span className={`px-2 py-0.5 rounded-full border font-mono ${openaiReady ? 'bg-emerald-500/10 text-emerald-600 border-emerald-500/30' : 'bg-amber-500/10 text-amber-600 border-amber-500/30'}`}>
            {openaiReady ? 'OpenAI : clé détectée — runs live disponibles' : 'OpenAI : clé absente — runs live indisponibles'}
          </span>
          {readiness?.openai?.model && (
            <span className="text-muted-foreground font-mono">défaut Edge: {readiness.openai.model}</span>
          )}
          <span className="px-2 py-0.5 rounded-full border font-mono bg-slate-500/10 text-slate-600 border-slate-500/30">
            Source : Supabase · registry persisté
          </span>
          {!demo && (
            <span className="px-2 py-0.5 rounded-full border font-mono bg-slate-500/10 text-slate-600 border-slate-500/30">
              Mode Production Test — catalogue démo masqué
            </span>
          )}
        </div>
      </div>

      <PersistedAgentsPanel />

      {demo && (
        <div className="space-y-2">
          <div className="rounded border border-amber-500/30 bg-amber-500/5 px-3 py-2 text-[11px] text-amber-700">
            <strong>Demo only — not used in Production Test.</strong> Le catalogue ci-dessous est un mock de référence (fixtures locales) et n'effectue aucun appel persistant.
          </div>
          <Suspense fallback={<p className="text-xs text-muted-foreground italic">Chargement du catalogue démo…</p>}>
            <AgentsDemoCatalogue />
          </Suspense>
        </div>
      )}
    </div>
  );
}
