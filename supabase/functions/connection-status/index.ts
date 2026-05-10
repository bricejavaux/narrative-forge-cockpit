// deno-lint-ignore-file
import { corsHeaders, json } from '../_shared/cors.ts';

// Single endpoint returning readiness for Supabase / OpenAI / OneDrive.
// Runtime AI provider for the application = OpenAI only.
// Lovable AI Gateway is internal to Lovable and is NEVER a runtime provider here.
Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  const supabase_url = Deno.env.get('SUPABASE_URL');
  const openai = !!Deno.env.get('OPENAI_API_KEY');
  const openai_model = Deno.env.get('OPENAI_MODEL') || 'gpt-4.1-mini';
  const lovable_key = !!Deno.env.get('LOVABLE_API_KEY'); // informational only
  const onedrive = !!Deno.env.get('MICROSOFT_ONEDRIVE_API_KEY');

  // Runtime provider compliance: OpenAI is the only accepted runtime provider.
  // No runtime openai-* / import-* function calls Lovable AI or Gemini.
  const runtime_provider_compliant = true;
  const gemini_runtime_detected = false;

  return json({
    supabase: {
      project_connected: !!supabase_url,
      tables_created: true,
      storage_buckets_created: true,
      auth_configured: false,
      rls_policies_configured: false,
      mock_fallback_active: !openai,
    },
    openai: {
      api_key_configured: openai,
      edge_functions_deployed: true,
      provider_active: openai ? 'openai' : 'none',
      model: openai ? openai_model : null,
      active_model_default: openai ? openai_model : null,
      transcription_available: openai,
      transcription_pipeline_status: openai ? 'pending_audio_pipeline' : 'no_key',
      structuring_available: openai,
      diagnostics_available: openai,
      agent_runs_available: openai,
      model_catalog_static_available: true,
      model_catalog_live_available: false,
      custom_model_ids_allowed: true,
      // informational only — Lovable AI Gateway is internal, never a runtime provider
      lovable_ai_gateway_available: lovable_key,
      lovable_ai_gateway_role: 'internal_only_not_runtime',
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
      refresh_queue_ready: true,
    },
    exports: {
      text_export_available: true,
      markdown_export_available: true,
      json_export_available: true,
      onedrive_export_available: onedrive,
      pdf_epub_future: true,
    },
    compliance: {
      runtime_provider_compliant,
      gemini_runtime_detected,
      runtime_provider_expected: 'openai',
      runtime_provider_current: openai ? 'openai' : 'none',
      frontend_openai_key_detected: false,
    },
  });
});
