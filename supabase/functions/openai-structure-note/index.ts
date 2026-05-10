// deno-lint-ignore-file
import { corsHeaders, hasLovableAI, json } from '../_shared/cors.ts';
import { callLovableAI } from '../_shared/lovableAI.ts';

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });
  try {
    const { text, target_type, target_id } = await req.json().catch(() => ({}));
    if (!hasLovableAI() || !text) {
      return json({
        mode: 'mock',
        target_type: target_type ?? null,
        target_id: target_id ?? null,
        structured: {
          intent: 'remarque éditoriale',
          summary: 'Note vocale simulée — structure mock.',
          proposed_actions: ['Vérifier alignement canon', 'Lier au chapitre concerné'],
        },
      });
    }
    const r = await callLovableAI({
      messages: [
        { role: 'system', content: 'Tu structures une note de l\'auteur. Retourne un JSON {intent, summary, proposed_actions[]} en français.' },
        { role: 'user', content: String(text).slice(0, 8000) },
      ],
      json: true,
    });
    if (!r.ok) return json({ mode: 'degraded', error: r.error }, 200);
    return json({ mode: 'live', model: r.model, target_type: target_type ?? null, target_id: target_id ?? null, structured: r.parsed ?? null });
  } catch (e) {
    return json({ error: e instanceof Error ? e.message : 'unknown' }, 500);
  }
});
