import { supabase } from '@/integrations/supabase/client';

export type ImpactAnalysisRow = {
  id: string;
  source_object_type: string;
  source_object_id: string | null;
  source_change_summary: string | null;
  impact_type: string | null;
  severity: string | null;
  affected_object_type: string | null;
  affected_object_id: string | null;
  proposed_action: string | null;
  proposed_payload: any;
  status: string;
  created_at: string;
  validated_at: string | null;
  metadata: any;
};

export const impactAnalysisService = {
  async list(opts?: { source_object_type?: string; status?: string }): Promise<ImpactAnalysisRow[]> {
    let q = supabase.from('impact_analysis').select('*').order('created_at', { ascending: false }).limit(200);
    if (opts?.source_object_type) q = q.eq('source_object_type', opts.source_object_type);
    if (opts?.status) q = q.eq('status', opts.status);
    const { data } = await q;
    return (data ?? []) as ImpactAnalysisRow[];
  },

  async create(row: Partial<ImpactAnalysisRow>) {
    const { data, error } = await supabase.from('impact_analysis').insert(row as any).select().single();
    if (error) throw error;
    return data as ImpactAnalysisRow;
  },

  async setStatus(id: string, status: 'pending' | 'validated' | 'ignored' | 'task_created') {
    const patch: any = { status };
    if (status === 'validated') patch.validated_at = new Date().toISOString();
    const { error } = await supabase.from('impact_analysis').update(patch).eq('id', id);
    if (error) throw error;
    return { ok: true };
  },

  /** Enqueue a basic impact analysis row when a canon object is edited. Non-destructive. */
  async enqueueForCanonChange(canon_id: string, summary: string, affected = ['chapter', 'character', 'arc']) {
    const rows = affected.map((t) => ({
      source_object_type: 'canon',
      source_object_id: canon_id,
      source_change_summary: summary,
      impact_type: 'review_needed',
      severity: 'medium',
      affected_object_type: t,
      proposed_action: 'review',
      status: 'pending',
      metadata: { auto: true },
    }));
    const { error } = await supabase.from('impact_analysis').insert(rows as any);
    return { ok: !error };
  },
};
