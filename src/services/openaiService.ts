import { supabase } from '@/integrations/supabase/client';

// All OpenAI calls go through secure edge functions. Never expose the key in the client.
export type RunOptions = {
  model?: string;
  temperature?: number;
  maxOutputTokens?: number;
  reasoningEffort?: 'low' | 'medium' | 'high';
};

async function invoke<T = any>(name: string, body?: Record<string, unknown>): Promise<T> {
  const { data, error } = await supabase.functions.invoke(name, { body: body ?? {} });
  if (error) throw error;
  return data as T;
}

export const openaiService = {
  transcribeAudio: (audio_path: string, audio_note_id?: string, opts?: RunOptions) =>
    invoke('openai-transcribe-audio', { audio_path, audio_note_id, ...opts }),
  structureNote: (text: string, target_type?: string, target_id?: string, opts?: RunOptions) =>
    invoke('openai-structure-note', { text, target_type, target_id, ...opts }),
  extractCanon: (source_file_id: string, text?: string, opts?: RunOptions) =>
    invoke('openai-extract-canon', { source_file_id, text, ...opts }),
  extractCharacters: (source_file_id: string, text?: string, opts?: RunOptions) =>
    invoke('openai-extract-characters', { source_file_id, text, ...opts }),
  summarizeSource: (source_file_id: string, text?: string, opts?: RunOptions) =>
    invoke('openai-summarize-source', { source_file_id, text, ...opts }),
  generateDiagnostic: (scope: string, opts?: RunOptions, context?: string) =>
    invoke('openai-generate-diagnostic', { scope, context, ...opts }),
  suggestRewrite: (
    target_type: string,
    target_id: string,
    instruction: string,
    current_text?: string,
    opts?: RunOptions,
  ) => invoke('openai-suggest-rewrite', { target_type, target_id, instruction, current_text, ...opts }),
  runAgent: (
    agent_id: string,
    payload: Record<string, unknown>,
    opts?: RunOptions & { instruction?: string; system?: string; qualityProfile?: string; parameters?: Record<string, unknown> },
  ) => invoke('openai-agent-run', { agent_id, payload, ...opts }),
};
