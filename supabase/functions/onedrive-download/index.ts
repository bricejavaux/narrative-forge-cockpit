// deno-lint-ignore-file
import { corsHeaders, hasOneDrive, json } from '../_shared/cors.ts';
import { downloadText } from '../_shared/onedrive.ts';

// Download a UTF-8 text file from OneDrive (no Supabase storage write yet —
// we surface the raw content so the import pipeline can chain it into AI extraction).
Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });
  try {
    const { path } = await req.json().catch(() => ({}));
    if (!path || typeof path !== 'string') return json({ error: 'path required' }, 400);
    if (!hasOneDrive()) {
      return json({ mode: 'mock', path, text: '', message: 'OneDrive non autorisé — simulation.' });
    }
    const r = await downloadText(path);
    if (!r.ok) return json({ mode: 'degraded', path, error: r.error, status: r.status }, 200);
    return json({ mode: 'live', path, size: r.size, text: r.text });
  } catch (e) {
    return json({ error: e instanceof Error ? e.message : 'unknown' }, 500);
  }
});
