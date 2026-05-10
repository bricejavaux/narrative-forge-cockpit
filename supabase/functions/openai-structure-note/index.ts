// deno-lint-ignore-file
import { corsHeaders, hasOpenAI, json } from '../_shared/cors.ts';

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });
  try {
    const { text, target_type, target_id } = await req.json().catch(() => ({}));
    if (!hasOpenAI()) {
      return json({
        mode: 'mock',
        target_type: target_type ?? null,
        target_id: target_id ?? null,
        structured: {
          intent: 'rewrite_suggestion',
          severity: 'minor',
          summary: text ? String(text).slice(0, 120) : 'Note simulée structurée.',
          proposed_action: 'Réviser le passage en gardant la phrase-couteau finale.',
          impacted_objects: [],
        },
      });
    }
    return json({ mode: 'live', message: 'OPENAI_API_KEY present, structuring stub.' });
  } catch (e) {
    return json({ error: e instanceof Error ? e.message : 'unknown' }, 500);
  }
});
