// deno-lint-ignore-file
import { corsHeaders, hasLovableAI, json } from '../_shared/cors.ts';
import { callLovableAI } from '../_shared/lovableAI.ts';

const SYSTEM = `Tu es un assistant éditorial qui structure la fiche personnages du roman "Cycle — Les Portes du Monde, Tome I".
Tu retournes STRICTEMENT un objet JSON valide, en français, sans commentaire.`;

const SCHEMA_HINT = `Format attendu :
{
  "characters": [
    {
      "name": string,
      "role": "protagoniste"|"antagoniste"|"secondaire"|"figurant"|string,
      "function": string,
      "apparent_goal": string,
      "real_goal": string,
      "flaw": string,
      "secret": string,
      "forbidden": string,
      "emotional_trajectory": string,
      "breaking_point": string,
      "narrative_weight": number,
      "exposure_level": number
    }
  ]
}`;

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });
  try {
    const { source_file_id, text } = await req.json().catch(() => ({}));
    if (!hasLovableAI() || !text || typeof text !== 'string') {
      return json({
        mode: 'mock',
        source_file_id: source_file_id ?? null,
        characters: [
          { name: 'Brice Javaux', role: 'protagoniste', function: 'ingénieur veille L4', secret: 'Témoin Lagrange-4 04:17 — silence choisi.' },
          { name: 'Amina', role: 'secondaire', function: 'science et dignité' },
          { name: 'Karim', role: 'secondaire', function: 'tisseur de traité ONU' },
          { name: 'Mila', role: 'secondaire', function: 'finance / péages automatisés / capture' },
        ],
      });
    }
    const trimmed = text.slice(0, 60000);
    const r = await callLovableAI({
      messages: [
        { role: 'system', content: `${SYSTEM}\n\n${SCHEMA_HINT}` },
        { role: 'user', content: `Extrait la fiche personnages depuis ce document :\n\n${trimmed}` },
      ],
      json: true,
    });
    if (!r.ok) return json({ mode: 'degraded', error: r.error, status: r.status }, 200);
    const parsed = (r.parsed as any) ?? {};
    return json({ mode: 'live', model: r.model, source_file_id: source_file_id ?? null, characters: parsed.characters ?? [], raw: parsed.characters ? undefined : r.text });
  } catch (e) {
    return json({ error: e instanceof Error ? e.message : 'unknown' }, 500);
  }
});
