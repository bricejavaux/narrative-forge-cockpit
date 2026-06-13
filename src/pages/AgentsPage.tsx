import { useEffect, useState } from 'react';
import PersistedAgentsPanel from '@/components/shared/PersistedAgentsPanel';
import { supabaseService, type ConnectionReadiness } from '@/services/supabaseService';

export default function AgentsPage() {
  const [readiness, setReadiness] = useState<ConnectionReadiness | null>(null);
  useEffect(() => {
    supabaseService.getReadiness().then(setReadiness).catch(() => setReadiness(null));
  }, []);
  const openaiReady = !!readiness?.openai?.api_key_configured;

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
            Source : Supabase · registry persisté uniquement
          </span>
        </div>
      </div>

      <PersistedAgentsPanel />
    </div>
  );
}
