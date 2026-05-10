// deno-lint-ignore-file
import { corsHeaders, hasOpenAI, json } from '../_shared/cors.ts';

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });
  try {
    const { source_file_id, text } = await req.json().catch(() => ({}));
    if (!hasOpenAI()) {
      return json({
        mode: 'mock',
        source_file_id: source_file_id ?? null,
        extracted: {
          world_rules: [
            { title: 'Trace non-humanisée', criticality: 'critical' },
            { title: 'Hiérarchie L4 → Walvis Bay', criticality: 'critical' },
          ],
          constraints: [{ title: 'Coût par activation', rigidity: 'hard' }],
          failure_modes: [{ title: 'Pinch-off interne', criticality: 'high' }],
          organizations: [{ title: 'Fonds de capture', criticality: 'medium' }],
          technologies: [{ title: 'ΔS signature', criticality: 'high' }],
          locations: [{ title: 'Lagrange-4' }, { title: 'Walvis Bay' }],
          glossary: [{ term: 'phrase-couteau' }],
        },
        sample_text_preview: typeof text === 'string' ? text.slice(0, 200) : null,
      });
    }
    return json({ mode: 'live', message: 'OPENAI_API_KEY present, extraction stub.' });
  } catch (e) {
    return json({ error: e instanceof Error ? e.message : 'unknown' }, 500);
  }
});
