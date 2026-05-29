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

export type ReadStatus<T> = {
  rows: T[];
  count: number;
  ok: boolean;
  error?: string;
  source: 'supabase';
  table: string;
  checked_at: string;
};

export type CountStatusValue = 'active' | 'empty' | 'missing_table' | 'rls_blocked' | 'not_created_yet' | 'unknown_error' | 'phase_next';
export type CountStatus = {
  table: string;
  count: number;
  ok: boolean;
  status: CountStatusValue;
  error?: string;
  error_message?: string;
  error_code?: string;
  error_details?: string;
  error_hint?: string;
  missing?: boolean;
  required?: boolean;
};

/** Tables required for current Production Test. Others fall back to "phase suivante" classification when blocked. */
export const PRODUCTION_TEST_REQUIRED_TABLES = new Set<string>([
  'canon_objects', 'characters', 'import_jobs',
]);

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

  /** @deprecated Use getCanonObjectsWithStatus(). */
  async getActiveCanonObjects(): Promise<ActiveCanonObject[]> { return (await this.getCanonObjectsWithStatus()).rows; },
  /** @deprecated Use getCharactersWithStatus(). */
  async getActiveCharacters(): Promise<ActiveCharacter[]> { return (await this.getCharactersWithStatus()).rows; },

  async getCanonObjectsWithStatus(): Promise<ReadStatus<ActiveCanonObject>> {
    const checked_at = new Date().toISOString();
    try {
      const { data, error, count } = await supabase
        .from('canon_objects')
        .select('id,external_id,title,category,summary,description,exceptions,criticality,rigidity,status,version,validation_status,needs_review,needs_index_refresh,source_reference,index_associated,updated_at,metadata', { count: 'exact' })
        .order('updated_at', { ascending: false })
        .limit(500);
      if (error) return { rows: [], count: 0, ok: false, error: error.message, source: 'supabase', table: 'canon_objects', checked_at };
      return { rows: (data ?? []) as ActiveCanonObject[], count: count ?? (data?.length ?? 0), ok: true, source: 'supabase', table: 'canon_objects', checked_at };
    } catch (e) {
      return { rows: [], count: 0, ok: false, error: e instanceof Error ? e.message : 'unknown', source: 'supabase', table: 'canon_objects', checked_at };
    }
  },

  async getCharactersWithStatus(): Promise<ReadStatus<ActiveCharacter>> {
    const checked_at = new Date().toISOString();
    try {
      const { data, error, count } = await supabase
        .from('characters')
        .select('id,external_id,name,role,function,apparent_goal,real_goal,flaw,secret,forbidden,emotional_trajectory,breaking_point,narrative_weight,exposure_level,validation_status,needs_review,updated_at,metadata', { count: 'exact' })
        .order('updated_at', { ascending: false })
        .limit(500);
      if (error) return { rows: [], count: 0, ok: false, error: error.message, source: 'supabase', table: 'characters', checked_at };
      return { rows: (data ?? []) as ActiveCharacter[], count: count ?? (data?.length ?? 0), ok: true, source: 'supabase', table: 'characters', checked_at };
    } catch (e) {
      return { rows: [], count: 0, ok: false, error: e instanceof Error ? e.message : 'unknown', source: 'supabase', table: 'characters', checked_at };
    }
  },

  /** Diagnostic count — classified error, never returns ok=false with empty error. */
  async countWithStatus(table: string, filter?: (q: any) => any): Promise<CountStatus> {
    const required = PRODUCTION_TEST_REQUIRED_TABLES.has(table);
    try {
      let q = supabase.from(table as any).select('id', { count: 'exact', head: true });
      if (filter) q = filter(q);
      const { count, error } = await q;
      if (error) {
        const anyErr = error as any;
        const message = anyErr?.message || '';
        const code = anyErr?.code || '';
        const details = anyErr?.details || '';
        const hint = anyErr?.hint || '';
        const raw = message || details || JSON.stringify(error) || 'unknown error';
        const missing = /relation .* does not exist|does not exist|not found|schema cache|PGRST20[125]/i.test(raw) || code === 'PGRST205' || code === '42P01';
        let status: CountStatusValue = 'unknown_error';
        if (missing) status = required ? 'missing_table' : 'not_created_yet';
        else if (/permission denied|RLS|policy|insufficient_privilege|42501/i.test(raw)) status = 'rls_blocked';
        else if (!required) status = 'phase_next';
        return { table, count: 0, ok: false, status, error: raw, error_message: message, error_code: code, error_details: details, error_hint: hint, missing, required };
      }
      const c = count ?? 0;
      return { table, count: c, ok: true, status: c > 0 ? 'active' : 'empty', required };
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'unknown';
      return { table, count: 0, ok: false, status: required ? 'unknown_error' : 'phase_next', error: msg, error_message: msg, required };
    }
  },

  /** @deprecated frontend UPDATE may fail under RLS. Use validateCanonObjects(). */
  async updateCanonObject(id: string, patch: Partial<ActiveCanonObject>) {
    const { error } = await supabase.from('canon_objects').update(patch).eq('id', id);
    return { ok: !error, error: error?.message };
  },
  /** @deprecated frontend UPDATE may fail under RLS. Use validateCharacters(). */
  async updateCharacter(id: string, patch: Partial<ActiveCharacter>) {
    const { error } = await supabase.from('characters').update(patch).eq('id', id);
    return { ok: !error, error: error?.message };
  },

  // ---- Governance-controlled writes (Edge Function with service role) ----
  async governanceUpdate(params: {
    target_table: 'canon_objects' | 'characters';
    record_ids: string[];
    action: 'mark_validated' | 'mark_reviewed' | 'mark_index_refresh_required' | 'apply_note_patch';
    patch?: Record<string, any>;
    note_context?: Record<string, any>;
  }): Promise<{ ok: boolean; updated: number; failed: number; errors?: any; error?: string; raw?: any }> {
    try {
      const { data, error } = await supabase.functions.invoke('governance-update', { body: params });
      if (error) return { ok: false, updated: 0, failed: params.record_ids.length, error: error.message };
      const updated = Number((data as any)?.updated ?? 0);
      const failed = Number((data as any)?.failed ?? 0);
      return { ok: updated > 0 && failed === 0, updated, failed, errors: (data as any)?.errors, raw: data };
    } catch (e) {
      return { ok: false, updated: 0, failed: params.record_ids.length, error: e instanceof Error ? e.message : 'unknown' };
    }
  },
  validateCanonObjects(ids: string[]) { return this.governanceUpdate({ target_table: 'canon_objects', record_ids: ids, action: 'mark_validated' }); },
  validateCharacters(ids: string[]) { return this.governanceUpdate({ target_table: 'characters', record_ids: ids, action: 'mark_validated' }); },
  markCanonReviewed(ids: string[]) { return this.governanceUpdate({ target_table: 'canon_objects', record_ids: ids, action: 'mark_reviewed' }); },
  markCharactersReviewed(ids: string[]) { return this.governanceUpdate({ target_table: 'characters', record_ids: ids, action: 'mark_reviewed' }); },
  markCanonIndexRefresh(ids: string[]) { return this.governanceUpdate({ target_table: 'canon_objects', record_ids: ids, action: 'mark_index_refresh_required' }); },
  applyStructuredNotePatch(target_table: 'canon_objects' | 'characters', id: string, patch: Record<string, any>, note_context?: Record<string, any>) {
    return this.governanceUpdate({ target_table, record_ids: [id], action: 'apply_note_patch', patch, note_context });
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

  /** Aggregated counts used by Production Flow + Test Readiness. */
  async getProductionCounts() {
    const [
      canon, chars, chs,
      planned_beats, validated_beats,
      open_rewrite_tasks, locked_chapters,
    ] = await Promise.all([
      this.countWithStatus('canon_objects'),
      this.countWithStatus('characters'),
      this.countWithStatus('chapters'),
      this.countWithStatus('beats', (q) => q.eq('beat_type', 'planned')),
      this.countWithStatus('beats', (q) => q.eq('validation_status', 'validated')),
      this.countWithStatus('rewrite_tasks', (q) => q.eq('status', 'pending')),
      this.countWithStatus('chapters', (q) => q.eq('locked', true)),
    ]);
    let chapter_full_text_count = 0;
    try {
      const { data } = await supabase.from('chapters').select('full_text').limit(500);
      chapter_full_text_count = (data ?? []).filter((r: any) => r.full_text && String(r.full_text).trim().length > 0).length;
    } catch {}
    return {
      canon_count: canon.count,
      characters_count: chars.count,
      chapters_count: chs.count,
      planned_beats_count: planned_beats.count,
      validated_beats_count: validated_beats.count,
      chapter_full_text_count,
      open_rewrite_tasks_count: open_rewrite_tasks.count,
      locked_chapters_count: locked_chapters.count,
      canon_ok: canon.ok, canon_error: canon.error,
      characters_ok: chars.ok, characters_error: chars.error,
      chapters_ok: chs.ok, chapters_error: chs.error,
    };
  },
};

