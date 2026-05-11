// deno-lint-ignore-file
// Reads vector-source packages from OneDrive (manifest + inventory + chunks.jsonl line count)
// and upserts metadata into public.vector_source_packages.
// Does NOT ingest full chunk text — chunks stay in OneDrive.

import { corsHeaders, hasOneDrive, json } from '../_shared/cors.ts';
import { downloadText } from '../_shared/onedrive.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';

type Corpus = 'follett' | 'sf_portals_fiction' | 'science_portals';

const ROOT = 'Documents/Projet Roman/Les_Arches/06_vector_sources';

const PATHS: Record<Corpus, { onedrive: string; manifest: string; inventory: string; chunks: string; targetIndex: string; rights: string; usage: string }> = {
  follett: {
    onedrive: `${ROOT}/follett`,
    manifest: `${ROOT}/follett/05_manifest/manifest.json`,
    inventory: `${ROOT}/follett/05_manifest/source_inventory.csv`,
    chunks: `${ROOT}/follett/04_chunks/chunks.jsonl`,
    targetIndex: 'style_index',
    rights: 'private',
    usage: 'private reference only — no direct imitation',
  },
  sf_portals_fiction: {
    onedrive: `${ROOT}/sf_portals_fiction`,
    manifest: `${ROOT}/sf_portals_fiction/05_manifest/manifest.json`,
    inventory: `${ROOT}/sf_portals_fiction/05_manifest/source_inventory.csv`,
    chunks: `${ROOT}/sf_portals_fiction/04_chunks/chunks.jsonl`,
    targetIndex: 'fiction_reference_index',
    rights: 'private',
    usage: 'private reference only — no direct reuse',
  },
  science_portals: {
    onedrive: `${ROOT}/science_portals`,
    manifest: `${ROOT}/science_portals/04_manifest/manifest.json`,
    inventory: `${ROOT}/science_portals/04_manifest/source_inventory.csv`,
    chunks: `${ROOT}/science_portals/03_chunks/chunks.jsonl`,
    targetIndex: 'science_index',
    rights: 'reference',
    usage: 'preferred first candidate for pgvector ingestion',
  },
};

function countLines(text: string): number {
  let n = 0;
  for (const line of text.split(/\r?\n/)) if (line.trim()) n++;
  return n;
}

function countCsvRows(text: string): number {
  const lines = text.split(/\r?\n/).filter((l) => l.length > 0);
  return Math.max(0, lines.length - 1);
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });
  try {
    const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
    const SERVICE_ROLE = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    if (!SUPABASE_URL || !SERVICE_ROLE) {
      return json({ mode: 'degraded', error: 'Supabase env missing' }, 200);
    }
    const supa = createClient(SUPABASE_URL, SERVICE_ROLE);

    const corpora: Corpus[] = ['follett', 'sf_portals_fiction', 'science_portals'];
    const results: any[] = [];

    if (!hasOneDrive()) {
      // Touch updated_at only — no real data read.
      return json({
        mode: 'mock',
        message: 'OneDrive non autorisé — sync ignorée. Métadonnées Supabase inchangées.',
        synced: [],
      });
    }

    for (const corpus of corpora) {
      const def = PATHS[corpus];
      const [m, inv, ch] = await Promise.all([
        downloadText(def.manifest),
        downloadText(def.inventory),
        downloadText(def.chunks),
      ]);

      let manifest: any = null;
      let manifestError: string | undefined;
      if (m.ok && m.text) {
        try { manifest = JSON.parse(m.text); } catch (e) { manifestError = e instanceof Error ? e.message : 'parse_error'; }
      } else {
        manifestError = m.error ?? `status ${m.status}`;
      }

      const chunkCountFromFile = ch.ok && ch.text ? countLines(ch.text) : null;
      const inventoryCount = inv.ok && inv.text ? countCsvRows(inv.text) : null;

      const producedChunkCount =
        manifest?.produced_chunk_count ??
        manifest?.chunks_count ??
        manifest?.total_chunks ??
        chunkCountFromFile ??
        null;

      const sourceFileCount =
        manifest?.source_file_count ??
        manifest?.sources_count ??
        inventoryCount ??
        null;

      const lastGenerated =
        manifest?.generated_at ??
        manifest?.last_generated ??
        manifest?.created_at ??
        null;

      const chunkStrategy = manifest?.chunk_strategy ?? manifest?.strategy ?? null;
      const embeddingsCreated = !!(manifest?.embeddings_created ?? manifest?.embeddings?.created);
      const ingestionStatus = manifest?.ingestion_status ?? 'chunks_ready_pgvector_pending';

      const row = {
        corpus_name: corpus,
        onedrive_path: def.onedrive,
        manifest_path: def.manifest,
        chunks_path: def.chunks,
        inventory_path: def.inventory,
        target_index: def.targetIndex,
        produced_chunk_count: producedChunkCount,
        source_file_count: sourceFileCount,
        chunk_strategy: chunkStrategy,
        rights: manifest?.rights ?? def.rights,
        usage: manifest?.usage ?? def.usage,
        embeddings_created: embeddingsCreated,
        ingestion_status: ingestionStatus,
        last_generated: lastGenerated,
        metadata: {
          manifest_present: !!manifest,
          manifest_error: manifestError,
          inventory_present: inv.ok,
          chunks_present: ch.ok,
          chunk_count_from_file: chunkCountFromFile,
          inventory_count: inventoryCount,
          manifest_raw_keys: manifest ? Object.keys(manifest) : [],
        },
        updated_at: new Date().toISOString(),
      };

      const { error } = await supa
        .from('vector_source_packages')
        .upsert(row, { onConflict: 'corpus_name' });

      results.push({
        corpus,
        ok: !error,
        error: error?.message,
        produced_chunk_count: producedChunkCount,
        source_file_count: sourceFileCount,
        last_generated: lastGenerated,
        manifest_present: !!manifest,
      });
    }

    return json({ mode: 'live', synced: results });
  } catch (e) {
    return json({ mode: 'degraded', error: e instanceof Error ? e.message : 'unknown' }, 200);
  }
});
