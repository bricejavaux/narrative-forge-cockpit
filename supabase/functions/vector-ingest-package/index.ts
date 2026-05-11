// deno-lint-ignore-file
// vector-ingest-package: prepare or fully ingest a vector package into pgvector.
// Modes:
//   - metadata_only: insert vector_documents + vector_chunks rows without embeddings.
//   - embed_and_store: also call OpenAI embeddings and write embedding column.
// Never runs automatically. Caller must specify corpus_name and target_index.
import { corsHeaders, json } from '../_shared/cors.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.4';

const OPENAI_EMBED_URL = 'https://api.openai.com/v1/embeddings';
const DEFAULT_EMBED_MODEL = 'text-embedding-3-small';

async function embedBatch(texts: string[], model: string): Promise<number[][]> {
  const key = Deno.env.get('OPENAI_API_KEY');
  if (!key) throw new Error('OPENAI_API_KEY missing');
  const res = await fetch(OPENAI_EMBED_URL, {
    method: 'POST',
    headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ model, input: texts }),
  });
  if (!res.ok) throw new Error(`openai embeddings ${res.status}: ${(await res.text()).slice(0, 400)}`);
  const data = await res.json();
  return data.data.map((d: any) => d.embedding);
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });
  try {
    const body = await req.json().catch(() => ({}));
    const corpus_name = String(body.corpus_name ?? '').trim();
    const target_index = String(body.target_index ?? '').trim();
    const mode = (body.mode ?? 'metadata_only') as 'metadata_only' | 'embed_and_store';
    const limit = Math.max(0, Math.min(2000, Number(body.limit ?? 0))) || null;
    const embedding_model = String(body.embedding_model ?? DEFAULT_EMBED_MODEL);
    const dry_run = Boolean(body.dry_run);

    if (!corpus_name || !target_index) {
      return json({ ok: false, error: 'corpus_name and target_index are required' }, 400);
    }

    const supa = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      { auth: { persistSession: false } },
    );

    // Find package metadata for this corpus
    const { data: pkg } = await supa
      .from('vector_source_packages')
      .select('*')
      .eq('corpus_name', corpus_name)
      .maybeSingle();

    if (!pkg) return json({ ok: false, error: `package not found for corpus ${corpus_name}` }, 404);

    // Read chunks from existing vector-package-read function (proxies OneDrive)
    const readResp = await fetch(`${Deno.env.get('SUPABASE_URL')}/functions/v1/vector-package-read`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''}`,
        apikey: Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      },
      body: JSON.stringify({ corpus: corpus_name, sampleSize: limit ?? 2000 }),
    });
    const readData = await readResp.json().catch(() => ({}));
    const sampleChunks = Array.isArray(readData?.chunks?.sample) ? readData.chunks.sample : [];

    if (sampleChunks.length === 0) {
      return json({
        ok: false,
        error: 'no chunks found in package (vector-package-read returned empty)',
        package_read: readData,
      }, 200);
    }

    if (dry_run) {
      return json({
        ok: true,
        dry_run: true,
        corpus: corpus_name,
        target_index,
        mode,
        would_ingest: sampleChunks.length,
        sample: sampleChunks.slice(0, 2),
      });
    }

    // Ensure index row exists
    await supa.from('vector_indexes').upsert(
      { name: target_index, embedding_model, dimensions: 1536, status: mode === 'embed_and_store' ? 'embedding' : 'metadata_only' },
      { onConflict: 'name' },
    );

    // Doc row (one per package)
    const { data: doc } = await supa
      .from('vector_documents')
      .insert({
        corpus_name,
        source_file: pkg.onedrive_path,
        source_path: pkg.onedrive_path,
        rights: pkg.rights,
        usage: pkg.usage,
        metadata: { package_id: pkg.id },
      })
      .select('id')
      .single();

    const docId = doc?.id ?? null;

    // Prepare chunk rows
    const rows = sampleChunks.map((c: any, i: number) => {
      const text = c.text ?? c.content ?? c.text_excerpt ?? '';
      return {
        index_name: target_index,
        corpus_name,
        chunk_id: c.chunk_id ?? `${corpus_name}-${docId}-${i}`,
        document_id: docId,
        source_file: c.source_file ?? pkg.onedrive_path,
        source_id: c.source_id ?? null,
        chunk_number: c.chunk_number ?? i,
        target_index,
        usage: c.usage ?? pkg.usage,
        rights: c.rights ?? pkg.rights,
        text,
        text_excerpt: typeof text === 'string' ? text.slice(0, 240) : null,
        metadata: c,
        embedding_model: mode === 'embed_and_store' ? embedding_model : null,
        embedding_status: mode === 'embed_and_store' ? 'pending' : 'metadata_only',
      } as any;
    });

    let embeddingsWritten = 0;

    if (mode === 'embed_and_store') {
      // Batch by 32
      const BATCH = 32;
      for (let i = 0; i < rows.length; i += BATCH) {
        const batch = rows.slice(i, i + BATCH);
        const texts = batch.map((r) => (typeof r.text === 'string' ? r.text.slice(0, 8000) : ''));
        try {
          const vectors = await embedBatch(texts, embedding_model);
          for (let j = 0; j < batch.length; j++) {
            batch[j].embedding = vectors[j];
            batch[j].embedding_status = 'done';
          }
          embeddingsWritten += batch.length;
        } catch (e) {
          for (const r of batch) {
            r.embedding_status = 'error';
            r.metadata = { ...(r.metadata ?? {}), embedding_error: String(e) };
          }
        }
      }
    }

    // Upsert chunks
    const { error: insErr, count } = await supa
      .from('vector_chunks')
      .upsert(rows, { onConflict: 'chunk_id', count: 'exact' });
    if (insErr) return json({ ok: false, error: insErr.message, stage: 'upsert_chunks' }, 500);

    // Update index counters
    await supa
      .from('vector_indexes')
      .update({
        chunk_count: count ?? rows.length,
        status: mode === 'embed_and_store' && embeddingsWritten > 0 ? 'active' : 'metadata_only',
      })
      .eq('name', target_index);

    return json({
      ok: true,
      corpus: corpus_name,
      target_index,
      mode,
      chunks_written: rows.length,
      embeddings_written: embeddingsWritten,
      pgvector_active: mode === 'embed_and_store' && embeddingsWritten > 0,
    });
  } catch (e) {
    return json({ ok: false, error: e instanceof Error ? e.message : 'unknown' }, 500);
  }
});
