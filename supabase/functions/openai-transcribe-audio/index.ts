// deno-lint-ignore-file
import { corsHeaders, json } from '../_shared/cors.ts';
import { hasOpenAIKey, defaultOpenAIModel } from '../_shared/openai.ts';

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });
  try {
    const { audio_path, audio_note_id } = await req.json().catch(() => ({}));
    if (!hasOpenAIKey()) {
      return json({
        mode: 'mock',
        provider: 'none',
        reason: 'OPENAI_API_KEY missing — runtime provider not configured',
        message: 'OpenAI key absent — returning simulated transcript.',
        audio_note_id: audio_note_id ?? null,
        audio_path: audio_path ?? null,
        transcript:
          "Note vocale simulée : Brice évoque la veille technique avant Lagrange-4, la signature ΔS non bruitée, et la décision de garder le silence.",
        language: 'fr',
        duration_sec: 47,
      });
    }
    // Key present but the audio download/upload pipeline is not yet implemented.
    return json({
      mode: 'pending',
      provider: 'openai',
      model: Deno.env.get('OPENAI_AUDIO_MODEL') || 'whisper-1',
      message: 'OpenAI key detected. Audio upload/download pipeline pending — transcription not yet operational.',
      next_steps: [
        'Wire audio retrieval from Supabase Storage bucket "audio"',
        'POST audio buffer to https://api.openai.com/v1/audio/transcriptions',
        'Persist transcript on the audio_notes row',
      ],
      audio_path: audio_path ?? null,
      audio_note_id: audio_note_id ?? null,
      transcript: null,
    });
  } catch (e) {
    return json({ error: e instanceof Error ? e.message : 'unknown' }, 500);
  }
});
