// deno-lint-ignore-file
import { corsHeaders, json } from '../_shared/cors.ts';
import { hasOpenAIKey, defaultOpenAIModel } from '../_shared/openai.ts';

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });
  try {
    const { agent_id, payload } = await req.json().catch(() => ({}));
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
    // Autonomous agent runs not wired yet — return live readiness only.
    return json({
      mode: 'live',
      provider: 'openai',
      model: defaultOpenAIModel(),
      agent_id: agent_id ?? null,
      status: 'ready_not_wired',
      message: 'OPENAI_API_KEY detected. Autonomous agent loop not yet implemented in this iteration.',
    });
  } catch (e) {
    return json({ error: e instanceof Error ? e.message : 'unknown' }, 500);
  }
});
