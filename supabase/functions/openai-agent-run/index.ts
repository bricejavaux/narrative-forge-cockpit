// deno-lint-ignore-file
import { corsHeaders, json } from '../_shared/cors.ts';
import { callOpenAI, hasOpenAIKey, defaultOpenAIModel } from '../_shared/openai.ts';

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });
  try {
    const { agent_id, payload, model, instruction } = await req.json().catch(() => ({}));
    if (!hasOpenAIKey()) {
      return json({
        mode: 'mock',
        provider: 'none',
        reason: 'OPENAI_API_KEY missing — runtime provider not configured',
        agent_id: agent_id ?? null,
        status: 'simulated_complete',
        findings: 3,
        steps: [
          { name: 'collect_inputs', status: 'ok' },
          { name: 'consult_indexes', status: 'ok' },
          { name: 'audit', status: 'ok' },
        ],
        payload_preview: payload ?? null,
      });
    }

    const r = await callOpenAI({
      model,
      system:
        'Tu es un agent éditorial du roman "Les Portes du Monde, Tome I". ' +
        'Tu exécutes une mission (audit / diagnostic / suggestion) et retournes un JSON ' +
        '{status, findings:[{title,severity,note}], summary} en français. Aucune réécriture autonome.',
      user:
        `agent_id: ${agent_id ?? 'unknown'}\n` +
        `instruction: ${instruction ?? '(aucune)'}\n` +
        `payload:\n${JSON.stringify(payload ?? {}, null, 2).slice(0, 8000)}`,
      json: true,
    });

    if (!r.ok) {
      return json({ mode: 'degraded', provider: 'openai', model: r.model, error: r.error, status: r.status }, 200);
    }

    const parsed = (r.parsed as any) ?? {};
    return json({
      mode: 'live',
      provider: 'openai',
      model: r.model || defaultOpenAIModel(),
      agent_id: agent_id ?? null,
      status: parsed.status ?? 'complete',
      findings: parsed.findings ?? [],
      summary: parsed.summary ?? null,
      raw: parsed && Object.keys(parsed).length ? undefined : r.text,
    });
  } catch (e) {
    return json({ error: e instanceof Error ? e.message : 'unknown' }, 500);
  }
});
