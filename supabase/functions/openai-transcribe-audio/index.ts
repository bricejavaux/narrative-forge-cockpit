// deno-lint-ignore-file
import { corsHeaders, hasOpenAI, json } from '../_shared/cors.ts';

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });
  try {
    const { audio_path, audio_note_id } = await req.json().catch(() => ({}));
    if (!hasOpenAI()) {
      return json({
        mode: 'mock',
        message: 'OPENAI_API_KEY not configured — returning simulated transcript.',
        audio_note_id: audio_note_id ?? null,
        audio_path: audio_path ?? null,
        transcript:
          "Note vocale simulée : Brice évoque la veille technique avant Lagrange-4, la signature ΔS non bruitée, et la décision de garder le silence.",
        language: 'fr',
        duration_sec: 47,
      });
    }
    // Real path (kept stubbed — no audio buffer wired yet)
    return json({
      mode: 'live',
      message: 'OPENAI_API_KEY present but real audio pipeline not yet wired.',
      audio_path: audio_path ?? null,
      transcript: null,
    });
  } catch (e) {
    return json({ error: e instanceof Error ? e.message : 'unknown' }, 500);
  }
});
