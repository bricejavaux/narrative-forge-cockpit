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
        summary: 'Résumé simulé : articulation Tome I — Les Arches de Brice, 15 chapitres, alternance macro/micro, phrase-couteau finale.',
      });
    }
    return json({ mode: 'live', message: 'OPENAI_API_KEY present, summarization stub.' });
  } catch (e) {
    return json({ error: e instanceof Error ? e.message : 'unknown' }, 500);
  }
});
