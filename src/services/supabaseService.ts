import { supabase } from '@/integrations/supabase/client';

export type ConnectionReadiness = {
  supabase: {
    project_connected: boolean;
    tables_created: boolean;
    storage_buckets_created: boolean;
    auth_configured: boolean;
    rls_policies_configured?: boolean;
    mock_fallback_active: boolean;
  };
  storage?: {
    source_files_bucket_exists?: boolean;
    audio_bucket_exists?: boolean;
    covers_bucket_exists?: boolean;
    exports_bucket_exists?: boolean;
  };
  openai: {
    api_key_configured: boolean;
    edge_functions_deployed: boolean;
    provider_active?: 'openai' | 'none';
    model?: string | null;
    transcription_available: boolean;
    transcription_pipeline_status?: string;
    structuring_available: boolean;
    agent_runs_available: boolean;
    lovable_ai_gateway_available: boolean;
    lovable_ai_gateway_role?: string;
  };
  audio?: {
    upload_available?: boolean;
    file_download_available?: boolean;
    openai_transcription_available?: boolean;
    transcript_persistence_available?: boolean;
    pipeline_status?: string;
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
    onedrive_upload_available?: boolean;
    supabase_export_persistence_available?: boolean;
    pdf_epub_future: boolean;
  };
  compliance?: {
    runtime_provider_compliant: boolean;
    gemini_runtime_detected: boolean;
    runtime_provider_expected: string;
    runtime_provider_current: string;
    frontend_openai_key_detected: boolean;
  };
  checked_at?: string;
};

export type ActiveCanonObject = {
  id: string;
  external_id: string | null;
  title: string;
  category: string;
  summary: string | null;
  description: string | null;
  exceptions: string | null;
  criticality: string | null;
  rigidity: string | null;
  status: string;
  version: number;
  validation_status: string;
  needs_review: boolean;
  needs_index_refresh: boolean;
  source_reference: string | null;
  index_associated: string | null;
  updated_at: string;
};

export type ActiveCharacter = {
  id: string;
  external_id: string | null;
  name: string;
  role: string | null;
  function: string | null;
  apparent_goal: string | null;
  real_goal: string | null;
  flaw: string | null;
  secret: string | null;
  forbidden: string | null;
  emotional_trajectory: string | null;
  breaking_point: string | null;
  narrative_weight: number | null;
  exposure_level: number | null;
  validation_status: string;
  needs_review: boolean;
  updated_at: string;
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

  /** Returns the active canon objects in Supabase. Empty array means "no active data yet" — UI should fall back to dummy. */
  async getActiveCanonObjects(): Promise<ActiveCanonObject[]> {
    const { data, error } = await supabase
      .from('canon_objects')
      .select('id,external_id,title,category,summary,description,exceptions,criticality,rigidity,status,version,validation_status,needs_review,needs_index_refresh,source_reference,index_associated,updated_at')
      .order('updated_at', { ascending: false })
      .limit(500);
    if (error) return [];
    return (data ?? []) as ActiveCanonObject[];
  },

  async getActiveCharacters(): Promise<ActiveCharacter[]> {
    const { data, error } = await supabase
      .from('characters')
      .select('id,external_id,name,role,function,apparent_goal,real_goal,flaw,secret,forbidden,emotional_trajectory,breaking_point,narrative_weight,exposure_level,validation_status,needs_review,updated_at')
      .order('updated_at', { ascending: false })
      .limit(500);
    if (error) return [];
    return (data ?? []) as ActiveCharacter[];
  },

  async updateCanonObject(id: string, patch: Partial<ActiveCanonObject>) {
    const { error } = await supabase.from('canon_objects').update(patch).eq('id', id);
    return { ok: !error, error: error?.message };
  },

  async updateCharacter(id: string, patch: Partial<ActiveCharacter>) {
    const { error } = await supabase.from('characters').update(patch).eq('id', id);
    return { ok: !error, error: error?.message };
  },
};
