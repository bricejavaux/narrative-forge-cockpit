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

  async getActiveChapters(): Promise<{ count: number; rows: Array<{ id: string; number: number; title: string; status: string; production_status: string; locked: boolean; full_text_present: boolean }> }> {
    const { data, error } = await supabase
      .from('chapters')
      .select('id,number,title,status,production_status,locked,full_text')
      .order('number', { ascending: true })
      .limit(500);
    if (error) return { count: 0, rows: [] };
    const rows = (data ?? []).map((r: any) => ({
      id: r.id, number: r.number, title: r.title, status: r.status,
      production_status: r.production_status, locked: !!r.locked,
      full_text_present: !!(r.full_text && String(r.full_text).trim().length > 0),
    }));
    return { count: rows.length, rows };
  },

  /** Aggregated counts used by Production Flow + Test Readiness. Each branch isolates failures so a single missing table doesn't break the whole call. */
  async getProductionCounts() {
    const safeCount = async (table: string, filter?: (q: any) => any) => {
      try {
        let q = supabase.from(table as any).select('id', { count: 'exact', head: true });
        if (filter) q = filter(q);
        const { count, error } = await q;
        if (error) return 0;
        return count ?? 0;
      } catch { return 0; }
    };
    const [
      canon_count, characters_count, chapters_count,
      planned_beats_count, validated_beats_count,
      open_rewrite_tasks_count, locked_chapters_count,
    ] = await Promise.all([
      safeCount('canon_objects'),
      safeCount('characters'),
      safeCount('chapters'),
      safeCount('beats', (q) => q.eq('beat_type', 'planned')),
      safeCount('beats', (q) => q.eq('validation_status', 'validated')),
      safeCount('rewrite_tasks', (q) => q.eq('status', 'pending')),
      safeCount('chapters', (q) => q.eq('locked', true)),
    ]);
    // chapter_full_text_count: must scan since SQL filter on text length is awkward via PostgREST
    let chapter_full_text_count = 0;
    try {
      const { data } = await supabase.from('chapters').select('full_text').limit(500);
      chapter_full_text_count = (data ?? []).filter((r: any) => r.full_text && String(r.full_text).trim().length > 0).length;
    } catch {}
    return {
      canon_count, characters_count, chapters_count,
      planned_beats_count, validated_beats_count,
      chapter_full_text_count, open_rewrite_tasks_count, locked_chapters_count,
    };
  },
};

export type ProductionCounts = Awaited<ReturnType<typeof supabaseService.getProductionCounts>>;

/** Derive a dynamic ProductionFlowPanel stages array from real Supabase counts. */
export function deriveProductionStages(c: ProductionCounts | null) {
  const k = c ?? { canon_count: 0, characters_count: 0, chapters_count: 0, planned_beats_count: 0, validated_beats_count: 0, chapter_full_text_count: 0, open_rewrite_tasks_count: 0, locked_chapters_count: 0 };
  type S = 'live' | 'pending' | 'blocked' | 'future' | 'mock' | 'active';
  const stage = (step: number, name: string, status: S, extras: Record<string, any> = {}) => ({ step, name, status, ...extras });
  return [
    stage(1, 'Canon actif', k.canon_count > 0 ? 'live' : 'mock', { route: '/canon', mockFallback: k.canon_count === 0, blocker: k.canon_count === 0 ? 'Aucun canon_object Supabase.' : undefined, nextAction: k.canon_count === 0 ? 'Importer articulation.txt.' : undefined }),
    stage(2, 'Architecture Tome', k.chapters_count > 0 ? 'live' : 'mock', { route: '/architecture', mockFallback: k.chapters_count === 0 }),
    stage(3, 'Plan chapitre', k.chapters_count > 0 ? 'live' : 'mock', { route: '/architecture', mockFallback: k.chapters_count === 0 }),
    stage(4, 'Beats prévus', k.planned_beats_count > 0 ? 'live' : 'pending', { route: '/production', blocker: k.planned_beats_count === 0 ? 'Beats prévus non générés.' : undefined }),
    stage(5, 'Validation beats', k.validated_beats_count > 0 ? 'live' : 'pending', { route: '/production', blocker: k.validated_beats_count === 0 ? 'Validation humaine requise.' : undefined }),
    stage(6, 'Génération chapitre', k.validated_beats_count > 0 ? 'pending' : 'blocked', { route: '/production', blocker: k.validated_beats_count === 0 ? 'Beats validés requis.' : 'Génération chapitre désactivée en Production Test.' }),
    stage(7, 'Beats observés', k.chapter_full_text_count > 0 ? 'pending' : 'future', { route: '/production' }),
    stage(8, 'Audit chapitre', k.chapter_full_text_count > 0 ? 'pending' : 'future', { route: '/production' }),
    stage(9, 'Réécriture ciblée', k.open_rewrite_tasks_count > 0 ? 'pending' : 'future', { route: '/production' }),
    stage(10, 'Verrouillage chapitre', k.locked_chapters_count > 0 ? 'live' : 'future', { route: '/production' }),
    stage(11, 'Audit méta-tome', k.locked_chapters_count >= 3 ? 'pending' : 'future', { route: '/production' }),
    stage(12, 'Export', 'pending', { route: '/exports', blocker: 'Sélection de contenu requise.' }),
  ];
}

