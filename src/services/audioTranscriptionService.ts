import { supabase } from '@/integrations/supabase/client';
import { openaiService } from './openaiService';

export const audioTranscriptionService = {
  /** Upload an audio file to Supabase Storage and create an audio_notes row. */
  async uploadAudio(file: File, target_type: string, target_id?: string) {
    const path = `${target_type}/${Date.now()}-${file.name}`;
    const { error: upErr } = await supabase.storage.from('audio').upload(path, file, { upsert: false });
    if (upErr) return { ok: false as const, error: upErr.message };
    const { data: note, error: nErr } = await supabase
      .from('audio_notes')
      .insert({
        target: file.name,
        target_type,
        target_id: target_id ?? null,
        storage_path: path,
        transcription_status: 'pending',
        treatment_status: 'open',
      })
      .select('id')
      .single();
    if (nErr) return { ok: false as const, error: nErr.message };
    return { ok: true as const, audio_note_id: note.id, audio_path: path };
  },
  async transcribe(audio_path: string, audio_note_id?: string) {
    return openaiService.transcribeAudio(audio_path, audio_note_id);
  },
  async structure(text: string, target_type?: string, target_id?: string) {
    return openaiService.structureNote(text, target_type, target_id);
  },
};
