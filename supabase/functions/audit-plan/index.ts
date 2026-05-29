// deno-lint-ignore-file
// Phase 2B — Non-vector audits running on Supabase data only.
// Audit modes:
//   - audit_chapter_plan
//   - audit_beats_plan (requires chapter_id)
//   - audit_macro_micro_balance
//   - audit_arc_distribution
// Returns findings. Does NOT mutate any record.
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';
import { corsHeaders, json } from '../_shared/cors.ts';
import { callOpenAI, hasOpenAIKey } from '../_shared/openai.ts';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

type AuditMode =
  | 'audit_chapter_plan'
  | 'audit_beats_plan'
  | 'audit_macro_micro_balance'
  | 'audit_arc_distribution';

const SCHEMA = `Réponds STRICTEMENT en JSON:
{"findings":[{"severity":"info"|"warning"|"critical","title":string,"detail":string,"target":string,"suggested_fix":string}],"summary":string}`;

const PROMPTS: Record<AuditMode, string> = {
  audit_chapter_plan:
    "Audite le PLAN DES CHAPITRES: cohérence des titres, alternance micro/macro, escalade narrative, distribution des arcs, conséquences manquantes. Ne propose AUCUNE réécriture automatique, seulement des findings.",
  audit_beats_plan:
    "Audite les BEATS PRÉVUS du chapitre sélectionné: chaque beat doit faire avancer décision/conséquence/révélation/payoff. Détecte exposition pure, surcharge, progression de tension incohérente, références canon douteuses.",
  audit_macro_micro_balance:
    "Audite l'équilibre macro/micro sur l'ensemble du plan chapitres et beats prévus. Détecte les zones de sur-concentration ou de vide.",
  audit_arc_distribution:
    "Audite la distribution des arcs sur les chapitres. Détecte les arcs absents trop longtemps, les payoffs trop éloignés, les arcs surreprésentés.",
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  try {
    const body = await req.json().catch(() => ({}));
    const mode: AuditMode = body?.mode;
    const chapter_id: string | undefined = body?.chapter_id;
    const model: string | undefined = body?.model;

    if (!PROMPTS[mode]) return json({ error: 'invalid mode' }, 400);
    if (!hasOpenAIKey()) return json({ mode: 'degraded', error: 'OPENAI_API_KEY missing' }, 200);

    const supabase = createClient(SUPABASE_URL, SERVICE_KEY);

    const [{ data: chapters }, { data: canon }, { data: characters }] = await Promise.all([
      supabase.from('chapters').select('id,number,title,scale,main_arc,cost_type,phrase_couteau,arc_ids,production_status').order('number', { ascending: true }),
      supabase.from('canon_objects').select('title,category,criticality,summary').limit(50),
      supabase.from('characters').select('name,role,function,apparent_goal,real_goal').limit(50),
    ]);

    let scoped_beats: any[] | null = null;
    let target_chapter: any = null;
    if (mode === 'audit_beats_plan') {
      if (!chapter_id) return json({ error: 'chapter_id required for audit_beats_plan' }, 400);
      target_chapter = (chapters ?? []).find((c: any) => c.id === chapter_id) ?? null;
      const { data: bts } = await supabase
        .from('beats')
        .select('beat_number,title,objective,narrative_function,decision_made,consequence,revelation,payoff,tension_start,tension_end,canon_links,characters,validation_status,status')
        .eq('chapter_id', chapter_id)
        .eq('beat_type', 'planned')
        .order('beat_number', { ascending: true });
      scoped_beats = bts ?? [];
    }

    let beats_overview: any[] | null = null;
    if (mode === 'audit_macro_micro_balance' || mode === 'audit_arc_distribution') {
      const { data: bts } = await supabase
        .from('beats')
        .select('chapter_id,beat_number,title,tension_start,tension_end')
        .eq('beat_type', 'planned')
        .limit(500);
      beats_overview = bts ?? [];
    }

    const prompt = `${PROMPTS[mode]}
${SCHEMA}

CHAPITRES (${chapters?.length ?? 0}):
${JSON.stringify(chapters ?? [])}

CANON (échantillon, ${canon?.length ?? 0}):
${JSON.stringify(canon ?? [])}

PERSONNAGES (échantillon, ${characters?.length ?? 0}):
${JSON.stringify(characters ?? [])}
${target_chapter ? `\nCHAPITRE CIBLE:\n${JSON.stringify(target_chapter)}` : ''}
${scoped_beats ? `\nBEATS PRÉVUS (${scoped_beats.length}):\n${JSON.stringify(scoped_beats)}` : ''}
${beats_overview ? `\nBEATS GLOBAUX (${beats_overview.length}):\n${JSON.stringify(beats_overview)}` : ''}`;

    const ai = await callOpenAI({
      user: prompt,
      json: true,
      model,
      temperature: 0.2,
      maxOutputTokens: 3500,
    });
    if (!ai.ok) return json({ mode: 'degraded', error: ai.error, raw: (ai.text ?? '').slice(0, 1500) }, 200);

    const findings = ((ai.parsed as any)?.findings ?? []) as any[];
    const summary = (ai.parsed as any)?.summary ?? null;

    try {
      await supabase.from('production_events').insert({
        event_type: `audit_${mode}`,
        object_type: chapter_id ? 'chapter' : 'tome',
        object_id: chapter_id ?? null,
        event_summary: `Audit ${mode}: ${findings.length} findings`,
        metadata: { model: ai.model, counts: { findings: findings.length } },
      });
    } catch { /* events optional */ }

    return json({
      mode: 'live',
      audit_mode: mode,
      model: ai.model,
      chapter_id: chapter_id ?? null,
      counts: {
        chapters: chapters?.length ?? 0,
        canon: canon?.length ?? 0,
        characters: characters?.length ?? 0,
        beats: scoped_beats?.length ?? beats_overview?.length ?? 0,
      },
      findings,
      summary,
    });
  } catch (e) {
    return json({ error: e instanceof Error ? e.message : 'unknown' }, 500);
  }
});