export type ProductionCounts = Awaited<ReturnType<typeof supabaseService.getProductionCounts>>;

/** Derive ProductionFlowPanel stages from real Supabase counts. In Production Test, never emits "mock". */
export function deriveProductionStages(c: ProductionCounts | null) {
  const k = c ?? ({ canon_count: 0, characters_count: 0, chapters_count: 0, planned_beats_count: 0, validated_beats_count: 0, chapter_full_text_count: 0, open_rewrite_tasks_count: 0, locked_chapters_count: 0, canon_ok: true, characters_ok: true, chapters_ok: true } as ProductionCounts);
  type S = 'live' | 'pending' | 'blocked' | 'future' | 'mock' | 'active';
  const stage = (step: number, name: string, status: S, extras: Record<string, any> = {}) => ({ step, name, status, ...extras });
  const canonStatus: S = (c && c.canon_ok === false) ? 'blocked' : (k.canon_count > 0 ? 'live' : 'pending');
  const archStatus: S = (c && c.chapters_ok === false) ? 'blocked' : (k.chapters_count > 0 ? 'live' : 'pending');
  return [
    stage(1, 'Canon actif', canonStatus, { route: '/canon', blocker: canonStatus === 'blocked' ? (c?.canon_error || 'Lecture canon_objects bloquée.') : (k.canon_count === 0 ? 'Aucun canon_object Supabase.' : undefined), nextAction: k.canon_count === 0 ? 'Importer articulation.txt.' : undefined }),
    stage(2, 'Architecture Tome', archStatus, { route: '/architecture', blocker: archStatus === 'pending' ? 'Aucun chapitre planifié.' : undefined }),
    stage(3, 'Plan chapitre', archStatus, { route: '/architecture', blocker: archStatus === 'pending' ? 'Aucun plan de chapitre.' : undefined }),
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
