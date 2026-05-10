// deno-lint-ignore-file
// Human-validated persistence step. Takes the extracted preview from import-source
// and upserts canon_objects (for articulation) or characters (for personnages).
// Uses the service role key — RLS is bypassed intentionally because this is a
// governance-controlled write path (preview → human approval → persist).
// Idempotent: matches existing rows by lower(title|name) within the project scope.

import { createClient } from 'npm:@supabase/supabase-js@2.45.0';
import { corsHeaders, json } from '../_shared/cors.ts';

type Target = 'articulation' | 'personnages';

const ALLOWED_BUCKETS = ['world_rules', 'constraints', 'failure_modes', 'organizations', 'technologies', 'locations', 'glossary'] as const;

const CRITICALITY = new Set(['critical', 'high', 'medium', 'low']);
const RIGIDITY = new Set(['hard', 'soft']);

function sb() {
  const url = Deno.env.get('SUPABASE_URL');
  const key = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  if (!url || !key) throw new Error('Supabase env missing');
  return createClient(url, key, { auth: { persistSession: false } });
}

function norm(s: unknown): string {
  return String(s ?? '').toLowerCase().trim();
}

async function persistCanon(client: ReturnType<typeof sb>, extracted: any) {
  let inserted = 0;
  let updated = 0;
  let skipped = 0;
  const errors: string[] = [];
  const details: Array<{ category: string; title: string; action: 'insert' | 'update' | 'skip' }> = [];

  // Pull all existing canon (project_id is null in this demo) to dedupe by lower(title)+category
  const { data: existing, error: exErr } = await client
    .from('canon_objects')
    .select('id, title, category')
    .is('project_id', null);
  if (exErr) throw exErr;
  const byKey = new Map<string, string>();
  (existing ?? []).forEach((r: any) => byKey.set(`${norm(r.category)}|${norm(r.title)}`, r.id));

  for (const bucket of ALLOWED_BUCKETS) {
    const items = (extracted?.[bucket] ?? []) as any[];
    for (const it of items) {
      const title = String(it?.title ?? it?.term ?? '').trim();
      if (!title) { skipped++; continue; }
      const summary = String(it?.summary ?? it?.definition ?? '').trim() || null;
      const criticality = CRITICALITY.has(it?.criticality) ? it.criticality : null;
      const rigidity = RIGIDITY.has(it?.rigidity) ? it.rigidity : null;
      const key = `${bucket}|${norm(title)}`;
      const existingId = byKey.get(key);
      try {
        if (existingId) {
          const { error } = await client
            .from('canon_objects')
            .update({
              summary,
              ...(criticality ? { criticality } : {}),
              ...(rigidity ? { rigidity } : {}),
              needs_review: true,
              validation_status: 'pending',
              metadata: { source: 'import-persist', last_import: new Date().toISOString() },
            })
            .eq('id', existingId);
          if (error) throw error;
          updated++;
          details.push({ category: bucket, title, action: 'update' });
        } else {
          const { error } = await client.from('canon_objects').insert({
            title,
            category: bucket,
            summary,
            criticality,
            rigidity,
            status: 'draft',
            validation_status: 'pending',
            needs_review: true,
            metadata: { source: 'import-persist', created_from: 'articulation.txt' },
          });
          if (error) throw error;
          inserted++;
          details.push({ category: bucket, title, action: 'insert' });
        }
      } catch (e) {
        errors.push(`${bucket}/${title}: ${e instanceof Error ? e.message : 'unknown'}`);
      }
    }
  }
  return { inserted, updated, skipped, errors, details };
}

