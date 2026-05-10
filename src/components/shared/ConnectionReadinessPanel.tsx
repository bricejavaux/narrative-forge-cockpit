import { useEffect, useState } from 'react';
import { CheckCircle2, Circle, AlertCircle, RefreshCw } from 'lucide-react';
import { supabaseService, ConnectionReadiness } from '@/services/supabaseService';

const StatusDot = ({ ok, pending }: { ok: boolean; pending?: boolean }) => {
  if (pending) return <AlertCircle className="w-3.5 h-3.5 text-amber-500" />;
  return ok ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" /> : <Circle className="w-3.5 h-3.5 text-muted-foreground" />;
};

const Row = ({ label, ok, hint }: { label: string; ok: boolean; hint?: string }) => (
  <div className="flex items-center justify-between py-1.5 text-sm">
    <span className="text-foreground">{label}</span>
    <div className="flex items-center gap-2">
      {hint && <span className="text-[10px] font-mono text-muted-foreground">{hint}</span>}
      <StatusDot ok={ok} />
    </div>
  </div>
);

const Block = ({ title, children, eyebrow }: { title: string; eyebrow?: string; children: React.ReactNode }) => (
  <div className="rounded-lg border border-border/60 bg-card/40 p-4">
    {eyebrow && <p className="editorial-eyebrow">{eyebrow}</p>}
    <h4 className="text-sm font-medium text-foreground mt-1 mb-2">{title}</h4>
    <div className="space-y-0 divide-y divide-border/40">{children}</div>
  </div>
);

export default function ConnectionReadinessPanel({ compact = false }: { compact?: boolean }) {
  const [data, setData] = useState<ConnectionReadiness | null>(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  const refresh = async () => {
    setLoading(true);
    setErr(null);
    try {
      setData(await supabaseService.getReadiness());
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'unknown');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refresh();
  }, []);

  if (loading && !data) {
    return <div className="text-sm text-muted-foreground">Chargement de l'état des connexions…</div>;
  }
  if (err) {
    return (
      <div className="rounded-lg border border-amber-500/40 bg-amber-500/5 p-4 text-sm">
        Impossible de récupérer le statut de connexion : {err}
        <button onClick={refresh} className="ml-2 underline">Réessayer</button>
      </div>
    );
  }
  if (!data) return null;

  const blocks = compact
    ? [
        ['Supabase', data.supabase.project_connected, data.supabase.tables_created ? 'tables' : 'no tables'],
        ['OpenAI', data.openai.api_key_configured, data.openai.lovable_ai_gateway_available ? 'lovable AI fallback' : 'no fallback'],
        ['OneDrive', data.onedrive.oauth_configured, data.onedrive.sync_available ? 'sync ready' : 'auth pending'],
      ] as const;

  if (compact) {
    return (
      <div className="rounded-lg border border-border/60 bg-card/40 p-4">
        <div className="flex items-center justify-between mb-3">
          <div>
            <p className="editorial-eyebrow">Connexions</p>
            <h4 className="text-sm font-medium text-foreground">État technique</h4>
          </div>
          <button onClick={refresh} className="text-xs flex items-center gap-1 text-muted-foreground hover:text-foreground">
            <RefreshCw className="w-3 h-3" /> Rafraîchir
          </button>
        </div>
        <div className="space-y-1">
          {blocks.map(([label, ok, hint]) => (
            <Row key={label} label={label} ok={ok} hint={hint as string} />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <p className="editorial-eyebrow">Readiness</p>
          <h3 className="text-lg editorial-heading text-foreground">État des connexions</h3>
        </div>
        <button onClick={refresh} className="text-xs flex items-center gap-1 text-muted-foreground hover:text-foreground">
          <RefreshCw className="w-3 h-3" /> Rafraîchir
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Block eyebrow="Backend actif" title="Supabase">
          <Row label="Projet connecté" ok={data.supabase.project_connected} />
          <Row label="Tables créées" ok={data.supabase.tables_created} />
          <Row label="Buckets de stockage" ok={data.supabase.storage_buckets_created} />
          <Row label="Authentification configurée" ok={data.supabase.auth_configured} hint={data.supabase.auth_configured ? '' : 'phase suivante'} />
        </Block>

        <Block eyebrow="Intelligence" title="OpenAI / Lovable AI">
          <Row label="OPENAI_API_KEY configurée" ok={data.openai.api_key_configured} hint={data.openai.api_key_configured ? '' : 'optionnel — fallback Lovable AI'} />
          <Row label="Edge Functions déployées" ok={data.openai.edge_functions_deployed} />
          <Row label="Transcription disponible" ok={data.openai.transcription_available} hint={!data.openai.transcription_available ? 'mock' : ''} />
          <Row label="Structuration disponible" ok={data.openai.structuring_available} hint={!data.openai.structuring_available ? 'mock' : ''} />
          <Row label="Runs d'agents disponibles" ok={data.openai.agent_runs_available} hint={!data.openai.agent_runs_available ? 'dry run' : ''} />
          <Row label="Lovable AI gateway" ok={data.openai.lovable_ai_gateway_available} />
        </Block>

        <Block eyebrow="Référentiel source" title="OneDrive">
          <Row label="OAuth configuré" ok={data.onedrive.oauth_configured} />
          <Row label="Racine du répertoire" ok={data.onedrive.repository_root_found} />
          <Row label="Dossiers attendus" ok={data.onedrive.expected_folders_found} />
          <Row label="Fichiers attendus" ok={data.onedrive.expected_files_found} />
          <Row label="Sync disponible" ok={data.onedrive.sync_available} />
        </Block>

        <Block eyebrow="Indexation" title="Indexes & Chroma">
          <Row label="pgvector prêt" ok={data.indexes.pgvector_ready} hint="phase suivante" />
          <Row label="Indexes créés" ok={data.indexes.indexes_created} />
          <Row label="Chroma inspectés" ok={data.indexes.chroma_archive_inspected} />
          <Row label="Migration en attente" ok={data.indexes.migration_pending} />
          <Row label="File de rafraîchissement" ok={data.indexes.refresh_queue_ready} />
        </Block>

        <Block eyebrow="Production" title="Exports">
          <Row label="Texte" ok={data.exports.text_export_available} />
          <Row label="Markdown" ok={data.exports.markdown_export_available} />
          <Row label="JSON structuré" ok={data.exports.json_export_available} />
          <Row label="PDF / EPUB" ok={false} hint="futur" />
        </Block>
      </div>
    </div>
  );
}
