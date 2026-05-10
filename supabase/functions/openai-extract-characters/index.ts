// deno-lint-ignore-file
import { corsHeaders, hasOpenAI, json } from '../_shared/cors.ts';

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });
  try {
    const { source_file_id } = await req.json().catch(() => ({}));
    if (!hasOpenAI()) {
      return json({
        mode: 'mock',
        source_file_id: source_file_id ?? null,
        characters: [
          { name: 'Brice Javaux', role: 'protagoniste', secret: 'Témoin Lagrange-4 04:17 — silence choisi.' },
          { name: 'Amina', role: 'science', function: 'dignité scientifique' },
          { name: 'Karim', role: 'diplomatie', function: 'tisseur de traité ONU' },
          { name: 'Mila', role: 'finance', function: 'term sheet / péages automatisés / capture' },
        ],
      });
    }
    return json({ mode: 'live', message: 'OPENAI_API_KEY present, extraction stub.' });
  } catch (e) {
    return json({ error: e instanceof Error ? e.message : 'unknown' }, 500);
  }
});
