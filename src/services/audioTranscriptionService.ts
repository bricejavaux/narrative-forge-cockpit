import { supabase } from '@/integrations/supabase/client';
import { openaiService } from './openaiService';

export const audioTranscriptionService = {
  /**
   * Upload audio via service-role edge function (bypasses storage/audio_notes RLS).
   * Returns the storage path + audio_note_id for downstream transcription.
   */
  async uploadAudio(file: File, target_type: string, target_id?: string, duration_ms?: number) {
    const form = new FormData();
    form.append('file', file, file.name);
    form.append('target_type', target_type);
    if (target_id) form.append('target_id', target_id);
    if (duration_ms) form.append('duration_ms', String(duration_ms));
    const { data, error } = await supabase.functions.invoke('audio-upload', { body: form });
    if (error) return { ok: false as const, error: error.message };
    if (!data?.ok) return { ok: false as const, error: data?.error ?? 'upload failed' };
    return { ok: true as const, audio_note_id: data.audio_note_id as string | null, audio_path: data.audio_path as string };
  },
  async transcribe(audio_path: string, audio_note_id?: string | null) {
    return openaiService.transcribeAudio(audio_path, audio_note_id ?? undefined);
  },
  async structure(text: string, target_type?: string, target_id?: string) {
    return openaiService.structureNote(text, target_type, target_id);
  },
};
