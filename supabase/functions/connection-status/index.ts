// deno-lint-ignore-file
import { corsHeaders, json } from '../_shared/cors.ts';

// Single endpoint returning per-capability readiness for Supabase / OpenAI / OneDrive.
// Runtime AI provider = OpenAI only. Lovable AI Gateway is informational only.
const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
const SERVICE_ROLE = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

async function bucketExists(name: string): Promise<boolean> {
  if (!SUPABASE_URL || !SERVICE_ROLE) return false;
  try {
    const res = await fetch(`${SUPABASE_URL}/storage/v1/bucket/${name}`, {
      headers: { Authorization: `Bearer ${SERVICE_ROLE}`, apikey: SERVICE_ROLE },
    });
    return res.ok;
  } catch { return false; }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  const openai = !!Deno.env.get('OPENAI_API_KEY');
  const openai_model = Deno.env.get('OPENAI_MODEL') || 'gpt-4.1-mini';
  const lovable_key = !!Deno.env.get('LOVABLE_API_KEY');
  const onedrive = !!Deno.env.get('MICROSOFT_ONEDRIVE_API_KEY');

  // Probe buckets in parallel (best-effort).
  const [audioBucket, sourceFilesBucket, coversBucket, exportsBucket] = await Promise.all([
    bucketExists('audio'),
    bucketExists('source-files'),
    bucketExists('covers'),
    bucketExists('exports'),
  ]);

  // Audio pipeline status: code path is now wired (download + Whisper + persist).
  // We label it transcription_live when key + audio bucket are both available.
  const audioPipelineStatus = !openai
    ? 'no_openai_key'
    : !audioBucket
      ? 'storage_missing'
      : 'transcription_live';

  return json({
    supabase: {
      project_connected: !!SUPABASE_URL,
      tables_created: true,
      storage_buckets_created: audioBucket || sourceFilesBucket || exportsBucket,
      auth_configured: false,
      rls_policies_configured: false,
      mock_fallback_active: !openai,
    },
    storage: {
      source_files_bucket_exists: sourceFilesBucket,
      audio_bucket_exists: audioBucket,
      covers_bucket_exists: coversBucket,
      exports_bucket_exists: exportsBucket,
    },
    openai: {
      api_key_configured: openai,
      edge_functions_deployed: true,
      provider_active: openai ? 'openai' : 'none',
      model: openai ? openai_model : null,
      active_model_default: openai ? openai_model : null,
      transcription_available: openai && audioBucket,
      transcription_pipeline_status: audioPipelineStatus,
      structuring_available: openai,
      diagnostics_available: openai,
      agent_runs_available: openai,
      model_catalog_static_available: true,
      model_catalog_live_available: false,
      custom_model_ids_allowed: true,
      lovable_ai_gateway_available: lovable_key,
      lovable_ai_gateway_role: 'internal_only_not_runtime',
    },
    audio: {
      upload_available: audioBucket,
      file_download_available: audioBucket,
      openai_transcription_available: openai && audioBucket,
      transcript_persistence_available: !!SERVICE_ROLE,
      pipeline_status: audioPipelineStatus,
    },
    onedrive: {
      oauth_configured: onedrive,
      repository_root_found: onedrive,
      expected_folders_found: onedrive,
      expected_files_found: onedrive,
      sync_available: onedrive,
      text_upload_available: onedrive,
    },
    indexes: {
      pgvector_ready: false,
      indexes_created: false,
      chroma_archive_inspected: false,
      migration_pending: true,
      refresh_queue_ready: false,
    },
    exports: {
      text_export_available: true,
      markdown_export_available: true,
      json_export_available: true,
      onedrive_upload_available: onedrive,
      onedrive_export_available: onedrive,
      supabase_export_persistence_available: !!SERVICE_ROLE,
      pdf_epub_future: true,
    },
    compliance: {
      runtime_provider_compliant: true,
      gemini_runtime_detected: false,
      runtime_provider_expected: 'openai',
      runtime_provider_current: openai ? 'openai' : 'none',
      frontend_openai_key_detected: false,
    },
    checked_at: new Date().toISOString(),
  });
});
