// deno-lint-ignore-file
// Import & reconcile preview: downloads a source from OneDrive, runs Lovable AI
// extraction, and returns the parsed result so the UI can show a reconcile diff.
// No DB writes yet — the user validates before persistence.

import { corsHeaders, hasLovableAI, hasOneDrive, json } from '../_shared/cors.ts';
import { downloadText } from '../_shared/onedrive.ts';
import { callLovableAI } from '../_shared/lovableAI.ts';

const ROOT = 'Documents/Projet Roman/Les_Arches';

const TARGETS: Record<string, { path: string; kind: 'canon' | 'characters' }> = {
  articulation: { path: `${ROOT}/01_sources/articulation.txt`, kind: 'canon' },
  personnages: { path: `${ROOT}/01_sources/personnages.txt`, kind: 'characters' },
};

const CANON_SCHEMA = `Réponds STRICTEMENT en JSON :
{
  "world_rules":[{"title":string,"criticality":"critical"|"high"|"medium"|"low","summary":string}],
  "constraints":[{"title":string,"rigidity":"hard"|"soft","summary":string}],
  "failure_modes":[{"title":string,"criticality":string,"summary":string}],
  "organizations":[{"title":string,"summary":string}],
  "technologies":[{"title":string,"summary":string}],
  "locations":[{"title":string,"summary":string}],
  "glossary":[{"term":string,"definition":string}]
}`;

const CHAR_SCHEMA = `Réponds STRICTEMENT en JSON :
{"characters":[{"name":string,"role":string,"function":string,"apparent_goal":string,"real_goal":string,"flaw":string,"secret":string,"forbidden":string,"emotional_trajectory":string,"breaking_point":string,"narrative_weight":number,"exposure_level":number}]}`;

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });
  try {
    const { target } = await req.json().catch(() => ({}));
    const def = TARGETS[target as string];
    if (!def) return json({ error: `target invalide. Attendus: ${Object.keys(TARGETS).join(', ')}` }, 400);

    if (!hasOneDrive() || !hasLovableAI()) {
      return json({
        mode: 'mock',
        target,
        path: def.path,
        message: 'OneDrive ou Lovable AI non disponibles — preview simulée.',
        extracted: null,
      });
    }

    const dl = await downloadText(def.path);
    if (!dl.ok) {
      return json({ mode: 'degraded', target, path: def.path, error: dl.error ?? 'download_failed', status: dl.status }, 200);
    }
    const text = (dl.text ?? '').slice(0, 80000);

    const schemaHint = def.kind === 'canon' ? CANON_SCHEMA : CHAR_SCHEMA;
    const r = await callLovableAI({
      messages: [
        { role: 'system', content: `Tu structures un document du roman "Les Portes du Monde, Tome I". ${schemaHint}` },
        { role: 'user', content: text },
      ],
      json: true,
    });
    if (!r.ok) return json({ mode: 'degraded', target, path: def.path, source_size: dl.size, error: r.error }, 200);

    return json({
      mode: 'live',
      target,
      path: def.path,
      source_size: dl.size,
      model: r.model,
      extracted: r.parsed ?? null,
      raw_preview: r.parsed ? undefined : (r.text ?? '').slice(0, 4000),
    });
  } catch (e) {
    return json({ error: e instanceof Error ? e.message : 'unknown' }, 500);
  }
});
