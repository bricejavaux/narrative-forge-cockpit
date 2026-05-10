// deno-lint-ignore-file
import { corsHeaders, hasOpenAI, json } from '../_shared/cors.ts';

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });
  try {
    const { target_type, target_id, instruction } = await req.json().catch(() => ({}));
    if (!hasOpenAI()) {
      return json({
        mode: 'mock',
        target_type: target_type ?? null,
        target_id: target_id ?? null,
        instruction: instruction ?? null,
        proposal:
          'Proposition simulée : resserrer le passage, conserver la phrase-couteau finale, ajouter un détail technique par scène.',
        requires_validation: true,
      });
    }
    return json({ mode: 'live', message: 'OPENAI_API_KEY present, rewrite stub.' });
  } catch (e) {
    return json({ error: e instanceof Error ? e.message : 'unknown' }, 500);
  }
});
