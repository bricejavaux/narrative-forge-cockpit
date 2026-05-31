// deno-lint-ignore-file
// Phase 2B — Persist human-validated planned beats for one chapter.
// Upsert by (chapter_id, beat_number, beat_type='planned'). Service role.
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';
import { corsHeaders, json } from '../_shared/cors.ts';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  try {
    const body = await req.json().catch(() => ({}));
    const chapter_id: string = body?.chapter_id;
    const beats: any[] = Array.isArray(body?.beats) ? body.beats : [];
    const validation: string = body?.validation ?? 'human_confirmed';
    const model: string | null = body?.model ?? null;
    const strategy: 'replace' | 'merge' | 'append' =
      body?.strategy === 'replace' || body?.strategy === 'append' ? body.strategy : 'merge';

    if (!chapter_id) return json({ error: 'chapter_id required' }, 400);
    if (beats.length === 0) return json({ error: 'beats required' }, 400);
    if (validation !== 'human_confirmed') return json({ error: 'validation must be human_confirmed' }, 400);

    const supabase = createClient(SUPABASE_URL, SERVICE_KEY);
    const { data: chapter } = await supabase
      .from('chapters')
      .select('id,tome_id,number')
      .eq('id', chapter_id)
      .maybeSingle();
    if (!chapter) return json({ error: 'chapter_not_found' }, 404);

    const now = new Date().toISOString();
    let inserted = 0;
    let updated = 0;
    let soft_deleted = 0;
    const errors: Array<{ beat_number: number; error: string }> = [];
    const samples: any[] = [];

    if (strategy === 'replace') {
      const { data: existing } = await supabase
        .from('beats').select('id')
        .eq('chapter_id', chapter_id).eq('beat_type', 'planned').neq('status', 'deleted');
      const ids = (existing ?? []).map((r: any) => r.id);
      if (ids.length > 0) {
        const { error } = await supabase.from('beats')
          .update({ status: 'deleted', validation_status: 'rejected', updated_at: now })
          .in('id', ids);
        if (!error) soft_deleted = ids.length;
      }
    }

    let numberOffset = 0;
    if (strategy === 'append') {
      const { data: maxRow } = await supabase
        .from('beats').select('beat_number')
        .eq('chapter_id', chapter_id).eq('beat_type', 'planned').neq('status', 'deleted')
        .order('beat_number', { ascending: false }).limit(1).maybeSingle();
      numberOffset = Number((maxRow as any)?.beat_number ?? 0);
    }

    for (let i = 0; i < beats.length; i++) {
      const b = beats[i] ?? {};
      const beat_number = Number(b.beat_number ?? b.order ?? i + 1);
      const row: Record<string, any> = {
        chapter_id,
        tome_id: chapter.tome_id ?? null,
        beat_number,
        beat_type: 'planned',
        order_index: beat_number,
        title: String(b.title ?? `Beat ${beat_number}`),
        objective: b.objective ?? null,
        narrative_function: b.narrative_function ?? null,
        decision_made: b.decision_made ?? null,
        consequence: b.consequence ?? null,
        revelation: b.revelation ?? null,
        payoff: b.payoff ?? null,
        required_detail: b.required_detail ?? null,
        characters: Array.isArray(b.characters) ? b.characters : [],
        arcs: Array.isArray(b.arcs) ? b.arcs : [],
        canon_links: Array.isArray(b.canon_links) ? b.canon_links : [],
        tension_start: b.tension_start ?? null,
        tension_end: b.tension_end ?? null,
        scientific_density: b.scientific_density ?? null,
        emotional_density: b.emotional_density ?? null,
        status: 'planned',
        validation_status: 'needs_review',
        source: 'beats-preview',
        metadata: {
          model,
          generated_at: now,
          risk_flags: Array.isArray(b.risk_flags) ? b.risk_flags : [],
        },
        updated_at: now,
      };

      try {
        const { data: existing } = await supabase
          .from('beats')
          .select('id')
          .eq('chapter_id', chapter_id)
          .eq('beat_number', beat_number)
          .eq('beat_type', 'planned')
          .maybeSingle();

        if (existing?.id) {
          const { error } = await supabase.from('beats').update(row).eq('id', existing.id);
          if (error) errors.push({ beat_number, error: error.message });
          else { updated++; if (samples.length < 3) samples.push({ id: existing.id, beat_number, title: row.title }); }
        } else {
          const { data, error } = await supabase.from('beats').insert(row).select('id').maybeSingle();
          if (error) errors.push({ beat_number, error: error.message });
          else { inserted++; if (samples.length < 3) samples.push({ id: data?.id, beat_number, title: row.title }); }
        }
      } catch (e) {
        errors.push({ beat_number, error: e instanceof Error ? e.message : 'unknown' });
      }
    }

    const { count: visible } = await supabase
      .from('beats')
      .select('id', { count: 'exact', head: true })
      .eq('chapter_id', chapter_id)
      .eq('beat_type', 'planned');

    try {
      await supabase.from('production_events').insert({
        event_type: 'planned_beats_persisted',
        object_type: 'chapter',
        object_id: chapter_id,
        event_summary: `Planned beats persist: +${inserted} / ~${updated} (errors=${errors.length})`,
        metadata: { model, validation, total: beats.length },
      });
    } catch { /* events optional */ }

    return json({
      mode: 'live',
      chapter_id,
      inserted,
      updated,
      skipped: 0,
      errors,
      service_role_visible_count: visible ?? null,
      sample: samples,
    });
  } catch (e) {
    return json({ error: e instanceof Error ? e.message : 'unknown' }, 500);
  }
});
