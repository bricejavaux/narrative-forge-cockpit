// deno-lint-ignore-file
import { corsHeaders, hasLovableAI, json } from '../_shared/cors.ts';
import { callLovableAI } from '../_shared/lovableAI.ts';

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });
  try {
    const { source_file_id, text } = await req.json().catch(() => ({}));
    if (!hasLovableAI() || !text) {
      return json({
        mode: 'mock',
        source_file_id: source_file_id ?? null,
        summary: 'Résumé simulé : articulation Tome I — Les Arches de Brice, 15 chapitres, alternance macro/micro, phrase-couteau finale.',
      });
    }
    const trimmed = String(text).slice(0, 80000);
    const r = await callLovableAI({
      messages: [
        { role: 'system', content: 'Tu résumes un document de travail éditorial en français, en 6 à 10 phrases denses, sans embellir.' },
        { role: 'user', content: trimmed },
      ],
    });
    if (!r.ok) return json({ mode: 'degraded', error: r.error }, 200);
    return json({ mode: 'live', model: r.model, source_file_id: source_file_id ?? null, summary: r.text });
  } catch (e) {
    return json({ error: e instanceof Error ? e.message : 'unknown' }, 500);
  }
});
