// deno-lint-ignore-file
import { corsHeaders, json } from '../_shared/cors.ts';
import { callOpenAI, hasOpenAIKey } from '../_shared/openai.ts';

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });
  try {
    const { source_file_id, text, model } = await req.json().catch(() => ({}));
    if (!hasOpenAIKey() || !text) {
      return json({
        mode: 'mock',
        provider: 'none',
        reason: !hasOpenAIKey() ? 'OPENAI_API_KEY missing — runtime provider not configured' : 'no text provided',
        source_file_id: source_file_id ?? null,
        summary: 'Résumé simulé : articulation Tome I — Les Arches de Brice, 15 chapitres, alternance macro/micro, phrase-couteau finale.',
      });
    }
    const r = await callOpenAI({
      model,
      system: 'Tu résumes un document de travail éditorial en français, en 6 à 10 phrases denses, sans embellir.',
      user: String(text).slice(0, 80000),
    });
    if (!r.ok) return json({ mode: 'degraded', provider: 'openai', error: r.error, status: r.status }, 200);
    return json({
      mode: 'live',
      provider: 'openai',
      model: r.model,
      source_file_id: source_file_id ?? null,
      summary: r.text,
    });
  } catch (e) {
    return json({ error: e instanceof Error ? e.message : 'unknown' }, 500);
  }
});
