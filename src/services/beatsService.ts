import { supabase } from '@/integrations/supabase/client';
import { isDemoMode } from '@/lib/productionMode';

export type Beat = {
  id: string;
  chapter_id: string | null;
  tome_id: string | null;
  beat_number: number | null;
  beat_type: 'planned' | 'observed' | 'revised' | string;
  title: string;
  objective: string | null;
  narrative_function: string | null;
  characters: any;
  arcs: any;
  canon_links: any;
  tension_start: number | null;
  tension_end: number | null;
  scientific_density: number | null;
  emotional_density: number | null;
  decision_made: string | null;
  consequence: string | null;
  revelation: string | null;
  payoff: string | null;
  required_detail: string | null;
  status: string;
  validation_status: string;
  source: string;
  version: number;
  locked: boolean;
  metadata: any;
  created_at: string;
  updated_at: string;
};

/**
 * Phase 2B: writes go through service-role Edge Functions
 * (governance-update + beats-persist). Direct frontend writes are
 * restricted to Demo Mode for developer convenience.
 */
async function invokeGovernance(action: string, ids: string[], patch?: Record<string, any>) {
  const { data, error } = await supabase.functions.invoke('governance-update', {
    body: { target_table: 'beats', record_ids: ids, action, patch },
  });
  if (error) throw error;
  return data;
}

export const beatsService = {
  async listForChapter(chapter_id: string, beat_type?: 'planned' | 'observed' | 'revised'): Promise<Beat[]> {
    let q = supabase.from('beats').select('*').eq('chapter_id', chapter_id).order('beat_number', { ascending: true });
    if (beat_type) q = q.eq('beat_type', beat_type);
    const { data } = await q;
    return (data ?? []) as Beat[];
  },

  async create(row: Partial<Beat>) {
    if (!row.chapter_id) throw new Error('chapter_id required');
    const { data, error } = await supabase.functions.invoke('beats-persist', {
      body: {
        chapter_id: row.chapter_id,
        validation: 'human_confirmed',
        beats: [{
          beat_number: row.beat_number ?? 1,
          title: row.title ?? `Beat ${row.beat_number ?? 1}`,
          objective: row.objective ?? null,
          narrative_function: row.narrative_function ?? null,
          decision_made: row.decision_made ?? null,
          consequence: row.consequence ?? null,
          revelation: row.revelation ?? null,
          payoff: row.payoff ?? null,
          required_detail: row.required_detail ?? null,
          characters: row.characters ?? [],
          arcs: row.arcs ?? [],
          canon_links: row.canon_links ?? [],
          tension_start: row.tension_start ?? null,
          tension_end: row.tension_end ?? null,
          scientific_density: row.scientific_density ?? null,
          emotional_density: row.emotional_density ?? null,
        }],
      },
    });
    if (error) throw error;
    return data as any;
  },

  async update(id: string, patch: Partial<Beat>) {
    return invokeGovernance('apply_note_patch', [id], patch as Record<string, any>);
  },

  async validate(id: string) {
    return invokeGovernance('mark_validated', [id]);
  },

  async reject(id: string) {
    return invokeGovernance('mark_rejected', [id]);
  },

  async validateAllForChapter(chapter_id: string) {
    const { data } = await supabase
      .from('beats')
      .select('id')
      .eq('chapter_id', chapter_id)
      .eq('beat_type', 'planned');
    const ids = (data ?? []).map((r: any) => r.id);
    if (ids.length === 0) return { updated: 0 };
    return invokeGovernance('mark_validated', ids);
  },

  async remove(id: string) {
    // No service-role delete pathway yet. Allow direct delete only in Demo Mode.
    if (!isDemoMode()) {
      throw new Error('Suppression directe désactivée en Production Test — utiliser “Rejeter”.');
    }
    const { error } = await supabase.from('beats').delete().eq('id', id);
    if (error) throw error;
  },

  async compare(chapter_id: string) {
    const [planned, observed] = await Promise.all([
      this.listForChapter(chapter_id, 'planned'),
      this.listForChapter(chapter_id, 'observed'),
    ]);
    const matches = planned.map((p) => {
      const found = observed.find((o) => (o.title || '').toLowerCase().includes((p.title || '').slice(0, 12).toLowerCase()));
      return { planned: p, observed: found ?? null, coverage: found ? 'covered' : 'missing' };
    });
    const matchedIds = new Set(matches.map((m) => m.observed?.id).filter(Boolean));
    const unplanned = observed.filter((o) => !matchedIds.has(o.id));
    return { matches, unplanned, planned_count: planned.length, observed_count: observed.length };
  },
};
