// deno-lint-ignore-file
import { corsHeaders, json } from '../_shared/cors.ts';
import { callOpenAI, hasOpenAIKey } from '../_shared/openai.ts';

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });
  try {
    const { text, target_type, target_id, model, temperature, maxOutputTokens, reasoningEffort } = await req.json().catch(() => ({}));
    if (!hasOpenAIKey() || !text) {
      return json({
        mode: 'mock',
        provider: 'none',
        reason: !hasOpenAIKey() ? 'OPENAI_API_KEY missing — runtime provider not configured' : 'no text provided',
        target_type: target_type ?? null,
        target_id: target_id ?? null,
        structured: {
          intent: 'remarque éditoriale',
          summary: 'Note vocale simulée — structure mock.',
          proposed_actions: ['Vérifier alignement canon', 'Lier au chapitre concerné'],
        },
      });
    }
    const r = await callOpenAI({
      model,
      temperature,
      maxOutputTokens,
      reasoningEffort,
      system: 'Tu structures une note de l\'auteur. Retourne un JSON {intent, summary, proposed_actions[]} en français.',
      user: String(text).slice(0, 8000),
      json: true,
    });
    if (!r.ok) return json({ mode: 'degraded', provider: 'openai', error: r.error, status: r.status }, 200);
    return json({
      mode: 'live',
      provider: 'openai',
      model: r.model,
      target_type: target_type ?? null,
      target_id: target_id ?? null,
      structured: r.parsed ?? null,
    });
  } catch (e) {
    return json({ error: e instanceof Error ? e.message : 'unknown' }, 500);
  }
});
