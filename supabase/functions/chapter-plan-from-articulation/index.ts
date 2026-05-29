// deno-lint-ignore-file
// Phase 2A — Build chapter plan from articulation.txt using OpenAI structured extraction.
// Service role write. Preview = no persist. Persist = upsert by (tome_id|null, number).

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';
import { corsHeaders, hasOneDrive, json } from '../_shared/cors.ts';
import { downloadText } from '../_shared/onedrive.ts';
import { callOpenAI, hasOpenAIKey } from '../_shared/openai.ts';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const PATH = 'Documents/Projet Roman/Les_Arches/01_sources/articulation.txt';

const SCHEMA = `Réponds STRICTEMENT en JSON :
{"chapters":[{"number":number,"title":string,"scale":"macro"|"micro"|"mixte","main_arc":string,"cost_type":string,"technical_detail":string,"phrase_couteau":string,"summary":string}]}`;

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  try {
    const body = await req.json().catch(() => ({}));
    const persist: boolean = body?.persist === true;
    const tome_id: string | null = body?.tome_id ?? null;
    const project_id: string | null = body?.project_id ?? null;

    if (!hasOneDrive() || !hasOpenAIKey()) {
      return json({ mode: 'degraded', error: 'OneDrive or OpenAI not configured' }, 200);
    }

    const dl = await downloadText(PATH);
    if (!dl.ok) return json({ mode: 'degraded', error: dl.error ?? 'download_failed', status: dl.status }, 200);
    const text = (dl.text ?? '').slice(0, 100000);

    const ai = await callOpenAI({
      system: `Tu extrais le plan des chapitres du roman "Les Portes du Monde, Tome I" depuis le document articulation. ${SCHEMA}`,
      user: text,
      json: true,
      temperature: 0.2,
      maxOutputTokens: 4000,
    });
    if (!ai.ok) return json({ mode: 'degraded', error: ai.error, raw: (ai.text ?? '').slice(0, 2000) }, 200);

    const chapters = ((ai.parsed as any)?.chapters ?? []) as any[];
    const normalized = chapters
      .filter((c) => c && (c.number ?? null) !== null && c.title)
      .map((c) => ({
        tome_id,
        external_id: tome_id ? `${tome_id}:${c.number}` : `articulation:${c.number}`,
        number: Number(c.number),
        title: String(c.title),
        scale: c.scale ?? null,
        main_arc: c.main_arc ?? null,
        cost_type: c.cost_type ?? null,
        technical_detail: c.technical_detail ?? null,
        phrase_couteau: c.phrase_couteau ?? null,
        status: 'draft',
        production_status: 'architecture_planned',
        metadata: { source: 'articulation.txt', summary: c.summary ?? null, imported_at: new Date().toISOString() },
      }));

    if (!persist) {
      return json({ mode: 'preview', model: ai.model, count: normalized.length, chapters: normalized });
    }

    const supabase = createClient(SUPABASE_URL, SERVICE_KEY);
    let inserted = 0;
    let updated = 0;
    const errors: string[] = [];
    for (const row of normalized) {
      const { data: existing } = await supabase
        .from('chapters')
        .select('id')
        .eq('external_id', row.external_id)
        .maybeSingle();
      if (existing?.id) {
        const { error } = await supabase.from('chapters').update(row).eq('id', existing.id);
        if (error) errors.push(`update ${row.number}: ${error.message}`);
        else updated++;
      } else {
        const { error } = await supabase.from('chapters').insert(row);
        if (error) errors.push(`insert ${row.number}: ${error.message}`);
        else inserted++;
      }
    }

    await supabase.from('production_events').insert({
      event_type: 'chapter_plan_imported',
      object_type: 'tome',
      object_id: tome_id,
      project_id,
      event_summary: `Chapter plan from articulation.txt: +${inserted} / ~${updated}`,
      metadata: { model: ai.model, total: normalized.length, errors: errors.slice(0, 5) },
    });

    return json({ mode: 'live', model: ai.model, count: normalized.length, inserted, updated, errors });
  } catch (e) {
    return json({ error: e instanceof Error ? e.message : 'unknown' }, 500);
  }
});
