// deno-lint-ignore-file
import { corsHeaders, json } from '../_shared/cors.ts';
import { callOpenAI, hasOpenAIKey } from '../_shared/openai.ts';

const SYSTEM = `Tu es un assistant éditorial qui structure le canon du roman "Cycle — Les Portes du Monde, Tome I — Les Arches de Brice".
Tu retournes STRICTEMENT un objet JSON valide, en français, sans commentaire.

Format de sortie attendu :
{
  "world_rules": [{"title": string, "criticality": "critical"|"high"|"medium"|"low", "summary": string}],
  "constraints": [{"title": string, "rigidity": "hard"|"soft", "summary": string}],
  "failure_modes": [{"title": string, "criticality": string, "summary": string}],
  "organizations": [{"title": string, "summary": string}],
  "technologies": [{"title": string, "summary": string}],
  "locations": [{"title": string, "summary": string}],
  "glossary": [{"term": string, "definition": string}]
}`;

const MOCK = {
  world_rules: [
    { title: 'Trace non-humanisée', criticality: 'critical', summary: 'La Trace n’est jamais anthropomorphisée.' },
    { title: 'Hiérarchie L4 → Walvis Bay', criticality: 'critical', summary: 'Lagrange-4 commande, Walvis Bay exécute.' },
  ],
  constraints: [{ title: 'Coût par activation', rigidity: 'hard', summary: 'Chaque ouverture a un coût mesurable.' }],
  failure_modes: [{ title: 'Pinch-off interne', criticality: 'high', summary: 'Effondrement local de la porte.' }],
  organizations: [{ title: 'Fonds de capture', summary: 'Véhicule financier de Mila.' }],
  technologies: [{ title: 'Signature ΔS', summary: 'Marqueur thermodynamique de régulation.' }],
  locations: [
    { title: 'Lagrange-4', summary: 'Site orbital de l’événement 04:17.' },
    { title: 'Walvis Bay', summary: 'Site sol.' },
  ],
  glossary: [{ term: 'phrase-couteau', definition: 'Phrase finale de chapitre, tranchante.' }],
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });
  try {
    const { source_file_id, text, model, temperature, maxOutputTokens, reasoningEffort } = await req.json().catch(() => ({}));
    if (!hasOpenAIKey() || !text || typeof text !== 'string') {
      return json({
        mode: 'mock',
        provider: 'none',
        reason: !hasOpenAIKey() ? 'OPENAI_API_KEY missing — runtime provider not configured' : 'no text provided',
        source_file_id: source_file_id ?? null,
        extracted: MOCK,
      });
    }
    const r = await callOpenAI({
      model,
      temperature,
      maxOutputTokens,
      reasoningEffort,
      system: SYSTEM,
      user: `Extrait le canon depuis ce document d'articulation :\n\n${text.slice(0, 60000)}`,
      json: true,
    });
    if (!r.ok) return json({ mode: 'degraded', provider: 'openai', error: r.error, status: r.status }, 200);
    return json({
      mode: 'live',
      provider: 'openai',
      model: r.model,
      source_file_id: source_file_id ?? null,
      extracted: r.parsed ?? null,
      raw: r.parsed ? undefined : r.text,
    });
  } catch (e) {
    return json({ error: e instanceof Error ? e.message : 'unknown' }, 500);
  }
});
