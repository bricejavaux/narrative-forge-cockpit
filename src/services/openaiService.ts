// Mock OpenAI service. NOT connected. Future home for orchestration,
// transcription (Whisper), audit, generation and rewrite calls.
export const openaiService = {
  isConnected: () => false,
  async transcribe(_blob: Blob): Promise<string> {
    return Promise.resolve('[transcription simulée]');
  },
  async structure(_text: string): Promise<{ action: string; priority: 'high' | 'medium' | 'low' }> {
    return Promise.resolve({ action: 'tâche simulée', priority: 'medium' });
  },
  async audit(_kind: string, _payload: unknown): Promise<{ findings: string[] }> {
    return Promise.resolve({ findings: [] });
  },
  async rewrite(_text: string, _instructions: string): Promise<string> {
    return Promise.resolve('[réécriture simulée]');
  },
};
