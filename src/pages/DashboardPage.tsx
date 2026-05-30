import { useEffect, useState } from 'react';
import { Plug } from 'lucide-react';
import ConnectionReadinessPanel from '@/components/shared/ConnectionReadinessPanel';
import ImportReconcilePanel from '@/components/shared/ImportReconcilePanel';
import OneDriveRepositoryPanel from '@/components/shared/OneDriveRepositoryPanel';
import CapabilitiesModal from '@/components/shared/CapabilitiesModal';
import ProductionFlowPanel from '@/components/shared/ProductionFlowPanel';
import SupabaseRepositoryPanel from '@/components/shared/SupabaseRepositoryPanel';
import { supabaseService, type ConnectionReadiness, type ProductionCounts, deriveProductionStages } from '@/services/supabaseService';

export default function DashboardPage() {
  const [readiness, setReadiness] = useState<ConnectionReadiness | null>(null);
  const [counts, setCounts] = useState<ProductionCounts | null>(null);
  const [capsOpen, setCapsOpen] = useState(false);

  useEffect(() => {
    supabaseService.getReadiness().then(setReadiness).catch(() => setReadiness(null));
    const loadCounts = () => supabaseService.getProductionCounts().then(setCounts).catch(() => setCounts(null));
    loadCounts();
    const h = () => loadCounts();
    window.addEventListener('canon-imported', h);
    window.addEventListener('characters-imported', h);
    window.addEventListener('supabase-records-refresh', h);
    return () => {
      window.removeEventListener('canon-imported', h);
      window.removeEventListener('characters-imported', h);
      window.removeEventListener('supabase-records-refresh', h);
    };
  }, []);

  const openai = !!readiness?.openai?.api_key_configured;
  const onedrive = !!readiness?.onedrive?.oauth_configured;
  const supaOk = !!readiness?.supabase?.project_connected && !!readiness?.supabase?.tables_created;
  const pgv = !!readiness?.indexes?.pgvector_ready;
  const audioLive = readiness?.openai?.transcription_pipeline_status === 'transcription_live';

  const liveCount = (openai ? 1 : 0) + (onedrive ? 1 : 0) + (supaOk ? 1 : 0);
  const modeLabel = !readiness
    ? 'Vérification…'
    : liveCount >= 3 ? 'Production Test — live'
    : liveCount >= 1 ? 'Production Test — partiel'
    : 'Production Test — non branché';

  // Blockers grouped
  const blocksProdTest: string[] = [];
  const blocksChapterProd: string[] = [];
  const futureIntentional: string[] = [];

  if (!openai) blocksProdTest.push('OpenAI API key non configurée');
  if (!supaOk) blocksProdTest.push('Supabase tables non créées');
  if (!onedrive) blocksProdTest.push('OneDrive non connecté');

  blocksChapterProd.push('Beats validés requis avant génération chapitre');
  if (!audioLive) blocksChapterProd.push('Pipeline audio (Whisper) — pending');

  if (!pgv) futureIntentional.push('pgvector — ingestion non activée');
  futureIntentional.push('Réécriture autonome — désactivée intentionnellement');
  futureIntentional.push('Export PDF/DOCX/EPUB — futur');

  const totalGaps = blocksProdTest.length + blocksChapterProd.length + futureIntentional.length;

  return (
    <div className="space-y-6 animate-slide-in">
      <div className="flex items-center justify-between">
        <div className="flex items-baseline gap-3">
          <h1 className="text-2xl font-display font-bold text-foreground">Dashboard</h1>
          <span className="text-[10px] font-mono px-2 py-0.5 rounded-full border bg-primary/5 border-primary/30 text-primary">{modeLabel}</span>
        </div>
        <span className="text-xs font-mono text-muted-foreground">
          {readiness?.checked_at ? `Vérifié : ${new Date(readiness.checked_at).toLocaleString()}` : ''}
        </span>
      </div>

      {/* Readiness des connexions (compact) */}
      <ConnectionReadinessPanel compact />

      {/* Référentiels live */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <OneDriveRepositoryPanel />
        <SupabaseRepositoryPanel />
      </div>

      {/* Chaîne de production unique, cliquable */}
      <ProductionFlowPanel compact stages={deriveProductionStages(counts)} />

      {/* Imports réels (réconciliation) */}
      <ImportReconcilePanel />

      {/* Blockers / capacités à finaliser */}
      <div className="cockpit-card space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-display font-semibold text-foreground flex items-center gap-2">
            <Plug size={14} /> Capacités à finaliser
          </h3>
          <button
            onClick={() => setCapsOpen(true)}
            className="text-[11px] font-mono text-muted-foreground hover:text-foreground underline-offset-2 hover:underline"
          >
            {totalGaps} · détails
          </button>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <BlockerGroup
            title="Bloque Production Test"
            tone="rose"
            items={blocksProdTest}
            emptyLabel="Aucun blocker — Production Test opérationnel"
          />
          <BlockerGroup
            title="Bloque Chapter Production"
            tone="amber"
            items={blocksChapterProd}
          />
          <BlockerGroup
            title="Futur / intentionnel"
            tone="violet"
            items={futureIntentional}
          />
        </div>
      </div>

      <CapabilitiesModal open={capsOpen} onClose={() => setCapsOpen(false)} />
    </div>
  );
}

function BlockerGroup({
  title, tone, items, emptyLabel,
}: { title: string; tone: 'rose' | 'amber' | 'violet'; items: string[]; emptyLabel?: string }) {
  const toneCls = tone === 'rose'
    ? 'border-rose-500/30 bg-rose-500/5 text-rose-700'
    : tone === 'amber'
      ? 'border-amber-500/30 bg-amber-500/5 text-amber-700'
      : 'border-violet-500/30 bg-violet-500/5 text-violet-700';
  return (
    <div className={`rounded border p-3 ${toneCls}`}>
      <p className="text-[10px] font-mono uppercase tracking-wider opacity-80 mb-2">{title}</p>
      {items.length === 0 ? (
        <p className="text-[11px] opacity-80 italic">{emptyLabel ?? '—'}</p>
      ) : (
        <ul className="space-y-1">
          {items.map((g, i) => (
            <li key={i} className="text-[11px] flex items-start gap-2">
              <span className="w-1 h-1 rounded-full bg-current mt-1.5 shrink-0" />
              <span>{g}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
