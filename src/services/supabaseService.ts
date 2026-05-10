import { supabase } from '@/integrations/supabase/client';

export type ConnectionReadiness = {
  supabase: {
    project_connected: boolean;
    tables_created: boolean;
    storage_buckets_created: boolean;
    auth_configured: boolean;
    mock_fallback_active: boolean;
  };
  openai: {
    api_key_configured: boolean;
    edge_functions_deployed: boolean;
    transcription_available: boolean;
    structuring_available: boolean;
    agent_runs_available: boolean;
    lovable_ai_gateway_available: boolean;
  };
  onedrive: {
    oauth_configured: boolean;
    repository_root_found: boolean;
    expected_folders_found: boolean;
    expected_files_found: boolean;
    sync_available: boolean;
  };
  indexes: {
    pgvector_ready: boolean;
    indexes_created: boolean;
    chroma_archive_inspected: boolean;
    migration_pending: boolean;
    refresh_queue_ready: boolean;
  };
  exports: {
    text_export_available: boolean;
    markdown_export_available: boolean;
    json_export_available: boolean;
    pdf_epub_future: boolean;
  };
};

export const supabaseService = {
  client: supabase,
  async getReadiness(): Promise<ConnectionReadiness> {
    const { data, error } = await supabase.functions.invoke('connection-status', { body: {} });
    if (error) throw error;
    return data as ConnectionReadiness;
  },
  async testConnection() {
    const { error } = await supabase.from('projects').select('id').limit(1);
    return { ok: !error, error: error?.message };
  },
};
