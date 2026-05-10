// deno-lint-ignore-file
import { corsHeaders, json } from '../_shared/cors.ts';
import { callOpenAI, hasOpenAIKey } from '../_shared/openai.ts';

const SYSTEM = `Tu es un assistant éditorial qui structure la fiche personnages du roman "Cycle — Les Portes du Monde, Tome I".
Tu retournes STRICTEMENT un objet JSON valide, en français, sans commentaire.

Format attendu :
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

const MOCK = [
  { name: 'Brice Javaux', role: 'protagoniste', function: 'ingénieur veille L4', secret: 'Témoin Lagrange-4 04:17 — silence choisi.' },
  { name: 'Amina', role: 'secondaire', function: 'science et dignité' },
  { name: 'Karim', role: 'secondaire', function: 'tisseur de traité ONU' },
  { name: 'Mila', role: 'secondaire', function: 'finance / péages automatisés / capture' },
];

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });
  try {
    const { source_file_id, text, model } = await req.json().catch(() => ({}));
    if (!hasOpenAIKey() || !text || typeof text !== 'string') {
      return json({
        mode: 'mock',
        provider: 'none',
        reason: !hasOpenAIKey() ? 'OPENAI_API_KEY missing — runtime provider not configured' : 'no text provided',
        source_file_id: source_file_id ?? null,
        characters: MOCK,
      });
    }
    const r = await callOpenAI({
      model,
      system: SYSTEM,
      user: `Extrait la fiche personnages depuis ce document :\n\n${text.slice(0, 60000)}`,
      json: true,
    });
    if (!r.ok) return json({ mode: 'degraded', provider: 'openai', error: r.error, status: r.status }, 200);
    const parsed = (r.parsed as any) ?? {};
    return json({
      mode: 'live',
      provider: 'openai',
      model: r.model,
      source_file_id: source_file_id ?? null,
      characters: parsed.characters ?? [],
      raw: parsed.characters ? undefined : r.text,
    });
  } catch (e) {
    return json({ error: e instanceof Error ? e.message : 'unknown' }, 500);
  }
});
