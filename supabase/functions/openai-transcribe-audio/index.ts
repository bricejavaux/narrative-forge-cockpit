// deno-lint-ignore-file
import { corsHeaders, json } from '../_shared/cors.ts';
import { hasOpenAIKey } from '../_shared/openai.ts';

// Real Whisper pipeline:
//  1. download audio file from Supabase Storage (bucket "audio") using service role
//  2. POST to OpenAI /v1/audio/transcriptions (whisper-1)
//  3. persist transcript on audio_transcripts and update audio_notes
//  4. return mode = live + transcript
// If any step fails, return mode = degraded with a clear reason — never a fake transcript.

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SERVICE_ROLE = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const AUDIO_BUCKET = Deno.env.get('AUDIO_BUCKET') || 'audio';
const AUDIO_MODEL = Deno.env.get('OPENAI_AUDIO_MODEL') || 'whisper-1';

async function downloadFromStorage(path: string): Promise<{ ok: true; blob: Blob; contentType: string } | { ok: false; error: string }> {
  if (!SUPABASE_URL || !SERVICE_ROLE) return { ok: false, error: 'SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY missing' };
  const url = `${SUPABASE_URL}/storage/v1/object/${AUDIO_BUCKET}/${encodeURI(path)}`;
  const res = await fetch(url, { headers: { Authorization: `Bearer ${SERVICE_ROLE}`, apikey: SERVICE_ROLE } });
  if (!res.ok) {
    const t = await res.text().catch(() => '');
    return { ok: false, error: `storage download failed (${res.status}): ${t.slice(0, 200)}` };
  }
  return { ok: true, blob: await res.blob(), contentType: res.headers.get('content-type') || 'audio/mpeg' };
}

async function callWhisper(blob: Blob, filename: string) {
  const key = Deno.env.get('OPENAI_API_KEY')!;
  const fd = new FormData();
  fd.append('file', blob, filename || 'audio.webm');
  fd.append('model', AUDIO_MODEL);
  fd.append('response_format', 'verbose_json');
  const res = await fetch('https://api.openai.com/v1/audio/transcriptions', {
    method: 'POST',
    headers: { Authorization: `Bearer ${key}` },
    body: fd,
  });
  if (!res.ok) {
    const t = await res.text().catch(() => '');
    return { ok: false as const, status: res.status, error: t.slice(0, 400) };
  }
  return { ok: true as const, data: await res.json() };
}

async function persist(audio_note_id: string | null, transcript: string, language: string | null, duration: number | null) {
  if (!audio_note_id || !SUPABASE_URL || !SERVICE_ROLE) return { persisted: false, reason: 'no audio_note_id or service role' };
  const headers = {
    Authorization: `Bearer ${SERVICE_ROLE}`,
    apikey: SERVICE_ROLE,
    'Content-Type': 'application/json',
    Prefer: 'return=representation',
  };
  try {
    await fetch(`${SUPABASE_URL}/rest/v1/audio_transcripts`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        audio_note_id,
        raw_text: transcript,
        status: 'done',
        model: AUDIO_MODEL,
        structured: { language, duration_sec: duration },
      }),
    });
    await fetch(`${SUPABASE_URL}/rest/v1/audio_notes?id=eq.${audio_note_id}`, {
      method: 'PATCH',
      headers,
      body: JSON.stringify({ transcription_status: 'done' }),
    });
    return { persisted: true };
  } catch (e) {
    return { persisted: false, reason: e instanceof Error ? e.message : 'persist_failed' };
  }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });
  try {
    const { audio_path, audio_note_id } = await req.json().catch(() => ({}));

    if (!hasOpenAIKey()) {
      return json({
        mode: 'mock',
        provider: 'none',
        reason: 'OPENAI_API_KEY missing',
        audio_path: audio_path ?? null,
        audio_note_id: audio_note_id ?? null,
        transcript: null,
      });
    }
    if (!audio_path) {
      return json({ mode: 'degraded', provider: 'openai', reason: 'audio_path required', transcript: null }, 400);
    }

    const dl = await downloadFromStorage(audio_path);
    if (!dl.ok) {
      return json({
        mode: 'degraded',
        provider: 'openai',
        reason: `OpenAI configured, but audio file download failed: ${dl.error}`,
        audio_path,
        audio_note_id: audio_note_id ?? null,
        transcript: null,
      });
    }

    const whisper = await callWhisper(dl.blob, audio_path.split('/').pop() || 'audio');
    if (!whisper.ok) {
      return json({
        mode: 'degraded',
        provider: 'openai',
        reason: `Whisper call failed (${whisper.status}): ${whisper.error}`,
        audio_path,
        audio_note_id: audio_note_id ?? null,
        transcript: null,
      });
    }

    const transcript: string = whisper.data?.text ?? '';
    const language: string | null = whisper.data?.language ?? null;
    const duration: number | null = whisper.data?.duration ?? null;
    const persistResult = await persist(audio_note_id ?? null, transcript, language, duration);

    return json({
      mode: 'live',
      provider: 'openai',
      model: AUDIO_MODEL,
      audio_path,
      audio_note_id: audio_note_id ?? null,
      transcript,
      language,
      duration_sec: duration,
      persistence: persistResult,
    });
  } catch (e) {
    return json({ mode: 'degraded', provider: 'openai', error: e instanceof Error ? e.message : 'unknown' }, 500);
  }
});
