import { openaiService } from './openaiService';

export const audioTranscriptionService = {
  async transcribe(audio_path: string, audio_note_id?: string) {
    return openaiService.transcribeAudio(audio_path, audio_note_id);
  },
  async structure(text: string, target_type?: string, target_id?: string) {
    return openaiService.structureNote(text, target_type, target_id);
  },
};
