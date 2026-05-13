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

    const supabase = createClient(SUPABASE_URL, SERVICE_KEY);
    const { data: chapter } = await supabase.from('chapters').select('id,number,title').eq('id', chapter_id).maybeSingle();
    if (!chapter) return json({ error: 'chapter not found' }, 404);

    // GATE: validated planned beats required
    const { data: planned } = await supabase.from('beats').select('id,validation_status').eq('chapter_id', chapter_id).eq('beat_type', 'planned');
    const total = planned?.length ?? 0;
    const validated = (planned ?? []).filter((b: any) => b.validation_status === 'validated').length;
    if (total === 0 || validated < total) {
      return json({
        error: 'Génération bloquée : les beats prévus doivent être validés.',
        blocked: true,
        planned_total: total,
        planned_validated: validated,
      }, 422);
    }
    if (!hasOpenAIKey()) return json({ error: 'OPENAI_API_KEY missing', degraded: true }, 200);

    const { data: beats } = await supabase.from('beats').select('*').eq('chapter_id', chapter_id).eq('beat_type', 'planned').order('beat_number');
    const { data: canon } = await supabase.from('canon_objects').select('title,summary,description').limit(15);

    const prompt = `Génère le texte du chapitre à partir des beats prévus validés et du canon.
Respecte l'ordre des beats. Style: roman.
Beats: ${JSON.stringify(beats ?? [])}
Canon: ${JSON.stringify(canon ?? [])}`;

    const ai = await callOpenAI({ user: prompt, model, temperature: 0.7, maxOutputTokens: 4000 });
    if (!ai.ok) return json({ error: ai.error, degraded: true }, 200);

    // New chapter version
    const { data: existing } = await supabase.from('chapter_versions').select('version').eq('chapter_id', chapter_id).order('version', { ascending: false }).limit(1);
    const nextVersion = (existing?.[0]?.version ?? 0) + 1;

    const { data: ver, error: verErr } = await supabase.from('chapter_versions').insert({
      chapter_id,
      version: nextVersion,
      full_text: ai.text ?? '',
      model: ai.model,
      generation_log: 'Generated from validated planned beats (OpenAI).',
      inputs: { planned_beats: total, canon_sample: canon?.length ?? 0 },
      planned_beat_coverage: 1.0,
      warnings: [],
    }).select().single();
    if (verErr) return json({ error: verErr.message }, 500);

    await supabase.from('chapters').update({ full_text: ai.text ?? '', active_version: nextVersion, production_status: 'generated' } as any).eq('id', chapter_id);

    await supabase.from('production_events').insert({
      event_type: 'chapter_generated',
      object_type: 'chapter',
      object_id: chapter_id,
      event_summary: `Generated chapter v${nextVersion}`,
      new_status: 'generated',
      metadata: { model: ai.model, version: nextVersion },
    });

    return json({ ok: true, version: nextVersion, version_id: ver.id, model: ai.model });
  } catch (e) {
    return json({ error: e instanceof Error ? e.message : 'unknown' }, 500);
  }
});
