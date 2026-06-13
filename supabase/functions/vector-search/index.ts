// deno-lint-ignore-file
// vector-search: embed a query and run cosine top-k against vector_chunks via match_vector_chunks RPC.
import { corsHeaders, json } from '../_shared/cors.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.4';

const DEFAULT_EMBED_MODEL = 'text-embedding-3-small';

async function embedOne(text: string, model: string): Promise<number[]> {
  const key = Deno.env.get('OPENAI_API_KEY');
  if (!key) throw new Error('OPENAI_API_KEY missing');
  const res = await fetch('https://api.openai.com/v1/embeddings', {
    method: 'POST',
    headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ model, input: text }),
  });
  if (!res.ok) throw new Error(`openai embeddings ${res.status}: ${(await res.text()).slice(0, 300)}`);
  const data = await res.json();
  return data.data[0].embedding as number[];
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });
  try {
    const body = await req.json().catch(() => ({}));
    const query = String(body.query ?? '').trim();
    const index_name = body.index_name ? String(body.index_name) : null;
    const corpus = body.corpus ? String(body.corpus) : null;
    // Legacy support: index_names[] picks the first.
    const legacy_index = Array.isArray(body.index_names) && body.index_names.length > 0
      ? String(body.index_names[0]) : null;
    const effective_index = index_name ?? legacy_index;
    const top_k = Math.max(1, Math.min(50, Number(body.top_k ?? 8)));
    const min_similarity = Number(body.min_similarity ?? body.similarity_threshold ?? 0.20);
    const agent_id = body.agent_id ?? null;
    const run_id = body.run_id ?? null;
    const embed_model = String(body.embedding_model ?? DEFAULT_EMBED_MODEL);

    if (!query) return json({ ok: false, error: 'query required' }, 400);

    const supa = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      { auth: { persistSession: false } },
    );

    // Pre-check active embeddings
    let activeQ = supa.from('vector_chunks').select('id', { count: 'exact', head: true })
      .eq('embedding_status', 'done').not('embedding', 'is', null);
    if (effective_index) activeQ = activeQ.eq('index_name', effective_index);
    if (corpus) activeQ = activeQ.eq('corpus_name', corpus);
    const { count: activeCount } = await activeQ;

    if (!activeCount || activeCount === 0) {
      await supa.from('retrieval_logs').insert({
        agent_id, run_id, query,
        index_names: effective_index ? [effective_index] : [],
        top_k, similarity_threshold: min_similarity,
        result_count: 0, model: embed_model,
        metadata: { reason: 'no_active_embeddings', corpus, index_name: effective_index },
      });
      return json({
        ok: true,
        mode: 'pending_pgvector',
        warning: 'Aucun embedding actif pour ce corpus/index. Lancez vector-ingest-package d\'abord.',
        index_name: effective_index, corpus,
        retrieved_chunks: [],
      });
    }

    let embedding: number[];
    try { embedding = await embedOne(query, embed_model); }
    catch (e) { return json({ ok: false, error: e instanceof Error ? e.message : 'embed_failed' }, 200); }

    const { data: rows, error: rpcErr } = await supa.rpc('match_vector_chunks', {
      query_embedding: embedding as any,
      match_index_name: effective_index,
      match_corpus: corpus,
      match_count: top_k,
      min_similarity,
    });

    if (rpcErr) {
      return json({ ok: false, error: 'match_vector_chunks RPC failed', rpc_error: rpcErr.message }, 500);
    }

    const retrieved = Array.isArray(rows) ? rows : [];

    const { data: logRow } = await supa.from('retrieval_logs').insert({
      agent_id, run_id, query,
      index_names: effective_index ? [effective_index] : [],
      top_k, similarity_threshold: min_similarity,
      result_count: retrieved.length, model: embed_model,
      metadata: { corpus, index_name: effective_index, embedding_model: embed_model },
    }).select('id').maybeSingle();

    return json({
      ok: true,
      mode: 'live',
      index_name: effective_index,
      corpus,
      top_k,
      min_similarity,
      retrieved_chunks: retrieved,
      retrieval_log_id: logRow?.id ?? null,
      embedding_model: embed_model,
    });
  } catch (e) {
    return json({ ok: false, error: e instanceof Error ? e.message : 'unknown' }, 500);
  }
});
