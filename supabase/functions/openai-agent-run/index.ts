// deno-lint-ignore-file
import { corsHeaders, json } from '../_shared/cors.ts';
import { callOpenAI, hasOpenAIKey, defaultOpenAIModel } from '../_shared/openai.ts';

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });
  try {
    const {
      agent_id,
      payload,
      model,
      instruction,
      system,
      qualityProfile,
      parameters,
      temperature,
      maxOutputTokens,
      reasoningEffort,
    } = await req.json().catch(() => ({}));

    if (!hasOpenAIKey()) {
      return json({
        mode: 'mock',
        provider: 'none',
        reason: 'OPENAI_API_KEY missing — runtime provider not configured',
        agent_id: agent_id ?? null,
        status: 'simulated_complete',
        summary: null,
        findings: [],
        recommendations: [],
        rewrite_tasks: [],
        scores: {},
        warnings: ['Mode mock — aucun appel OpenAI effectué.'],
        payload_preview: payload ?? null,
      });
    }

    const sys =
      system ||
      'Tu es un agent éditorial du roman "Les Portes du Monde, Tome I". ' +
      'Tu exécutes une mission (audit / diagnostic / suggestion ciblée). ' +
      'Aucune réécriture autonome n\'est persistée — uniquement des suggestions soumises à validation humaine. ' +
      'Retourne STRICTEMENT un JSON {status, summary, findings:[{title,severity,note}], recommendations:[], rewrite_tasks:[{target_type,target_id,instruction,proposal}], scores:{}, warnings:[]} en français.';

    const r = await callOpenAI({
      model,
      temperature,
      maxOutputTokens,
      reasoningEffort,
      system: sys,
      user:
        `agent_id: ${agent_id ?? 'unknown'}\n` +
        `quality_profile: ${qualityProfile ?? '—'}\n` +
        `instruction: ${instruction ?? '(aucune)'}\n` +
        `parameters: ${JSON.stringify(parameters ?? {})}\n` +
        `payload:\n${JSON.stringify(payload ?? {}, null, 2).slice(0, 8000)}`,
      json: true,
    });

    if (!r.ok) {
      return json({
        mode: 'degraded',
        provider: 'openai',
        model: r.model,
        agent_id: agent_id ?? null,
        error: r.error,
        status: r.status,
        model_unavailable: r.model_unavailable === true,
        warnings: r.model_unavailable
          ? ['Modèle indisponible pour cette clé API OpenAI. Choisissez un autre modèle ou vérifiez l\'accès à votre compte.']
          : [],
      }, 200);
    }

    const parsed = (r.parsed as any) ?? {};
    return json({
      mode: 'live',
      provider: 'openai',
      model: r.model || defaultOpenAIModel(),
      agent_id: agent_id ?? null,
      status: parsed.status ?? 'complete',
      summary: parsed.summary ?? null,
      findings: Array.isArray(parsed.findings) ? parsed.findings : [],
      recommendations: Array.isArray(parsed.recommendations) ? parsed.recommendations : [],
      rewrite_tasks: Array.isArray(parsed.rewrite_tasks) ? parsed.rewrite_tasks : [],
      scores: parsed.scores ?? {},
      warnings: Array.isArray(parsed.warnings) ? parsed.warnings : [],
      raw: parsed && Object.keys(parsed).length ? undefined : r.text,
    });
  } catch (e) {
    return json({ error: e instanceof Error ? e.message : 'unknown' }, 500);
  }
});
