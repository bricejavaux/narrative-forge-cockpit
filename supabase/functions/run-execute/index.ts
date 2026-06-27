// deno-lint-ignore-file
// run-execute — single persistent entrypoint for technical runs.
// Always creates a `runs` row, always inserts at least one `run_outputs` row,
// always finalizes (completed | failed). Returns explicit `stage` on error.
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
    if (!run_type) return json({ error: 'run_type required', stage: 'validation' }, 400);
    if (FUTURE_RUN_TYPES.has(run_type)) {
      return json({ error: 'run_type_not_available_yet', stage: 'validation', run_type, reason: 'Future run type — disabled in this iteration.' }, 400);
    }

    const { agent_id: rawAgentId = null, agent_slug = null, target_type = null, target_id = null, scope = null, mode = 'live', model: bodyModel = null, payload = {}, instruction = null } = body ?? {};

    const supa = createClient(SUPABASE_URL, SERVICE_KEY, { auth: { persistSession: false } });
    const started = new Date().toISOString();

    // Resolve agent_id from slug if provided
    let agent_id: string | null = (typeof rawAgentId === 'string' && rawAgentId.length === 36) ? rawAgentId : null;
    let agentRow: any = null;
    if (agent_slug && typeof agent_slug === 'string') {
      const { data: a } = await supa.from('agents').select('*').eq('external_id', agent_slug).maybeSingle();
      if (a) { agent_id = a.id; agentRow = a; }
    } else if (agent_id) {
      const { data: a } = await supa.from('agents').select('*').eq('id', agent_id).maybeSingle();
      agentRow = a;
    }

    // 1. create run row (status=running)
    const { data: runRow, error: runErr } = await supa.from('runs').insert({
      name: `${run_type}${agentRow?.external_id ? ` · ${agentRow.external_id}` : ''}${target_id ? ` · ${target_type}:${String(target_id).slice(0, 8)}` : ''}`,
      mode,
      status: 'running',
      started_at: started,
      payload: { run_type, agent_id, agent_slug: agentRow?.external_id ?? agent_slug ?? null, target_type, target_id, scope, model: bodyModel, instruction, payload },
    }).select('id').single();
    if (runErr) return json({ error: `runs_insert_failed: ${runErr.message}`, stage: 'runs_insert_failed' }, 500);
    const run_id = runRow.id;

    const finalize = async (status: 'completed' | 'failed', result: any, findingsCount = 0) => {
      const finished = new Date().toISOString();
      const dur = Date.parse(finished) - Date.parse(started);
      try {
        await supa.from('runs').update({
          status, finished_at: finished, duration: `${dur}ms`, findings: findingsCount, result,
        }).eq('id', run_id);
      } catch (_) { /* finalize must never throw */ }
    };

    const insertOutput = async (kind: string, payload: any) => {
      try { await supa.from('run_outputs').insert({ run_id, kind, payload }); }
      catch (_) { /* never throw from output insert */ }
    };

    // Resolve model: body override > agent.selected_model > null
    let resolvedModel: string | null = bodyModel ?? agentRow?.selected_model ?? agentRow?.default_model ?? null;

    try {
      // 2. dispatch
      if (run_type === 'openai_connection_test') {
        const r = await fetch(`${SUPABASE_URL}/functions/v1/openai-agent-run`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${SERVICE_KEY}`, apikey: SERVICE_KEY },
          body: JSON.stringify({ instruction: 'Connection test. Reply { "status": "ok" }.', payload: {} }),
        });
        const data = await r.json().catch(() => ({ error: 'invalid_json' }));
        await insertOutput('connection_test', data);
        const ok = data?.mode === 'live';
        await finalize(ok ? 'completed' : 'failed', { ...data, stage: ok ? 'completed' : 'openai_agent_failed' });
        return json({ run_id, stage: ok ? 'completed' : 'openai_agent_failed', ...data });
      }

      if (run_type === 'structure_text_note') {
        const r = await fetch(`${SUPABASE_URL}/functions/v1/openai-structure-note`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${SERVICE_KEY}`, apikey: SERVICE_KEY },
          body: JSON.stringify({ raw_text: payload?.raw_text ?? instruction ?? '', model: resolvedModel }),
        });
        const data = await r.json().catch(() => ({ error: 'invalid_json' }));
        await insertOutput('structured_note', data);
        const failed = !!data?.error;
        await finalize(failed ? 'failed' : 'completed', { ...data, stage: failed ? 'openai_agent_failed' : 'completed' });
        return json({ run_id, stage: failed ? 'openai_agent_failed' : 'completed', ...data });
      }

      if (run_type === 'audit_chapter_plan') {
        const r = await fetch(`${SUPABASE_URL}/functions/v1/audit-plan`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${SERVICE_KEY}`, apikey: SERVICE_KEY },
          body: JSON.stringify({ model: resolvedModel }),
        });
        const data = await r.json().catch(() => ({ error: 'invalid_json' }));
        await insertOutput('audit_plan', data);
        const findings = Array.isArray(data?.findings) ? data.findings : [];
        for (const f of findings) {
          try {
            await supa.from('audit_findings').insert({
              run_id, target_type: 'tome', title: String(f?.title ?? 'Finding'),
              severity: f?.severity ?? 'info', detail: f?.note ?? f?.detail ?? null,
              recommendation: f?.recommendation ?? null, status: 'open',
            });
          } catch (_) { /* swallow per-finding error; main result still persisted */ }
        }
        const failed = !!data?.error;
        await finalize(failed ? 'failed' : 'completed', { ...data, stage: failed ? 'openai_agent_failed' : 'completed' }, findings.length);
        return json({ run_id, stage: failed ? 'openai_agent_failed' : 'completed', ...data });
      }

      if (run_type === 'diagnostic_tome_live') {
        const r = await fetch(`${SUPABASE_URL}/functions/v1/openai-generate-diagnostic`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${SERVICE_KEY}`, apikey: SERVICE_KEY },
          body: JSON.stringify({ scope: scope ?? 'global', model: resolvedModel }),
        });
        const data = await r.json().catch(() => ({ error: 'invalid_json' }));
        await insertOutput('diagnostic_tome_live', data);

        // Normalize: convert each dimension's recommendation into an audit_finding.
        const dims: any[] = Array.isArray(data?.diagnostic?.dimensions) ? data.diagnostic.dimensions : [];
        const findings: any[] = [];
        for (const d of dims) {
          if (!d?.recommendation) continue;
          const severity = d?.risk === 'high' ? 'error' : d?.risk === 'medium' ? 'warn' : 'info';
          const finding = {
            run_id, target_type: 'tome',
            title: `Diagnostic · ${d.name ?? 'dimension'}`,
            severity,
            detail: d?.score != null ? `Score=${d.score} · risk=${d?.risk ?? '—'}` : null,
            recommendation: d.recommendation,
            status: 'open',
          };
          findings.push(finding);
          try { await supa.from('audit_findings').insert(finding); } catch (_) {}
        }
        const failed = !!data?.error || data?.mode === 'mock';
        await finalize(failed ? 'failed' : 'completed', { ...data, stage: failed ? 'openai_agent_failed' : 'completed', findings_normalized: findings.length }, findings.length);
        return json({ run_id, stage: failed ? 'openai_agent_failed' : 'completed', findings_normalized: findings.length, ...data });
      }

      if (run_type === 'audit_planned_beats' || run_type === 'run_selected_agent') {
        const r = await fetch(`${SUPABASE_URL}/functions/v1/openai-agent-run`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${SERVICE_KEY}`, apikey: SERVICE_KEY },
          body: JSON.stringify({ agent_id, model: resolvedModel, instruction, payload, retrieval_query: instruction }),
        });
        const data = await r.json().catch(() => ({ error: 'invalid_json' }));
        await insertOutput('agent_run', data);

        const findings = Array.isArray(data?.findings) ? data.findings : [];
        for (const f of findings) {
          try {
            await supa.from('audit_findings').insert({
              run_id, agent_id: typeof agent_id === 'string' && agent_id.length === 36 ? agent_id : null,
              target_type: target_type ?? null, target_id: target_id ?? null,
              title: String(f?.title ?? 'Finding'), severity: f?.severity ?? 'info',
              detail: f?.note ?? f?.detail ?? null, recommendation: f?.recommendation ?? null,
              status: 'open',
            });
          } catch (_) {}
        }
        const tasks = Array.isArray(data?.rewrite_tasks) ? data.rewrite_tasks : [];
        for (const t of tasks) {
          try {
            await supa.from('rewrite_tasks').insert({
              target_type: t?.target_type ?? target_type ?? 'chapter',
              target_id: t?.target_id ?? target_id ?? null,
              title: String(t?.title ?? t?.instruction ?? 'Rewrite').slice(0, 200),
              instruction: t?.instruction ?? null,
              proposal: t?.proposal ?? null,
              status: 'pending',
              requires_validation: true,
              created_by_agent: typeof agent_id === 'string' ? agent_id : null,
              metadata: { run_id, source: 'run-execute' },
            });
          } catch (_) {}
        }

        const failed = !!data?.error || data?.mode === 'mock';
        const findings_count = findings.length;
        const rewrite_tasks_count = tasks.length;
        const vector_context_used = !!data?.vector_context_used;
        const indexes_active = Array.isArray(data?.indexes_active) ? data.indexes_active : [];
        const indexes_pending = Array.isArray(data?.indexes_pending) ? data.indexes_pending : [];
        await finalize(failed ? 'failed' : 'completed', {
          ...data, stage: failed ? 'openai_agent_failed' : 'completed',
          agent_name: agentRow?.name ?? null, resolved_model: resolvedModel,
          effective_model: resolvedModel, agent_id, target_type, target_id,
          findings_count, rewrite_tasks_count, vector_context_used, indexes_active, indexes_pending,
        }, findings_count);
        return json({
          run_id, run_type, stage: failed ? 'openai_agent_failed' : 'completed',
          effective_model: resolvedModel, resolved_model: resolvedModel,
          agent_id, agent_name: agentRow?.name ?? null, target_type, target_id,
          output_count: 1, findings_count, rewrite_tasks_count,
          vector_context_used, indexes_active, indexes_pending,
          ...data,
        });
      }

      if (run_type === 'export_test') {
        const r = await fetch(`${SUPABASE_URL}/functions/v1/export-text`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${SERVICE_KEY}`, apikey: SERVICE_KEY },
          body: JSON.stringify(payload ?? {}),
        });
        const data = await r.json().catch(() => ({ error: 'invalid_json' }));
        await insertOutput('export_test', data);
        const failed = !!data?.error;
        await finalize(failed ? 'failed' : 'completed', { ...data, stage: failed ? 'openai_agent_failed' : 'completed' });
        return json({ run_id, stage: failed ? 'openai_agent_failed' : 'completed', ...data });
      }

      if (run_type === 'generate_chapter_draft') {
        const chapter_id = target_id ?? payload?.chapter_id ?? null;
        if (!chapter_id) {
          await insertOutput('error', { stage: 'validation', reason: 'chapter_id required' });
          await finalize('failed', { error: 'chapter_id_required', stage: 'validation' });
          return json({ run_id, error: 'chapter_id required', stage: 'validation' }, 400);
        }
        const r = await fetch(`${SUPABASE_URL}/functions/v1/chapter-generate`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${SERVICE_KEY}`, apikey: SERVICE_KEY },
          body: JSON.stringify({ chapter_id, model: resolvedModel, run_id }),
        });
        const data = await r.json().catch(() => ({ error: 'invalid_json' }));
        await insertOutput('chapter_generated', data);
        const failed = !!data?.error;
        await finalize(failed ? 'failed' : 'completed', {
          ...data, stage: failed ? 'chapter_generate_failed' : 'completed',
          effective_model: data?.model ?? resolvedModel,
          chapter_id, version: data?.version ?? null,
        });
        return json({
          run_id, run_type, stage: failed ? 'chapter_generate_failed' : 'completed',
          effective_model: data?.model ?? resolvedModel, chapter_id,
          version: data?.version ?? null, version_id: data?.version_id ?? null,
          ...data,
        });
      }

      await insertOutput('error', { stage: 'unknown_run_type', run_type });
      await finalize('failed', { error: `unknown_run_type:${run_type}`, stage: 'unknown_run_type' });
      return json({ run_id, error: 'unknown_run_type', stage: 'unknown_run_type' }, 400);
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'unknown';
      await insertOutput('exception', { stage: 'finalize_failed', error: msg });
      await finalize('failed', { error: msg, stage: 'finalize_failed' });
      return json({ run_id, error: msg, stage: 'finalize_failed' }, 500);
    }
  } catch (e) {
    return json({ error: e instanceof Error ? e.message : 'unknown', stage: 'validation' }, 500);
  }
});
