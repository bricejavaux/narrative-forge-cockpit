import { supabase } from '@/integrations/supabase/client';

// All OpenAI calls go through secure edge functions. Never expose the key in the client.
async function invoke<T = any>(name: string, body?: Record<string, unknown>): Promise<T> {
  const { data, error } = await supabase.functions.invoke(name, { body: body ?? {} });
  if (error) throw error;
  return data as T;
}

export const openaiService = {
  transcribeAudio: (audio_path: string, audio_note_id?: string) =>
    invoke('openai-transcribe-audio', { audio_path, audio_note_id }),
  structureNote: (text: string, target_type?: string, target_id?: string) =>
    invoke('openai-structure-note', { text, target_type, target_id }),
  extractCanon: (source_file_id: string, text?: string) =>
    invoke('openai-extract-canon', { source_file_id, text }),
  extractCharacters: (source_file_id: string, text?: string) =>
    invoke('openai-extract-characters', { source_file_id, text }),
  summarizeSource: (source_file_id: string, text?: string) =>
    invoke('openai-summarize-source', { source_file_id, text }),
  generateDiagnostic: (scope: string) => invoke('openai-generate-diagnostic', { scope }),
  suggestRewrite: (target_type: string, target_id: string, instruction: string) =>
    invoke('openai-suggest-rewrite', { target_type, target_id, instruction }),
  runAgent: (agent_id: string, payload: Record<string, unknown>) =>
    invoke('openai-agent-run', { agent_id, payload }),
};
