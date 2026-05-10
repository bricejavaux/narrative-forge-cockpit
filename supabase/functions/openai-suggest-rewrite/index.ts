// deno-lint-ignore-file
import { corsHeaders, json } from '../_shared/cors.ts';
import { callOpenAI, hasOpenAIKey } from '../_shared/openai.ts';

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });
  try {
    const { target_type, target_id, instruction, current_text, model, temperature, maxOutputTokens, reasoningEffort } = await req.json().catch(() => ({}));
    if (!hasOpenAIKey() || !instruction) {
      return json({
        mode: 'mock',
        provider: 'none',
        reason: !hasOpenAIKey() ? 'OPENAI_API_KEY missing — runtime provider not configured' : 'no instruction provided',
        target_type: target_type ?? null,
        target_id: target_id ?? null,
        proposal: 'Proposition de réécriture simulée — alignement canon, ton éditorial préservé.',
        rationale: 'Mock — pas d\'appel IA effectué.',
      });
    }
    const r = await callOpenAI({
      model,
      temperature,
      maxOutputTokens,
      reasoningEffort,
      system: 'Tu proposes une réécriture courte, fidèle au canon "Les Portes du Monde". Style sobre, pas de surcharge. Retourne JSON {proposal, rationale}.',
      user: `Instruction: ${instruction}\n\nTexte actuel:\n${String(current_text ?? '').slice(0, 8000)}`,
      json: true,
    });
    if (!r.ok) return json({ mode: 'degraded', provider: 'openai', error: r.error, status: r.status }, 200);
    const p = (r.parsed as any) ?? {};
    return json({
      mode: 'live',
      provider: 'openai',
      model: r.model,
      target_type,
      target_id,
      proposal: p.proposal ?? r.text,
      rationale: p.rationale ?? null,
    });
  } catch (e) {
    return json({ error: e instanceof Error ? e.message : 'unknown' }, 500);
  }
});
