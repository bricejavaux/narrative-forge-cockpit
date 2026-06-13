import { useEffect, useState } from 'react';
import VectorPackagesPanel from '@/components/shared/VectorPackagesPanel';
import VectorIngestionPanel from '@/components/shared/VectorIngestionPanel';
import PgvectorReadinessPanel from '@/components/shared/PgvectorReadinessPanel';
import SciencePortalsIngestionPanel from '@/components/shared/SciencePortalsIngestionPanel';
import BlockedCorpusCards from '@/components/shared/BlockedCorpusCards';
import { supabaseService } from '@/services/supabaseService';

type Badge = { label: string; classes: string };

export default function IndexesPage() {
  const [readiness, setReadiness] = useState<any>(null);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    supabaseService.getReadiness().then(setReadiness).catch((e) => setErr(e instanceof Error ? e.message : String(e)));
  }, []);

  const pgvector: Badge = (() => {
    if (!readiness) return { label: 'pgvector : chargement…', classes: 'bg-muted text-muted-foreground border-border' };
    const pg = readiness.pgvector ?? null;
    const status = pg?.status ?? (readiness.indexes?.pgvector_ready ? 'live' : 'blocked');
    if (status === 'live') {
      const total = pg?.embedding_count_total ?? 0;
      return { label: `pgvector : live · ${total} embeddings`, classes: 'bg-emerald-500/10 text-emerald-700 border-emerald-500/30' };
    }
    if (status === 'ready_no_embeddings') {
      return { label: 'pgvector : prêt — aucun embedding', classes: 'bg-amber-500/10 text-amber-700 border-amber-500/30' };
    }
    return { label: 'pgvector : bloqué — extension/table/RPC', classes: 'bg-destructive/10 text-destructive border-destructive/30' };
  })();

  const metadata: Badge = (() => {
    if (!readiness) return { label: 'metadata : —', classes: 'bg-muted text-muted-foreground border-border' };
    const ok = !!readiness?.supabase?.tables_created;
    return ok
      ? { label: 'metadata : live (vector_source_packages)', classes: 'bg-emerald-500/10 text-emerald-700 border-emerald-500/30' }
      : { label: 'metadata : indisponible', classes: 'bg-destructive/10 text-destructive border-destructive/30' };
  })();

  const chroma: Badge = {
    label: 'Chroma (OneDrive) : archives techniques — pas des indexes actifs',
    classes: 'bg-muted text-muted-foreground border-border',
  };

  return (
    <div className="space-y-6 animate-slide-in">
      <div>
        <p className="editorial-eyebrow">Atelier</p>
        <h1 className="text-3xl editorial-heading text-foreground mt-1">Indexes vectoriels</h1>
        <p className="text-sm text-muted-foreground mt-2 max-w-2xl">
          État réel des indexes consultés par les agents. Les badges et panneaux ci-dessous sont calculés depuis <code>connection-status</code> et Supabase — aucune donnée fictive.
        </p>
        <div className="mt-2 flex flex-wrap gap-2 text-[11px]">
          <span className={`px-2 py-0.5 rounded-full border font-mono ${pgvector.classes}`}>{pgvector.label}</span>
          <span className={`px-2 py-0.5 rounded-full border font-mono ${metadata.classes}`}>{metadata.label}</span>
          <span className={`px-2 py-0.5 rounded-full border font-mono ${chroma.classes}`}>{chroma.label}</span>
        </div>
        {err && <p className="mt-2 text-[11px] text-destructive font-mono">connection-status: {err}</p>}
      </div>

      <PgvectorReadinessPanel />
      <SciencePortalsIngestionPanel />
      <BlockedCorpusCards />

      <div className="space-y-3">
        <div>
          <h3 className="editorial-heading text-foreground text-lg">Paquets vectoriels préparés</h3>
          <p className="text-xs text-muted-foreground">
            Corpus chunkés disponibles dans <span className="font-mono">06_vector_sources/</span>. Seul <span className="font-mono">science_portals</span> est ingéré ; <span className="font-mono">follett</span> et <span className="font-mono">sf_portals_fiction</span> restent bloqués par doctrine.
          </p>
        </div>
        <VectorPackagesPanel />
      </div>

      <VectorIngestionPanel />
    </div>
  );
}
