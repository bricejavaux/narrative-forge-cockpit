// deno-lint-ignore-file
// run-execute — single persistent entrypoint for technical runs.
// Creates a `runs` row, optionally invokes openai-agent-run, persists
// `run_outputs`, `audit_findings`, `rewrite_tasks`. Never auto-applies.
import { corsHeaders, json } from '../_shared/cors.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.4';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

type RunType =
  | 'openai_connection_test'
  | 'structure_text_note'
  | 'run_selected_agent'
  | 'audit_chapter_plan'
  | 'audit_planned_beats'
  | 'diagnostic_tome_live'
  | 'export_test';

const FUTURE_RUN_TYPES = new Set([
  'generate_chapter_draft',
  'extract_observed_beats',
  'audit_chapter_vs_beats',
  'targeted_rewrite',
  'pgvector_retrieval',
  'autonomous_rewrite',
]);

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  try {
    const body = await req.json().catch(() => ({}));
    const run_type = String(body?.run_type ?? '') as RunType;
    if (!run_type) return json({ error: 'run_type required' }, 400);
    if (FUTURE_RUN_TYPES.has(run_type)) {
      return json({ error: 'run_type_not_available_yet', run_type, reason: 'Future run type — disabled in this iteration.' }, 400);
    }

    const supa = createClient(SUPABASE_URL, SERVICE_KEY, { auth: { persistSession: false } });
    const started = new Date().toISOString();

    const { agent_id = null, target_type = null, target_id = null, scope = null, mode = 'live', model = null, payload = {}, instruction = null } = body ?? {};

    // 1. create run row (status=running)
    const { data: runRow, error: runErr } = await supa.from('runs').insert({
      name: `${run_type}${agent_id ? ` · agent:${agent_id}` : ''}${target_id ? ` · ${target_type}:${String(target_id).slice(0, 8)}` : ''}`,
      mode,
      status: 'running',
      started_at: started,
      payload: { run_type, agent_id, target_type, target_id, scope, model, instruction, payload },
    }).select('id').single();
    if (runErr) return json({ error: `runs_insert_failed: ${runErr.message}` }, 500);
    const run_id = runRow.id;

    // helper to finalize a run
    const finalize = async (status: 'completed' | 'failed', result: any, findingsCount = 0) => {
      const finished = new Date().toISOString();
      const dur = Date.parse(finished) - Date.parse(started);
      await supa.from('runs').update({
        status, finished_at: finished, duration: `${dur}ms`, findings: findingsCount, result,
      }).eq('id', run_id);
    };

    try {
      // 2. dispatch
      if (run_type === 'openai_connection_test') {
        const r = await fetch(`${SUPABASE_URL}/functions/v1/openai-agent-run`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${SERVICE_KEY}`, apikey: SERVICE_KEY },
          body: JSON.stringify({ instruction: 'Connection test. Reply { "status": "ok" }.', payload: {} }),
        });
        const data = await r.json();
        await supa.from('run_outputs').insert({ run_id, kind: 'connection_test', payload: data });
        await finalize(data?.mode === 'live' ? 'completed' : 'failed', data);
        return json({ run_id, ...data });
      }

      if (run_type === 'structure_text_note') {
        const r = await fetch(`${SUPABASE_URL}/functions/v1/openai-structure-note`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${SERVICE_KEY}`, apikey: SERVICE_KEY },
          body: JSON.stringify({ raw_text: payload?.raw_text ?? instruction ?? '', model }),
        });
        const data = await r.json();
        await supa.from('run_outputs').insert({ run_id, kind: 'structured_note', payload: data });
        await finalize(data?.error ? 'failed' : 'completed', data);
        return json({ run_id, ...data });
      }

      if (run_type === 'audit_chapter_plan') {
        const r = await fetch(`${SUPABASE_URL}/functions/v1/audit-plan`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${SERVICE_KEY}`, apikey: SERVICE_KEY },
          body: JSON.stringify({ model }),
        });
        const data = await r.json();
        await supa.from('run_outputs').insert({ run_id, kind: 'audit_plan', payload: data });
        const findings = Array.isArray(data?.findings) ? data.findings : [];
        for (const f of findings) {
          await supa.from('audit_findings').insert({
            run_id, target_type: 'tome', title: String(f?.title ?? 'Finding'),
            severity: f?.severity ?? 'info', detail: f?.note ?? f?.detail ?? null,
            recommendation: f?.recommendation ?? null, status: 'open',
          });
        }
        await finalize(data?.error ? 'failed' : 'completed', data, findings.length);
        return json({ run_id, ...data });
      }

      if (run_type === 'audit_planned_beats' || run_type === 'diagnostic_tome_live' || run_type === 'run_selected_agent') {
        // generic agent run path
        const r = await fetch(`${SUPABASE_URL}/functions/v1/openai-agent-run`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${SERVICE_KEY}`, apikey: SERVICE_KEY },
          body: JSON.stringify({ agent_id, model, instruction, payload, retrieval_query: instruction }),
        });
        const data = await r.json();
        await supa.from('run_outputs').insert({ run_id, kind: 'agent_run', payload: data });

        const findings = Array.isArray(data?.findings) ? data.findings : [];
        for (const f of findings) {
          await supa.from('audit_findings').insert({
            run_id, agent_id: typeof agent_id === 'string' && agent_id.length === 36 ? agent_id : null,
            target_type: target_type ?? null, target_id: target_id ?? null,
            title: String(f?.title ?? 'Finding'), severity: f?.severity ?? 'info',
            detail: f?.note ?? f?.detail ?? null, recommendation: f?.recommendation ?? null,
            status: 'open',
          });
        }
        const tasks = Array.isArray(data?.rewrite_tasks) ? data.rewrite_tasks : [];
        for (const t of tasks) {
          await supa.from('rewrite_tasks').insert({
            target_type: t?.target_type ?? target_type ?? 'chapter',
            target_id: t?.target_id ?? target_id ?? null,
            title: String(t?.title ?? t?.instruction ?? 'Rewrite').slice(0, 200),
            instruction: t?.instruction ?? null,
            proposal: t?.proposal ?? null,
            status: 'pending',
            requires_validation: true,
            created_by_agent: typeof agent_id === 'string' ? agent_id : null,
          });
        }

        const failed = !!data?.error || data?.mode === 'mock';
        await finalize(failed ? 'failed' : 'completed', data, findings.length);
        return json({ run_id, ...data });
      }

      if (run_type === 'export_test') {
        const r = await fetch(`${SUPABASE_URL}/functions/v1/export-text`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${SERVICE_KEY}`, apikey: SERVICE_KEY },
          body: JSON.stringify(payload ?? {}),
        });
        const data = await r.json();
        await supa.from('run_outputs').insert({ run_id, kind: 'export_test', payload: data });
        await finalize(data?.error ? 'failed' : 'completed', data);
        return json({ run_id, ...data });
      }

      await finalize('failed', { error: `unknown_run_type:${run_type}` });
      return json({ run_id, error: 'unknown_run_type' }, 400);
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'unknown';
      await finalize('failed', { error: msg });
      return json({ run_id, error: msg }, 500);
    }
  } catch (e) {
    return json({ error: e instanceof Error ? e.message : 'unknown' }, 500);
  }
});
