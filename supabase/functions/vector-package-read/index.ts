// deno-lint-ignore-file
// Reads a OneDrive vector-source package: manifest.json + source_inventory.csv head + chunks.jsonl sample.
// Pure read — never writes anywhere. Returns mock structure if OneDrive is not authorised.

import { corsHeaders, hasOneDrive, json } from '../_shared/cors.ts';
import { downloadText } from '../_shared/onedrive.ts';

type Corpus = 'follett' | 'sf_portals_fiction' | 'science_portals';

const ROOT = 'Documents/Projet Roman/Les_Arches/06_vector_sources';

const PATHS: Record<Corpus, { manifest: string; inventory: string; chunks: string; targetIndex: string }> = {
  follett: {
    manifest: `${ROOT}/follett/05_manifest/manifest.json`,
    inventory: `${ROOT}/follett/05_manifest/source_inventory.csv`,
    chunks: `${ROOT}/follett/04_chunks/chunks.jsonl`,
    targetIndex: 'style_index',
  },
  sf_portals_fiction: {
    manifest: `${ROOT}/sf_portals_fiction/05_manifest/manifest.json`,
    inventory: `${ROOT}/sf_portals_fiction/05_manifest/source_inventory.csv`,
    chunks: `${ROOT}/sf_portals_fiction/04_chunks/chunks.jsonl`,
    targetIndex: 'fiction_reference_index',
  },
  science_portals: {
    manifest: `${ROOT}/science_portals/04_manifest/manifest.json`,
    inventory: `${ROOT}/science_portals/04_manifest/source_inventory.csv`,
    chunks: `${ROOT}/science_portals/03_chunks/chunks.jsonl`,
    targetIndex: 'science_index',
  },
};

function parseCsv(text: string, limit = 20): { columns: string[]; rows: string[][]; total: number } {
  const lines = text.split(/\r?\n/).filter((l) => l.length > 0);
  if (!lines.length) return { columns: [], rows: [], total: 0 };
  const split = (l: string) => {
    const out: string[] = [];
    let cur = '';
    let inQuote = false;
    for (let i = 0; i < l.length; i++) {
      const c = l[i];
      if (c === '"') { inQuote = !inQuote; continue; }
      if (c === ',' && !inQuote) { out.push(cur); cur = ''; continue; }
      cur += c;
    }
    out.push(cur);
    return out;
  };
  const columns = split(lines[0]);
  const rows = lines.slice(1, 1 + limit).map(split);
  return { columns, rows, total: lines.length - 1 };
}

function parseJsonl(text: string, limit = 5) {
  const out: any[] = [];
  let total = 0;
  for (const line of text.split(/\r?\n/)) {
    if (!line.trim()) continue;
    total++;
    if (out.length < limit) {
      try { out.push(JSON.parse(line)); } catch { /* skip malformed */ }
    }
  }
  return { sample: out, total };
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });
  try {
    const { corpus, sampleSize } = await req.json().catch(() => ({}));
    const def = PATHS[corpus as Corpus];
    if (!def) return json({ error: `corpus invalide. Attendus: ${Object.keys(PATHS).join(', ')}` }, 400);

    if (!hasOneDrive()) {
      return json({
        mode: 'mock',
        corpus,
        target_index: def.targetIndex,
        manifest: null,
        inventory: { columns: [], rows: [], total: 0 },
        chunks: { sample: [], total: 0 },
        message: 'OneDrive non autorisé — réponse simulée. Les chemins sont indiqués pour référence.',
        paths: def,
      });
    }

    const [m, inv, ch] = await Promise.all([
      downloadText(def.manifest),
      downloadText(def.inventory),
      downloadText(def.chunks),
    ]);

    const limit = Math.max(1, Math.min(20, Number(sampleSize) || 5));

    let manifestJson: any = null;
    let manifestError: string | undefined;
    if (m.ok && m.text) {
      try { manifestJson = JSON.parse(m.text); }
      catch (e) { manifestError = e instanceof Error ? e.message : 'parse_error'; }
    } else {
      manifestError = m.error ?? `status ${m.status}`;
    }

    const inventory = inv.ok && inv.text
      ? parseCsv(inv.text, 20)
      : { columns: [], rows: [], total: 0, error: inv.error ?? `status ${inv.status}` };

    const chunks = ch.ok && ch.text
      ? parseJsonl(ch.text, limit)
      : { sample: [], total: 0, error: ch.error ?? `status ${ch.status}` };

    return json({
      mode: 'live',
      corpus,
      target_index: def.targetIndex,
      paths: def,
      manifest: manifestJson,
      manifest_error: manifestError,
      inventory,
      chunks,
    });
  } catch (e) {
    return json({ error: e instanceof Error ? e.message : 'unknown' }, 500);
  }
});
