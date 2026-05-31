// deno-lint-ignore-file
// Service-role audio upload bypassing RLS on storage.objects and audio_notes.
// Frontend posts multipart/form-data with the audio blob; we store it under
// audio/{target_type}/{target_id|generic}/{timestamp}-{name} and create an
// audio_notes row, returning audio_path + audio_note_id for downstream transcription.
import { corsHeaders, json } from '../_shared/cors.ts';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SERVICE_ROLE = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const BUCKET = Deno.env.get('AUDIO_BUCKET') || 'audio';

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });
  try {
    if (!SUPABASE_URL || !SERVICE_ROLE) {
      return json({ ok: false, error: 'SUPABASE_URL/SERVICE_ROLE missing' }, 500);
    }
    const ct = req.headers.get('content-type') || '';
    if (!ct.includes('multipart/form-data')) {
      return json({ ok: false, error: 'expected multipart/form-data' }, 400);
    }
    const form = await req.formData();
    const file = form.get('file') as File | null;
    const target_type = String(form.get('target_type') || 'generic');
    const target_id = form.get('target_id') ? String(form.get('target_id')) : null;
    if (!file) return json({ ok: false, error: 'file field required' }, 400);

    const safeName = (file.name || 'audio.webm').replace(/[^a-zA-Z0-9._-]/g, '_');
    const folder = target_id ? `${target_type}/${target_id}` : `${target_type}`;
    const path = `${folder}/${Date.now()}-${safeName}`;

    // Upload via Storage REST (service role bypasses RLS)
    const upRes = await fetch(`${SUPABASE_URL}/storage/v1/object/${BUCKET}/${encodeURI(path)}`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${SERVICE_ROLE}`,
        apikey: SERVICE_ROLE,
        'Content-Type': file.type || 'audio/webm',
        'x-upsert': 'false',
      },
      body: await file.arrayBuffer(),
    });
    if (!upRes.ok) {
      const txt = await upRes.text().catch(() => '');
      return json({ ok: false, error: `storage upload failed (${upRes.status}): ${txt.slice(0, 300)}`, path }, 500);
    }

    // Insert audio_notes row
    const noteRes = await fetch(`${SUPABASE_URL}/rest/v1/audio_notes`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${SERVICE_ROLE}`,
        apikey: SERVICE_ROLE,
        'Content-Type': 'application/json',
        Prefer: 'return=representation',
      },
      body: JSON.stringify({
        target: safeName,
        target_type,
        target_id,
        storage_path: path,
        transcription_status: 'pending',
        treatment_status: 'open',
        duration: form.get('duration_ms') ? `${form.get('duration_ms')}ms` : null,
      }),
    });
    if (!noteRes.ok) {
      const txt = await noteRes.text().catch(() => '');
      return json({ ok: false, error: `audio_notes insert failed (${noteRes.status}): ${txt.slice(0, 300)}`, audio_path: path }, 500);
    }
    const arr = await noteRes.json();
    const row = Array.isArray(arr) ? arr[0] : arr;
    return json({ ok: true, audio_path: path, audio_note_id: row?.id ?? null, bucket: BUCKET });
  } catch (e) {
    return json({ ok: false, error: e instanceof Error ? e.message : 'unknown' }, 500);
  }
});
