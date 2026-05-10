// Mock audio transcription pipeline.
// Full simulated workflow: captured → transcribed → structured → validated → integrated → indexed.
import { openaiService } from './openaiService';

export type TranscriptionStage =
  | 'captured' | 'transcribed' | 'structured' | 'pending_validation' | 'integrated' | 'indexed';

export const audioTranscriptionService = {
  isConnected: () => false,
  async process(blob: Blob): Promise<{ stage: TranscriptionStage; text: string }> {
    const text = await openaiService.transcribe(blob);
    return { stage: 'transcribed', text };
  },
};
