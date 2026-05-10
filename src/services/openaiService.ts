import { supabase } from '@/integrations/supabase/client';

// All OpenAI calls go through secure edge functions. Never expose the key in the client.
async function invoke<T = any>(name: string, body?: Record<string, unknown>): Promise<T> {
  const { data, error } = await supabase.functions.invoke(name, { body: body ?? {} });
  if (error) throw error;
  return data as T;
}

export const openaiService = {
  transcribeAudio: (audio_path: string, audio_note_id?: string, model?: string) =>
    invoke('openai-transcribe-audio', { audio_path, audio_note_id, model }),
  structureNote: (text: string, target_type?: string, target_id?: string, model?: string) =>
    invoke('openai-structure-note', { text, target_type, target_id, model }),
  extractCanon: (source_file_id: string, text?: string, model?: string) =>
    invoke('openai-extract-canon', { source_file_id, text, model }),
  extractCharacters: (source_file_id: string, text?: string, model?: string) =>
    invoke('openai-extract-characters', { source_file_id, text, model }),
  summarizeSource: (source_file_id: string, text?: string, model?: string) =>
    invoke('openai-summarize-source', { source_file_id, text, model }),
  generateDiagnostic: (scope: string, model?: string, context?: string) =>
    invoke('openai-generate-diagnostic', { scope, model, context }),
  suggestRewrite: (target_type: string, target_id: string, instruction: string, current_text?: string, model?: string) =>
    invoke('openai-suggest-rewrite', { target_type, target_id, instruction, current_text, model }),
  runAgent: (agent_id: string, payload: Record<string, unknown>, model?: string, instruction?: string) =>
    invoke('openai-agent-run', { agent_id, payload, model, instruction }),
};