async function persistCharacters(client: ReturnType<typeof sb>, extracted: any) {
  let inserted = 0;
  let updated = 0;
  let skipped = 0;
  const errors: string[] = [];
  const details: Array<{ name: string; action: 'insert' | 'update' | 'skip' }> = [];

  const { data: existing, error: exErr } = await client
    .from('characters')
    .select('id, name')
    .is('project_id', null);
  if (exErr) throw exErr;
  const byName = new Map<string, string>();
  (existing ?? []).forEach((r: any) => byName.set(norm(r.name), r.id));

  const items = (extracted?.characters ?? []) as any[];
  for (const c of items) {
    const name = String(c?.name ?? '').trim();
    if (!name) { skipped++; continue; }
    const payload = {
      role: c?.role ?? null,
      function: c?.function ?? null,
      apparent_goal: c?.apparent_goal ?? null,
      real_goal: c?.real_goal ?? null,
      flaw: c?.flaw ?? null,
      secret: c?.secret ?? null,
      forbidden: c?.forbidden ?? null,
      emotional_trajectory: c?.emotional_trajectory ?? null,
      breaking_point: c?.breaking_point ?? null,
      narrative_weight: typeof c?.narrative_weight === 'number' ? c.narrative_weight : null,
      exposure_level: typeof c?.exposure_level === 'number' ? c.exposure_level : null,
    };
    const existingId = byName.get(norm(name));
    try {
      if (existingId) {
        const { error } = await client
          .from('characters')
          .update({
            ...payload,
            needs_review: true,
            validation_status: 'pending',
            metadata: { source: 'import-persist', last_import: new Date().toISOString() },
          })
          .eq('id', existingId);
        if (error) throw error;
        updated++;
        details.push({ name, action: 'update' });
      } else {
        const { error } = await client.from('characters').insert({
          name,
          ...payload,
          validation_status: 'pending',
          needs_review: true,
          metadata: { source: 'import-persist', created_from: 'personnages.txt' },
        });
        if (error) throw error;
        inserted++;
        details.push({ name, action: 'insert' });
      }
    } catch (e) {
      errors.push(`${name}: ${e instanceof Error ? e.message : 'unknown'}`);
    }
  }
  return { inserted, updated, skipped, errors, details };
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });
  try {
    const body = await req.json().catch(() => ({}));
    const target = body?.target as Target;
    const extracted = body?.extracted;
    const human_validated = body?.human_validated === true;
    if (!target || !extracted) return json({ error: 'target et extracted requis' }, 400);
    if (!human_validated) return json({ error: 'human_validated requis (gouvernance écriture)' }, 400);
    if (target !== 'articulation' && target !== 'personnages') return json({ error: 'target invalide' }, 400);

    const client = sb();
    const started = new Date();

    // Open an import_jobs row for traceability
    const { data: job, error: jobErr } = await client
      .from('import_jobs')
      .insert({
        step: target === 'articulation' ? 'persist_canon' : 'persist_characters',
        status: 'running',
        input: { target, has_extracted: !!extracted },
        started_at: started.toISOString(),
      })
      .select('id')
      .single();
    if (jobErr) return json({ error: jobErr.message }, 500);

    let result;
    try {
      result = target === 'articulation' ? await persistCanon(client, extracted) : await persistCharacters(client, extracted);
    } catch (e) {
      await client.from('import_jobs').update({
        status: 'failed',
        finished_at: new Date().toISOString(),
        error: e instanceof Error ? e.message : 'unknown',
      }).eq('id', job.id);
      return json({ error: e instanceof Error ? e.message : 'persistence_failed' }, 500);
    }

    await client.from('import_jobs').update({
      status: result.errors.length ? 'partial' : 'done',
      finished_at: new Date().toISOString(),
      output: result,
    }).eq('id', job.id);

    await client.from('logs').insert({
      level: result.errors.length ? 'warn' : 'info',
      source: 'import-persist',
      message: `import ${target} ok — ${result.inserted} ajoutés / ${result.updated} mis à jour / ${result.skipped} ignorés`,
      payload: { target, ...result },
    });

    return json({
      mode: 'live',
      target,
      job_id: job.id,
      ...result,
    });
  } catch (e) {
    return json({ error: e instanceof Error ? e.message : 'unknown' }, 500);
  }
});
