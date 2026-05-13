import { supabase } from '@/integrations/supabase/client';

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

export const beatsService = {
  async listForChapter(chapter_id: string, beat_type?: 'planned' | 'observed' | 'revised'): Promise<Beat[]> {
    let q = supabase.from('beats').select('*').eq('chapter_id', chapter_id).order('beat_number', { ascending: true });
    if (beat_type) q = q.eq('beat_type', beat_type);
    const { data } = await q;
    return (data ?? []) as Beat[];
  },

  async create(row: Partial<Beat>) {
    const { data, error } = await supabase.from('beats').insert({ beat_type: 'planned', source: 'human', status: 'draft', validation_status: 'pending', ...row } as any).select().single();
    if (error) throw error;
    return data as Beat;
  },

  async update(id: string, patch: Partial<Beat>) {
    const { error } = await supabase.from('beats').update(patch as any).eq('id', id);
    if (error) throw error;
  },

  async validate(id: string) {
    return this.update(id, { validation_status: 'validated', status: 'validated' } as any);
  },

  async validateAllForChapter(chapter_id: string) {
    const { error } = await supabase.from('beats').update({ validation_status: 'validated', status: 'validated' } as any).eq('chapter_id', chapter_id).eq('beat_type', 'planned');
    if (error) throw error;
  },

  async remove(id: string) {
    const { error } = await supabase.from('beats').delete().eq('id', id);
    if (error) throw error;
  },

  /** Compare planned vs observed beats for a chapter (basic heuristic). */
  async compare(chapter_id: string) {
    const [planned, observed] = await Promise.all([
      this.listForChapter(chapter_id, 'planned'),
      this.listForChapter(chapter_id, 'observed'),
    ]);
    const matches = planned.map((p) => {
      const found = observed.find((o) => (o.title || '').toLowerCase().includes((p.title || '').slice(0, 12).toLowerCase()));
      return {
        planned: p,
        observed: found ?? null,
        coverage: found ? 'covered' : 'missing',
      };
    });
    const matchedIds = new Set(matches.map((m) => m.observed?.id).filter(Boolean));
    const unplanned = observed.filter((o) => !matchedIds.has(o.id));
    return { matches, unplanned, planned_count: planned.length, observed_count: observed.length };
  },
};
