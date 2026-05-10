// deno-lint-ignore-file
import { corsHeaders, hasOpenAI, json } from '../_shared/cors.ts';

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });
  try {
    const { scope } = await req.json().catch(() => ({}));
    if (!hasOpenAI()) {
      return json({
        mode: 'mock',
        scope: scope ?? 'tome_1',
        scores: [
          { dimension: 'Trace non-humanisée', value: 88 },
          { dimension: 'Hiérarchie L4 / Walvis Bay', value: 76 },
          { dimension: 'Macro/micro alternance', value: 82 },
          { dimension: 'Coût par activation', value: 71 },
          { dimension: 'Phrase-couteau', value: 90 },
        ],
        findings: 6,
      });
    }
    return json({ mode: 'live', message: 'OPENAI_API_KEY present, diagnostic stub.' });
  } catch (e) {
    return json({ error: e instanceof Error ? e.message : 'unknown' }, 500);
  }
});
