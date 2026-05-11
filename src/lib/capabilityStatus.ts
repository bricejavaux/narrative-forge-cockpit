// Shared helper that converts the connection-status readiness payload
// into per-capability statuses. Replaces the global "Prototype simulé" labels.

import type { ConnectionReadiness } from '@/services/supabaseService';

export type CapabilityState =
  | 'live'
  | 'degraded'
  | 'dry_run'
  | 'mock'
  | 'stubbed'
  | 'pending'
  | 'future'
  | 'unavailable';

export type CapabilityStatus = {
  key: string;
  label: string;
  status: CapabilityState;
  reason?: string;
  source: 'connection-status' | 'derived' | 'static';
  lastCheckedAt: string;
};

const CRITICAL_KEYS = new Set([
  'supabase_db',
  'openai_runtime',
  'onedrive_listing',
  'text_export',
]);

export function buildCapabilityMap(r: ConnectionReadiness | null): Record<string, CapabilityStatus> {
  const t = new Date().toISOString();
  const src: CapabilityStatus['source'] = r ? 'connection-status' : 'derived';
  const openaiOk = !!r?.openai?.api_key_configured;
  const model = r?.openai?.model ?? undefined;
  const audioPipelineStatus = r?.openai?.transcription_pipeline_status;
  const audioLive = audioPipelineStatus === 'transcription_live';
  const audioDegraded = audioPipelineStatus === 'degraded';
  const supaOk = !!r?.supabase?.project_connected && !!r?.supabase?.tables_created;
  const onedriveOk = !!r?.onedrive?.oauth_configured;

  const c = (key: string, label: string, status: CapabilityState, reason?: string): CapabilityStatus =>
    ({ key, label, status, reason, source: src, lastCheckedAt: t });

  return {
    supabase_db: c('supabase_db', 'Supabase DB', supaOk ? 'live' : 'unavailable', supaOk ? `model tables present` : 'not connected'),
    supabase_auth: c('supabase_auth', 'Supabase Auth', r?.supabase?.auth_configured ? 'live' : 'pending', 'optional — auth flow not enabled'),
    supabase_storage: c('supabase_storage', 'Supabase Storage', r?.supabase?.storage_buckets_created ? 'live' : 'pending'),
    openai_runtime: c('openai_runtime', 'OpenAI runtime', openaiOk ? 'live' : 'unavailable', openaiOk ? `model: ${model ?? 'default'}` : 'OPENAI_API_KEY missing'),
    openai_agent_run: c('openai_agent_run', 'Agent run', openaiOk ? (r?.openai?.agent_runs_available ? 'live' : 'stubbed') : 'mock'),
    onedrive_listing: c('onedrive_listing', 'OneDrive listing', onedriveOk ? 'live' : 'unavailable'),
    onedrive_download: c('onedrive_download', 'OneDrive download', onedriveOk ? 'live' : 'unavailable'),
    onedrive_upload: c('onedrive_upload', 'OneDrive upload', onedriveOk ? 'live' : 'unavailable'),
    import_reconcile: c('import_reconcile', 'Import/reconcile', openaiOk && onedriveOk ? 'live' : 'degraded'),
    text_export: c('text_export', 'Text export', r?.exports?.text_export_available ? 'live' : 'unavailable'),
    markdown_export: c('markdown_export', 'Markdown export', r?.exports?.markdown_export_available ? 'live' : 'unavailable'),
    json_export: c('json_export', 'JSON export', r?.exports?.json_export_available ? 'live' : 'unavailable'),
    audio_upload: c('audio_upload', 'Audio upload', r?.supabase?.storage_buckets_created ? 'pending' : 'unavailable', 'storage bucket "audio" reachable, frontend upload pending'),
    audio_transcription: c(
      'audio_transcription',
      'Whisper transcription',
      audioLive ? 'live' : audioDegraded ? 'degraded' : openaiOk ? 'pending' : 'mock',
      audioLive ? 'real pipeline active' : openaiOk ? 'OpenAI key present — audio file pipeline pending' : 'OPENAI_API_KEY missing',
    ),
    audio_structuring: c('audio_structuring', 'Note structuring', openaiOk ? 'live' : 'mock'),
    vector_packages: c('vector_packages', 'Vector packages prepared', onedriveOk ? 'live' : 'pending'),
    pgvector: c('pgvector', 'pgvector ingestion', 'pending', 'chunks prepared, vector ingestion not active'),
    chroma_archives: c('chroma_archives', 'Chroma archives', 'future', 'archived in OneDrive — not queried'),
    run_orchestration: c('run_orchestration', 'Run orchestration', openaiOk && supaOk ? 'dry_run' : 'mock', 'persistence path not wired'),
    chapter_full_text: c('chapter_full_text', 'Chapter full-text', 'pending', 'full_text not imported'),
    pdf_docx_epub: c('pdf_docx_epub', 'PDF/DOCX/EPUB export', 'future'),
  };
}

export function criticalGaps(map: Record<string, CapabilityStatus>): CapabilityStatus[] {
  return Object.values(map).filter(
    (c) => CRITICAL_KEYS.has(c.key) && (c.status === 'unavailable' || c.status === 'stubbed'),
  );
}

export const STATE_COLOR: Record<CapabilityState, string> = {
  live: 'bg-emerald-500/10 text-emerald-600 border-emerald-500/30',
  degraded: 'bg-amber-500/10 text-amber-600 border-amber-500/30',
  dry_run: 'bg-sky-500/10 text-sky-600 border-sky-500/30',
  mock: 'bg-slate-500/10 text-slate-600 border-slate-500/30',
  stubbed: 'bg-slate-500/10 text-slate-600 border-slate-500/30',
  pending: 'bg-amber-500/10 text-amber-600 border-amber-500/30',
  future: 'bg-violet-500/10 text-violet-600 border-violet-500/30',
  unavailable: 'bg-rose-500/10 text-rose-600 border-rose-500/30',
};

export const STATE_LABEL: Record<CapabilityState, string> = {
  live: 'live',
  degraded: 'degraded',
  dry_run: 'dry run',
  mock: 'mock',
  stubbed: 'stub',
  pending: 'pending',
  future: 'future',
  unavailable: 'unavailable',
};
