import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';
import { corsHeaders, json } from '../_shared/cors.ts';
import { callOpenAI, hasOpenAIKey } from '../_shared/openai.ts';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  try {
    const body = await req.json();
    const { chapter_id, model, run_id } = body ?? {};
    const caller_run_id: string | null = run_id ?? null;
    if (!chapter_id) return json({ error: 'chapter_id required' }, 400);

    const supabase = createClient(SUPABASE_URL, SERVICE_KEY);
    const { data: chapter } = await supabase.from('chapters').select('id,number,title,locked,full_text').eq('id', chapter_id).maybeSingle();
    if (!chapter) return json({ error: 'chapter not found' }, 404);
    if ((chapter as any).locked) {
      return json({ error: 'Chapitre verrouillé : déverrouiller avant régénération.', blocked: true, locked: true }, 409);
    }


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

    // === Vector context injection (best-effort) ===
    // Build a compact query from chapter + top beat objectives, search active indexes via vector-search.
    let vectorContextUsed = false;
    let vectorChunks: any[] = [];
    let vectorIndexesActive: string[] = [];
    let vectorIndexesPending: string[] = [];
    try {
      const query = [
        (chapter as any).title ?? '',
        ...(beats ?? []).slice(0, 6).map((b: any) => `${b.title ?? ''}: ${b.objective ?? ''}`),
      ].filter(Boolean).join('\n').slice(0, 2000);

      const { data: indexes } = await supabase.from('vector_indexes').select('name,status').limit(20);
      const candidateIndexes = (indexes ?? []).map((i: any) => i.name).filter(Boolean);

      for (const indexName of candidateIndexes) {
        const res = await fetch(`${SUPABASE_URL}/functions/v1/vector-search`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${SERVICE_KEY}` },
          body: JSON.stringify({ query, index_name: indexName, top_k: 5, min_similarity: 0.25, run_id: caller_run_id }),
        });
        if (!res.ok) continue;
        const j = await res.json();
        if (j?.mode === 'live' && Array.isArray(j.retrieved_chunks) && j.retrieved_chunks.length > 0) {
          vectorContextUsed = true;
          vectorIndexesActive.push(indexName);
          for (const c of j.retrieved_chunks) vectorChunks.push({ index: indexName, source: c.source_title, text: String(c.chunk_text ?? '').slice(0, 600) });
        } else if (j?.mode === 'pending_pgvector') {
          vectorIndexesPending.push(indexName);
        }
      }
    } catch (_) { /* non-fatal */ }

    const contextBlock = vectorContextUsed
      ? `\n\nContexte vectoriel (extraits validés):\n${vectorChunks.map((c, i) => `[${i + 1}] (${c.index} · ${c.source ?? '?'}) ${c.text}`).join('\n')}`
      : '';

    const prompt = `Génère le texte du chapitre à partir des beats prévus validés et du canon.
Respecte l'ordre des beats. Style: roman.
Beats: ${JSON.stringify(beats ?? [])}
Canon: ${JSON.stringify(canon ?? [])}${contextBlock}`;

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
      inputs: { planned_beats: total, canon_sample: canon?.length ?? 0, vector_context_used: vectorContextUsed, vector_indexes_active: vectorIndexesActive, vector_indexes_pending: vectorIndexesPending, vector_chunk_count: vectorChunks.length },
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

    const word_count = (ai.text ?? '').split(/\s+/).filter(Boolean).length;
    const preview = (ai.text ?? '').slice(0, 600);

    // Best-effort: write a run_output entry if invoked from a tracked run.
    if (caller_run_id) {
      await supabase.from('run_outputs').insert({
        run_id: caller_run_id,
        output_type: 'chapter_generation',
        payload: {
          chapter_id, version: nextVersion, version_id: ver.id,
          model: ai.model, word_count,
          beats_total: total, beats_validated: validated,
          vector_context_used: false,
          full_text_preview: preview,
        },
      }).then(() => {}, () => {});
      await supabase.from('runs').update({ status: 'success', completed_at: new Date().toISOString() } as any).eq('id', caller_run_id).then(() => {}, () => {});
    }

    return json({
      ok: true,
      version: nextVersion,
      version_id: ver.id,
      model: ai.model,
      chapter_id,
      word_count,
      full_text_preview: preview,
      run_id: caller_run_id,
      beats_total: total,
      beats_validated: validated,
      vector_context_used: false,
    });
  } catch (e) {
    return json({ error: e instanceof Error ? e.message : 'unknown' }, 500);
  }
});
