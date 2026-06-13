// deno-lint-ignore-file
// Restricted wrapper that only ingests `science_portals` into `science_index`.
// Hard refuses follett and sf_portals_fiction with HTTP 400 + explicit reason
// (per the "minimal pgvector for science_portals only" iteration).
import { corsHeaders, json } from '../_shared/cors.ts';

const ALLOWED_CORPUS = 'science_portals';
const TARGET_INDEX = 'science_index';
const DEFAULT_EMBED_MODEL = 'text-embedding-3-small';

const BLOCKED: Record<string, string> = {
  follett: 'Ingestion follett désactivée — politique de droits/style en attente.',
  sf_portals_fiction: 'Ingestion sf_portals_fiction désactivée — politique de référence fiction en attente.',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  try {
    const body = await req.json().catch(() => ({}));
    const corpus_name = String(body?.corpus_name ?? ALLOWED_CORPUS).trim();
    const embedding_model = String(body?.embedding_model ?? DEFAULT_EMBED_MODEL);
    const dry_run = Boolean(body?.dry_run);
    const limit = body?.limit ? Number(body.limit) : undefined;

    if (BLOCKED[corpus_name]) {
      return json({
        ok: false,
        corpus_name,
        error: 'corpus_blocked_this_iteration',
        reason: BLOCKED[corpus_name],
      }, 400);
    }
    if (corpus_name !== ALLOWED_CORPUS) {
      return json({
        ok: false,
        error: 'corpus_not_allowed_in_this_iteration',
        allowed: [ALLOWED_CORPUS],
        received: corpus_name,
      }, 400);
    }

    // Delegate to the general vector-ingest-package function, forcing
    // embed_and_store mode so embeddings are actually written.
    const url = `${Deno.env.get('SUPABASE_URL')}/functions/v1/vector-ingest-package`;
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''}`,
        apikey: Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      },
      body: JSON.stringify({
        corpus_name: ALLOWED_CORPUS,
        target_index: TARGET_INDEX,
        mode: 'embed_and_store',
        embedding_model,
        dry_run,
        limit,
      }),
    });

    const data = await res.json().catch(() => ({}));
    return json({
      ok: !!data?.ok,
      corpus_name: ALLOWED_CORPUS,
      target_index: TARGET_INDEX,
      embedding_model,
      dry_run,
      delegated_to: 'vector-ingest-package',
      result: data,
    }, res.status);
  } catch (e) {
    return json({ ok: false, error: e instanceof Error ? e.message : 'unknown' }, 500);
  }
});
