// deno-lint-ignore-file
// Phase 2B — Generate planned beats for one chapter (NO persist).
// Returns structured beats from OpenAI for human review before persistence.
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';
import { corsHeaders, json } from '../_shared/cors.ts';
import { callOpenAI, hasOpenAIKey } from '../_shared/openai.ts';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

const SCHEMA = `Réponds STRICTEMENT en JSON:
{"beats":[{"beat_number":number,"title":string,"objective":string,"narrative_function":string,"characters":[string],"arcs":[string],"canon_links":[string],"tension_start":number,"tension_end":number,"scientific_density":number,"emotional_density":number,"decision_made":string,"consequence":string,"revelation":string,"payoff":string,"required_detail":string,"risk_flags":[string]}],"warnings":[string]}`;

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  try {
    const body = await req.json().catch(() => ({}));
    const chapter_id: string = body?.chapter_id;
    const model: string | undefined = body?.model;
    const beat_count_target: number = Number(body?.beat_count_target) || 6;
    const constraints: string = body?.constraints ?? '';

    if (!chapter_id) return json({ error: 'chapter_id required' }, 400);
    if (!hasOpenAIKey()) return json({ mode: 'degraded', error: 'OPENAI_API_KEY missing' }, 200);

    const supabase = createClient(SUPABASE_URL, SERVICE_KEY);
    const { data: chapter, error: chErr } = await supabase
      .from('chapters')
      .select('id,number,title,scale,main_arc,cost_type,technical_detail,phrase_couteau,arc_ids,linked_character_ids,metadata')
      .eq('id', chapter_id)
      .maybeSingle();
    if (chErr) return json({ error: chErr.message }, 500);
    if (!chapter) return json({ error: 'chapter_not_found' }, 404);

    const [{ data: allChapters }, { data: canon }, { data: characters }, { data: existing }] = await Promise.all([
      supabase.from('chapters').select('number,title,scale,main_arc').order('number', { ascending: true }).limit(60),
      supabase.from('canon_objects').select('title,category,summary,criticality').limit(40),
      supabase.from('characters').select('name,role,function,apparent_goal,real_goal').limit(40),
      supabase.from('beats').select('beat_number,title').eq('chapter_id', chapter_id).eq('beat_type', 'planned'),
    ]);

    const prompt = `Tu planifies les beats prévus pour UN chapitre du roman "Les Portes du Monde, Tome I".
Génère ~${beat_count_target} beats qui font avancer le récit : décision, conséquence, révélation, payoff.
Évite l'exposition pure. Respecte la phrase-couteau et l'arc principal du chapitre.
${constraints ? `Contraintes : ${constraints}` : ''}
${SCHEMA}

CHAPITRE CIBLE:
${JSON.stringify(chapter)}

PLAN GLOBAL (échantillon):
${JSON.stringify(allChapters ?? [])}

CANON (échantillon):
${JSON.stringify(canon ?? [])}

PERSONNAGES (échantillon):
${JSON.stringify(characters ?? [])}

BEATS DÉJÀ PERSISTÉS (à ne pas dupliquer):
${JSON.stringify(existing ?? [])}`;

    const ai = await callOpenAI({
      user: prompt,
      json: true,
      model,
      temperature: 0.4,
      maxOutputTokens: 4000,
    });
    if (!ai.ok) return json({ mode: 'degraded', error: ai.error, raw: (ai.text ?? '').slice(0, 1500) }, 200);

    const beats = ((ai.parsed as any)?.beats ?? []) as any[];
    const warnings = ((ai.parsed as any)?.warnings ?? []) as string[];

    return json({
      mode: 'live',
      model: ai.model,
      chapter_id,
      chapter_title: chapter.title,
      count: beats.length,
      beats,
      warnings,
      existing_count: existing?.length ?? 0,
    });
  } catch (e) {
    return json({ error: e instanceof Error ? e.message : 'unknown' }, 500);
  }
});
