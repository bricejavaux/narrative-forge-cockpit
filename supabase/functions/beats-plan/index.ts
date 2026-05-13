import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';
import { corsHeaders, json } from '../_shared/cors.ts';
import { callOpenAI, hasOpenAIKey } from '../_shared/openai.ts';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  try {
    const { chapter_id, model } = await req.json();
    if (!chapter_id) return json({ error: 'chapter_id required' }, 400);
    if (!hasOpenAIKey()) return json({ error: 'OPENAI_API_KEY missing', degraded: true }, 200);

    const supabase = createClient(SUPABASE_URL, SERVICE_KEY);
    const { data: chapter } = await supabase.from('chapters').select('id,number,title,main_arc,linked_character_ids,arc_ids').eq('id', chapter_id).maybeSingle();
    if (!chapter) return json({ error: 'chapter not found' }, 404);

    const { data: canon } = await supabase.from('canon_objects').select('title,summary,description,criticality').limit(20);

    const prompt = `Tu es un agent de planification narrative. À partir du chapitre et du canon ci-dessous, propose 5 à 8 beats prévus structurés.
Pour chaque beat, fournis: title, objective, narrative_function, decision_made, consequence, revelation, payoff, tension_start (0-100), tension_end (0-100), scientific_density (0-100), emotional_density (0-100).
Réponds UNIQUEMENT en JSON: {"beats":[...]}.

Chapitre: ${JSON.stringify(chapter)}
Canon (échantillon): ${JSON.stringify(canon ?? [])}`;

    const ai = await callOpenAI({ user: prompt, json: true, model, temperature: 0.4, maxOutputTokens: 2000 });
    if (!ai.ok) return json({ error: ai.error, degraded: true }, 200);
    const beats = ((ai.parsed as any)?.beats ?? []) as any[];

    const rows = beats.map((b, i) => ({
      chapter_id,
      beat_number: i + 1,
      beat_type: 'planned',
      source: 'openai',
      status: 'draft',
      validation_status: 'pending',
      title: b.title ?? `Beat ${i + 1}`,
      objective: b.objective ?? null,
      narrative_function: b.narrative_function ?? null,
      decision_made: b.decision_made ?? null,
      consequence: b.consequence ?? null,
      revelation: b.revelation ?? null,
      payoff: b.payoff ?? null,
      tension_start: b.tension_start ?? null,
      tension_end: b.tension_end ?? null,
      scientific_density: b.scientific_density ?? null,
      emotional_density: b.emotional_density ?? null,
    }));
    const { data: inserted, error } = await supabase.from('beats').insert(rows).select();
    if (error) return json({ error: error.message }, 500);

    await supabase.from('production_events').insert({
      event_type: 'planned_beats_generated',
      object_type: 'chapter',
      object_id: chapter_id,
      event_summary: `Generated ${inserted?.length ?? 0} planned beats via OpenAI`,
      metadata: { model: ai.model },
    });

    return json({ ok: true, count: inserted?.length ?? 0, beats: inserted, model: ai.model });
  } catch (e) {
    return json({ error: e instanceof Error ? e.message : 'unknown' }, 500);
  }
});
