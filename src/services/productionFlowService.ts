import { supabase } from '@/integrations/supabase/client';
import type { ProductionStatus, StageId } from '@/lib/productionDoctrine';

export type ProductionUnit = {
  id: string;
  project_id: string | null;
  tome_id: string | null;
  unit_type: string;
  unit_id: string | null;
  title: string | null;
  status: ProductionStatus | string;
  locked: boolean;
  locked_at: string | null;
  locked_reason: string | null;
  reopened_at: string | null;
  reopened_reason: string | null;
  validation_status: string;
  version: number;
  parent_unit_id: string | null;
  stale_reason: string | null;
  metadata: any;
  updated_at: string;
};

export type StageState = {
  stage: StageId;
  status: ProductionStatus;
  count: number;
  blockers: string[];
  last_updated: string | null;
  source: 'live' | 'mock';
};

export const productionFlowService = {
  async listUnits(opts?: { tome_id?: string; unit_type?: string }): Promise<ProductionUnit[]> {
    let q = supabase.from('production_units').select('*').order('updated_at', { ascending: false }).limit(500);
    if (opts?.tome_id) q = q.eq('tome_id', opts.tome_id);
    if (opts?.unit_type) q = q.eq('unit_type', opts.unit_type);
    const { data } = await q;
    return (data ?? []) as ProductionUnit[];
  },

  async upsertUnit(row: Partial<ProductionUnit>) {
    const { data, error } = await supabase.from('production_units').insert(row as any).select().single();
    if (error) throw error;
    return data as ProductionUnit;
  },

  async logEvent(row: {
    project_id?: string | null;
    tome_id?: string | null;
    event_type: string;
    object_type?: string;
    object_id?: string | null;
    event_summary?: string;
    previous_status?: string | null;
    new_status?: string | null;
    metadata?: any;
  }) {
    await supabase.from('production_events').insert(row as any);
  },

  /** Compute pipeline state from current Supabase data with mock fallback per stage. */
  async computeFlowState(): Promise<StageState[]> {
    const [{ count: canonCount }, { count: charCount }, { count: chapCount }, { count: beatCount }, { count: rewCount }, { count: expCount }] = await Promise.all([
      supabase.from('canon_objects').select('*', { count: 'exact', head: true }),
      supabase.from('characters').select('*', { count: 'exact', head: true }),
      supabase.from('chapters').select('*', { count: 'exact', head: true }),
      supabase.from('beats').select('*', { count: 'exact', head: true }),
      supabase.from('rewrite_tasks').select('*', { count: 'exact', head: true }),
      supabase.from('exports').select('*', { count: 'exact', head: true }),
    ]);

    const plannedRes = await supabase.from('beats').select('id, validation_status, beat_type', { count: 'exact' }).eq('beat_type', 'planned');
    const observedRes = await supabase.from('beats').select('id', { count: 'exact', head: true }).eq('beat_type', 'observed');
    const lockedRes = await supabase.from('chapters').select('id', { count: 'exact', head: true }).eq('locked', true);

    const validatedBeats = (plannedRes.data ?? []).filter((b: any) => b.validation_status === 'validated').length;
    const totalPlanned = plannedRes.count ?? 0;

    const live = (n: number | null | undefined) => (n ?? 0) > 0;

    const stages: StageState[] = [
      {
        stage: 'canon',
        status: live(canonCount) ? 'validated' : 'not_started',
        count: canonCount ?? 0,
        blockers: live(canonCount) ? [] : ['Importer le canon'],
        last_updated: null,
        source: live(canonCount) ? 'live' : 'mock',
      },
      {
        stage: 'architecture',
        status: live(chapCount) ? 'draft' : 'not_started',
        count: chapCount ?? 0,
        blockers: live(chapCount) ? [] : ['Définir l’architecture du tome'],
        last_updated: null,
        source: live(chapCount) ? 'live' : 'mock',
      },
      {
        stage: 'chapter_plan',
        status: live(chapCount) ? 'draft' : 'not_started',
        count: chapCount ?? 0,
        blockers: [],
        last_updated: null,
        source: live(chapCount) ? 'live' : 'mock',
      },
      {
        stage: 'planned_beats',
        status: totalPlanned > 0 ? 'draft' : 'not_started',
        count: totalPlanned,
        blockers: totalPlanned === 0 ? ['Créer des beats prévus'] : [],
        last_updated: null,
        source: totalPlanned > 0 ? 'live' : 'mock',
      },
      {
        stage: 'beat_validation',
        status: validatedBeats > 0 ? (validatedBeats === totalPlanned ? 'validated' : 'ready_for_review') : 'not_started',
        count: validatedBeats,
        blockers: totalPlanned === 0 ? ['Pas de beats à valider'] : validatedBeats < totalPlanned ? [`${totalPlanned - validatedBeats} beat(s) à valider`] : [],
        last_updated: null,
        source: validatedBeats > 0 ? 'live' : 'mock',
      },
      {
        stage: 'chapter_generation',
        status: validatedBeats > 0 ? 'ready_for_review' : 'not_started',
        count: 0,
        blockers: validatedBeats === 0 ? ['Beats prévus non validés'] : [],
        last_updated: null,
        source: validatedBeats > 0 ? 'live' : 'mock',
      },
      {
        stage: 'observed_beats',
        status: (observedRes.count ?? 0) > 0 ? 'draft' : 'not_started',
        count: observedRes.count ?? 0,
        blockers: (observedRes.count ?? 0) === 0 ? ['Aucun beat observé extrait'] : [],
        last_updated: null,
        source: (observedRes.count ?? 0) > 0 ? 'live' : 'mock',
      },
      {
        stage: 'chapter_audit',
        status: 'not_started',
        count: 0,
        blockers: ['Audit chapitre à lancer après génération'],
        last_updated: null,
        source: 'mock',
      },
      {
        stage: 'targeted_rewrite',
        status: live(rewCount) ? 'draft' : 'not_started',
        count: rewCount ?? 0,
        blockers: [],
        last_updated: null,
        source: live(rewCount) ? 'live' : 'mock',
      },
      {
        stage: 'chapter_lock',
        status: (lockedRes.count ?? 0) > 0 ? 'locked' : 'not_started',
        count: lockedRes.count ?? 0,
        blockers: [],
        last_updated: null,
        source: (lockedRes.count ?? 0) > 0 ? 'live' : 'mock',
      },
      {
        stage: 'meta_audit',
        status: 'not_started',
        count: 0,
        blockers: ['Lancer après 3 chapitres verrouillés'],
        last_updated: null,
        source: 'mock',
      },
      {
        stage: 'export',
        status: live(expCount) ? 'draft' : 'not_started',
        count: expCount ?? 0,
        blockers: (lockedRes.count ?? 0) === 0 ? ['Aucun chapitre verrouillé'] : [],
        last_updated: null,
        source: live(expCount) ? 'live' : 'mock',
      },
    ];

    return stages;
  },
};
