// deno-lint-ignore-file
import { corsHeaders, hasLovableAI, json } from '../_shared/cors.ts';
import { callLovableAI } from '../_shared/lovableAI.ts';

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });
  try {
    const { target_type, target_id, instruction, current_text } = await req.json().catch(() => ({}));
    if (!hasLovableAI() || !instruction) {
      return json({
        mode: 'mock',
        target_type: target_type ?? null,
        target_id: target_id ?? null,
        proposal: 'Proposition de réécriture simulée — alignement canon, ton éditorial préservé.',
        rationale: 'Mock — pas d\'appel IA effectué.',
      });
    }
    const r = await callLovableAI({
      messages: [
        { role: 'system', content: 'Tu proposes une réécriture courte, fidèle au canon "Les Portes du Monde". Style sobre, pas de surcharge. Retourne JSON {proposal, rationale}.' },
        { role: 'user', content: `Instruction: ${instruction}\n\nTexte actuel:\n${String(current_text ?? '').slice(0, 8000)}` },
      ],
      json: true,
    });
    if (!r.ok) return json({ mode: 'degraded', error: r.error }, 200);
    const p = (r.parsed as any) ?? {};
    return json({ mode: 'live', model: r.model, target_type, target_id, proposal: p.proposal ?? r.text, rationale: p.rationale ?? null });
  } catch (e) {
    return json({ error: e instanceof Error ? e.message : 'unknown' }, 500);
  }
});
