// deno-lint-ignore-file
import { corsHeaders, json } from '../_shared/cors.ts';
import { callOpenAI, hasOpenAIKey } from '../_shared/openai.ts';

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });
  try {
    const { scope, context, model } = await req.json().catch(() => ({}));
    if (!hasOpenAIKey()) {
      return json({
        mode: 'mock',
        provider: 'none',
        reason: 'OPENAI_API_KEY missing — runtime provider not configured',
        scope: scope ?? 'global',
        diagnostic: {
          dimensions: [
            { name: 'Trace non-humanisée', score: 82, risk: 'medium', recommendation: 'Vérifier ch.4 et ch.10.' },
            { name: 'Hiérarchie L4 → Walvis Bay', score: 74, risk: 'medium', recommendation: 'Renforcer la chaîne de commandement.' },
            { name: 'Alternance macro/micro', score: 88, risk: 'low' },
            { name: 'Phrase-couteau', score: 71, risk: 'medium' },
          ],
        },
      });
    }
    const r = await callOpenAI({
      model,
      system: 'Tu produis un diagnostic éditorial structuré pour le roman "Les Portes du Monde, Tome I". Réponds en JSON {dimensions:[{name,score,risk,recommendation}]} en français.',
      user: `Scope: ${scope ?? 'global'}\nContexte: ${typeof context === 'string' ? context.slice(0, 8000) : ''}`,
      json: true,
    });
    if (!r.ok) return json({ mode: 'degraded', provider: 'openai', error: r.error, status: r.status }, 200);
    return json({ mode: 'live', provider: 'openai', model: r.model, scope: scope ?? 'global', diagnostic: r.parsed ?? null });
  } catch (e) {
    return json({ error: e instanceof Error ? e.message : 'unknown' }, 500);
  }
});
