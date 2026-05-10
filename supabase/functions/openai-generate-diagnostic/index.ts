// deno-lint-ignore-file
import { corsHeaders, hasLovableAI, json } from '../_shared/cors.ts';
import { callLovableAI } from '../_shared/lovableAI.ts';

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });
  try {
    const { scope, context } = await req.json().catch(() => ({}));
    if (!hasLovableAI()) {
      return json({
        mode: 'mock',
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
    const r = await callLovableAI({
      messages: [
        { role: 'system', content: 'Tu produis un diagnostic éditorial structuré pour le roman "Les Portes du Monde, Tome I". Réponds en JSON {dimensions:[{name,score,risk,recommendation}]} en français.' },
        { role: 'user', content: `Scope: ${scope ?? 'global'}\nContexte: ${typeof context === 'string' ? context.slice(0, 8000) : ''}` },
      ],
      json: true,
    });
    if (!r.ok) return json({ mode: 'degraded', error: r.error }, 200);
    return json({ mode: 'live', model: r.model, scope: scope ?? 'global', diagnostic: r.parsed ?? null });
  } catch (e) {
    return json({ error: e instanceof Error ? e.message : 'unknown' }, 500);
  }
});
