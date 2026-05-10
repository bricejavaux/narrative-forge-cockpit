// deno-lint-ignore-file
// Minimal text/markdown/JSON export.
// - Always creates an `exports` row in Supabase if SUPABASE_URL + SERVICE_ROLE_KEY are present.
// - Optionally uploads the file to OneDrive at Documents/Projet Roman/Les_Arches/04_exports/{filename}.
// - PDF/DOCX/EPUB remain future / not implemented.

import { corsHeaders, hasOneDrive, json } from '../_shared/cors.ts';
import { uploadText } from '../_shared/onedrive.ts';

const ONEDRIVE_EXPORT_DIR = 'Documents/Projet Roman/Les_Arches/04_exports';

type Format = 'txt' | 'md' | 'json';
type Destination = 'supabase' | 'onedrive' | 'both';

function mimeFor(format: Format) {
  if (format === 'md') return 'text/markdown; charset=utf-8';
  if (format === 'json') return 'application/json; charset=utf-8';
  return 'text/plain; charset=utf-8';
}

async function persistSupabase(name: string, format: Format, contentSize: number, onedrivePath: string | null) {
  const url = Deno.env.get('SUPABASE_URL');
  const key = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  if (!url || !key) return { ok: false, error: 'supabase env missing' };
  const res = await fetch(`${url}/rest/v1/exports`, {
    method: 'POST',
    headers: {
      apikey: key,
      Authorization: `Bearer ${key}`,
      'Content-Type': 'application/json',
      Prefer: 'return=representation',
    },
    body: JSON.stringify({
      name,
      format,
      category: 'travail',
      destination: onedrivePath ? `onedrive:${onedrivePath}` : 'supabase',
      engine_status: 'live',
      metadata: { size: contentSize, onedrive_path: onedrivePath },
      last_generation: new Date().toISOString(),
    }),
  });
  if (!res.ok) return { ok: false, error: `supabase ${res.status}: ${(await res.text()).slice(0, 200)}` };
  const rows = await res.json();
  return { ok: true, id: rows?.[0]?.id ?? null };
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });
  try {
    const body = await req.json().catch(() => ({}));
    const filename = String(body.filename ?? '').trim();
    const format = (String(body.format ?? 'txt') as Format);
    const destination = (String(body.destination ?? 'supabase') as Destination);
    const content = String(body.content ?? '');

    if (!filename) return json({ error: 'filename required' }, 400);
    if (!['txt', 'md', 'json'].includes(format)) return json({ error: 'format must be txt|md|json' }, 400);
    if (!content) return json({ error: 'content required' }, 400);

    const warnings: string[] = [];
    let onedrive_path: string | null = null;
    let onedrive_web_url: string | undefined;
    let onedrive_status: 'uploaded' | 'unavailable' | 'failed' | 'skipped' = 'skipped';

    if (destination === 'onedrive' || destination === 'both') {
      if (!hasOneDrive()) {
        onedrive_status = 'unavailable';
        warnings.push('OneDrive non disponible — export OneDrive ignoré.');
      } else {
        const path = `${ONEDRIVE_EXPORT_DIR}/${filename}`;
        const up = await uploadText(path, content, mimeFor(format));
        if (up.ok) {
          onedrive_status = 'uploaded';
          onedrive_path = path;
          onedrive_web_url = up.webUrl;
        } else {
          onedrive_status = 'failed';
          warnings.push(`OneDrive upload failed (${up.status}): ${(up.error ?? '').slice(0, 200)}`);
        }
      }
    }

    let supabase_status: 'persisted' | 'unavailable' | 'failed' | 'skipped' = 'skipped';
    let supabase_id: string | null = null;
    if (destination === 'supabase' || destination === 'both') {
      const r = await persistSupabase(filename, format, content.length, onedrive_path);
      if (r.ok) {
        supabase_status = 'persisted';
        supabase_id = r.id ?? null;
      } else {
        supabase_status = 'failed';
        warnings.push(`Supabase persist failed: ${r.error}`);
      }
    }

    const mode =
      (onedrive_status === 'uploaded' || supabase_status === 'persisted')
        ? (warnings.length ? 'degraded' : 'live')
        : 'degraded';

    return json({
      mode,
      destination,
      filename,
      format,
      onedrive_status,
      onedrive_path,
      onedrive_web_url,
      supabase_status,
      supabase_id,
      size: content.length,
      warnings,
    });
  } catch (e) {
    return json({ error: e instanceof Error ? e.message : 'unknown' }, 500);
  }
});
