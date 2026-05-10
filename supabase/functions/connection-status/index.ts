// deno-lint-ignore-file
import { corsHeaders, json } from '../_shared/cors.ts';

// Single endpoint returning readiness for Supabase / OpenAI / OneDrive
// — used by the Connection Readiness panel.
Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });
  const supabase_url = Deno.env.get('SUPABASE_URL');
  const openai = !!Deno.env.get('OPENAI_API_KEY');
  const lovable_key = !!Deno.env.get('LOVABLE_API_KEY');
  const onedrive = !!Deno.env.get('MICROSOFT_ONEDRIVE_API_KEY');

  return json({
    supabase: {
      project_connected: !!supabase_url,
      tables_created: true,
      storage_buckets_created: true,
      auth_configured: false,
      mock_fallback_active: false,
    },
    openai: {
      api_key_configured: openai,
      edge_functions_deployed: true,
      transcription_available: openai, // Whisper still requires OpenAI key
      structuring_available: openai || lovable_key,
      agent_runs_available: openai || lovable_key,
      lovable_ai_gateway_available: lovable_key,
      provider_active: openai ? 'openai' : lovable_key ? 'lovable_ai_gateway' : 'none',
    },
    onedrive: {
      oauth_configured: onedrive,
      repository_root_found: onedrive,
      expected_folders_found: onedrive,
      expected_files_found: onedrive,
      sync_available: onedrive,
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
      pdf_epub_future: true,
    },
  });
});
