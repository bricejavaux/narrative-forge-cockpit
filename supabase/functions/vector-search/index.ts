// deno-lint-ignore-file
// vector-search: embed a query and run cosine top-k against vector_chunks.
// Falls back to metadata-only message if no embeddings exist for the requested indexes.
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
  if (!res.ok) throw new Error(`openai embeddings ${res.status}`);
  const data = await res.json();
  return data.data[0].embedding as number[];
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });
  try {
    const body = await req.json().catch(() => ({}));
    const query = String(body.query ?? '').trim();
    const index_names: string[] = Array.isArray(body.index_names) ? body.index_names : [];
    const top_k = Math.max(1, Math.min(50, Number(body.top_k ?? 8)));
    const similarity_threshold = Number(body.similarity_threshold ?? 0.72);
    const agent_id = body.agent_id ?? null;
    const run_id = body.run_id ?? null;
    const embed_model = String(body.embedding_model ?? DEFAULT_EMBED_MODEL);

    if (!query) return json({ ok: false, error: 'query required' }, 400);

    const supa = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      { auth: { persistSession: false } },
    );

    // Pre-check: are requested indexes active?
    const { data: idx } = await supa
      .from('vector_indexes')
      .select('name,status,chunk_count')
      .in('name', index_names.length ? index_names : ['__none__']);
    const indexes_active = (idx ?? []).filter((i: any) => i.status === 'active' && (i.chunk_count ?? 0) > 0).map((i: any) => i.name);
    const indexes_pending = index_names.filter((n) => !indexes_active.includes(n));

    if (indexes_active.length === 0) {
      await supa.from('retrieval_logs').insert({
        agent_id, run_id, query, index_names, top_k, similarity_threshold, result_count: 0,
        model: embed_model, metadata: { indexes_pending },
      });
      return json({
        ok: true,
        mode: 'pending_pgvector',
        warning: 'No active embeddings for requested indexes. Run vector-ingest-package with mode=embed_and_store first.',
        indexes_requested: index_names,
        indexes_active,
        indexes_pending,
        retrieved_chunks: [],
      });
    }

    let embedding: number[];
    try {
      embedding = await embedOne(query, embed_model);
    } catch (e) {
      return json({ ok: false, error: e instanceof Error ? e.message : 'embed_failed' }, 200);
    }

    // Raw SQL via RPC-like select using <=> cosine distance.
    // We call the table directly with order on cosine distance via SQL string fallback.
    // Supabase JS does not expose <=> directly; use postgrest 'rpc' if defined, else a parameterised select using raw filter.
    // We use a textual cast for the vector.
    const vectorStr = `[${embedding.join(',')}]`;

    // We cannot easily do <=> via supabase-js. Use the underlying REST with a custom SQL via .rpc?
    // Simplest path: select all chunks for the active indexes and compute distance in JS. Cap to 5000 to stay safe.
    const { data: candidates } = await supa
      .from('vector_chunks')
      .select('id,index_name,corpus_name,chunk_id,text,text_excerpt,source_file,chunk_number,metadata,embedding')
      .in('index_name', indexes_active)
      .eq('embedding_status', 'done')
      .limit(2000);

    const scored: any[] = [];
    for (const c of (candidates ?? [])) {
      const emb: any = (c as any).embedding;
      let arr: number[] | null = null;
      if (Array.isArray(emb)) arr = emb;
      else if (typeof emb === 'string') {
        try { arr = JSON.parse(emb); } catch { arr = null; }
      }
      if (!arr || arr.length !== embedding.length) continue;
      let dot = 0, na = 0, nb = 0;
      for (let i = 0; i < arr.length; i++) {
        dot += arr[i] * embedding[i];
        na += arr[i] * arr[i];
        nb += embedding[i] * embedding[i];
      }
      const sim = dot / (Math.sqrt(na) * Math.sqrt(nb) + 1e-9);
      if (sim >= similarity_threshold) {
        scored.push({ ...c, embedding: undefined, similarity: sim });
      }
    }
    scored.sort((a, b) => b.similarity - a.similarity);
    const top = scored.slice(0, top_k);

    await supa.from('retrieval_logs').insert({
      agent_id, run_id, query, index_names, top_k, similarity_threshold,
      result_count: top.length, model: embed_model,
      metadata: { indexes_active, indexes_pending, candidates: candidates?.length ?? 0 },
    });

    return json({
      ok: true,
      mode: 'live',
      indexes_requested: index_names,
      indexes_active,
      indexes_pending,
      retrieved_chunks: top,
    });
  } catch (e) {
    return json({ ok: false, error: e instanceof Error ? e.message : 'unknown' }, 500);
  }
});
