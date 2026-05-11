// deno-lint-ignore-file
import { corsHeaders, json } from '../_shared/cors.ts';
import { callOpenAI, hasOpenAIKey, defaultOpenAIModel } from '../_shared/openai.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.4';

async function loadAgentConfig(agent_id: string) {
  const supa = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    { auth: { persistSession: false } },
  );
  // agent_id may be a Supabase uuid OR an external_id from dummy data
  let { data: agent } = await supa
    .from('agents')
    .select('*')
    .eq('id', agent_id)
    .maybeSingle();
  if (!agent) {
    const r2 = await supa.from('agents').select('*').eq('external_id', agent_id).maybeSingle();
    agent = r2.data ?? null;
  }
  if (!agent) return { agent: null, version: null, bindings: [] as any[] };
  const { data: version } = await supa
    .from('agent_versions')
    .select('*')
    .eq('agent_id', agent.id)
    .eq('is_current', true)
    .maybeSingle();
  const { data: bindings } = await supa
    .from('agent_index_bindings')
    .select('*')
    .eq('agent_id', agent.id);
  return { agent, version, bindings: bindings ?? [] };
}

async function retrieveVectorContext(
  query: string,
  index_names: string[],
  top_k: number,
  similarity_threshold: number,
  agent_id: string | null,
) {
  if (!index_names.length || !query) return { used: false, indexes_active: [], indexes_pending: index_names, retrieved_chunks: [], warning: 'no_index_or_query' };
  try {
    const res = await fetch(`${Deno.env.get('SUPABASE_URL')}/functions/v1/vector-search`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''}`,
        apikey: Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      },
      body: JSON.stringify({ query, index_names, top_k, similarity_threshold, agent_id }),
    });
    const data = await res.json();
    return {
      used: data.mode === 'live' && Array.isArray(data.retrieved_chunks) && data.retrieved_chunks.length > 0,
      indexes_active: data.indexes_active ?? [],
      indexes_pending: data.indexes_pending ?? index_names,
      retrieved_chunks: data.retrieved_chunks ?? [],
      warning: data.warning ?? null,
    };
  } catch (e) {
    return { used: false, indexes_active: [], indexes_pending: index_names, retrieved_chunks: [], warning: String(e) };
  }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });
  try {
    const {
      agent_id,
      payload,
      model,
      instruction,
      system,
      qualityProfile,
      parameters,
      temperature,
      maxOutputTokens,
      reasoningEffort,
      retrieval_query,
    } = await req.json().catch(() => ({}));

    if (!hasOpenAIKey()) {
      return json({
        mode: 'mock',
        provider: 'none',
        reason: 'OPENAI_API_KEY missing — runtime provider not configured',
        agent_id: agent_id ?? null,
        vector_context_used: false,
        indexes_requested: [],
        indexes_active: [],
        indexes_pending: [],
        retrieved_chunks: [],
        status: 'simulated_complete',
        summary: null,
        findings: [],
        recommendations: [],
        rewrite_tasks: [],
        scores: {},
        warnings: ['Mode mock — aucun appel OpenAI effectué.'],
        payload_preview: payload ?? null,
      });
    }

    // Load agent + version + bindings (best effort)
    const { agent, version, bindings } = agent_id ? await loadAgentConfig(String(agent_id)) : { agent: null, version: null, bindings: [] };

    const effectiveModel = model || agent?.selected_model || agent?.default_model || defaultOpenAIModel();
    const effectiveSystem = system || version?.system_prompt ||
      'Tu es un agent éditorial du roman "Les Portes du Monde, Tome I". ' +
      'Tu exécutes une mission (audit / diagnostic / suggestion ciblée). ' +
      'Aucune réécriture autonome n\'est persistée — uniquement des suggestions soumises à validation humaine. ' +
      'Retourne STRICTEMENT un JSON {status, summary, findings:[{title,severity,note}], recommendations:[], rewrite_tasks:[{target_type,target_id,instruction,proposal}], scores:{}, warnings:[]} en français.';

    // Vector retrieval
    const indexNames: string[] = (bindings ?? []).map((b: any) => b.index_name).filter(Boolean);
    const top_k = bindings?.[0]?.top_k ?? 8;
    const similarity_threshold = Number(bindings?.[0]?.similarity_threshold ?? 0.72);
    const queryForRetrieval = String(
      retrieval_query ||
        instruction ||
        (typeof payload === 'object' && payload ? JSON.stringify(payload).slice(0, 500) : '') ||
        agent?.objective ||
        '',
    );

    const vec = await retrieveVectorContext(queryForRetrieval, indexNames, top_k, similarity_threshold, agent?.id ?? null);

    const contextBlock = vec.retrieved_chunks.length
      ? '\n\nContexte vectoriel (top chunks):\n' +
        vec.retrieved_chunks.map((c: any, i: number) => `[${i + 1}] (${c.index_name}, sim=${c.similarity?.toFixed?.(3)}) ${c.text_excerpt ?? c.text ?? ''}`).join('\n')
      : '';

    const r = await callOpenAI({
      model: effectiveModel,
      temperature,
      maxOutputTokens,
      reasoningEffort,
      system: effectiveSystem,
      user:
        `agent_id: ${agent?.external_id ?? agent_id ?? 'unknown'}\n` +
        `quality_profile: ${qualityProfile ?? agent?.quality_profile ?? '—'}\n` +
        `instruction: ${instruction ?? '(aucune)'}\n` +
        `parameters: ${JSON.stringify(parameters ?? {})}\n` +
        `payload:\n${JSON.stringify(payload ?? {}, null, 2).slice(0, 6000)}` +
        contextBlock,
      json: true,
    });

    if (!r.ok) {
      return json({
        mode: 'degraded',
        provider: 'openai',
        model: r.model,
        agent_id: agent_id ?? null,
        vector_context_used: vec.used,
        indexes_requested: indexNames,
        indexes_active: vec.indexes_active,
        indexes_pending: vec.indexes_pending,
        retrieved_chunks: vec.retrieved_chunks,
        error: r.error,
        status: r.status,
        model_unavailable: r.model_unavailable === true,
        warnings: r.model_unavailable
          ? ['Modèle indisponible pour cette clé API OpenAI. Choisissez un autre modèle ou vérifiez l\'accès à votre compte.']
          : [],
      }, 200);
    }

    const parsed = (r.parsed as any) ?? {};
    const warnings = Array.isArray(parsed.warnings) ? parsed.warnings : [];
    if (!vec.used && indexNames.length) {
      warnings.push('Vector retrieval pending; execution used explicit payload and Supabase context only.');
    }

    return json({
      mode: 'live',
      provider: 'openai',
      model: r.model || defaultOpenAIModel(),
      agent_id: agent?.id ?? agent_id ?? null,
      vector_context_used: vec.used,
      indexes_requested: indexNames,
      indexes_active: vec.indexes_active,
      indexes_pending: vec.indexes_pending,
      retrieved_chunks: vec.retrieved_chunks,
      status: parsed.status ?? 'complete',
      summary: parsed.summary ?? null,
      findings: Array.isArray(parsed.findings) ? parsed.findings : [],
      recommendations: Array.isArray(parsed.recommendations) ? parsed.recommendations : [],
      rewrite_tasks: Array.isArray(parsed.rewrite_tasks) ? parsed.rewrite_tasks : [],
      scores: parsed.scores ?? {},
      warnings,
    });
  } catch (e) {
    return json({ error: e instanceof Error ? e.message : 'unknown' }, 500);
  }
});
