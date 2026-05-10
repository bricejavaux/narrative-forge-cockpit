// deno-lint-ignore-file
import { corsHeaders, hasOpenAI, json } from '../_shared/cors.ts';

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });
  try {
    const { agent_id, payload } = await req.json().catch(() => ({}));
    if (!hasOpenAI()) {
      return json({
        mode: 'mock',
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
    return json({ mode: 'live', message: 'OPENAI_API_KEY present, agent run stub.' });
  } catch (e) {
    return json({ error: e instanceof Error ? e.message : 'unknown' }, 500);
  }
});
