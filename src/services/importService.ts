import { supabase } from '@/integrations/supabase/client';
import { openaiService } from './openaiService';

// Import & Reconcile workflow scaffold. Real wiring (file download → storage upload
// → import_jobs steps → human validation) is deferred. Methods return simulated
// progress so the UI can drive the flow end-to-end today.

export type ImportTarget = 'articulation.txt' | 'personnages.txt';

export const importService = {
  async startImport(target: ImportTarget) {
    return {
      mode: 'mock' as const,
      import_id: crypto.randomUUID(),
      target,
      status: 'pending',
      steps: ['sync_from_onedrive', 'copy_to_storage', 'create_source_file', 'extract_with_openai', 'human_validation', 'persist_to_supabase'],
    };
  },

  async runExtraction(target: ImportTarget) {
    if (target === 'articulation.txt') return openaiService.extractCanon('mock-source-id');
    return openaiService.extractCharacters('mock-source-id');
  },

  async validate(_importId: string) {
    return { ok: true, message: 'Validation simulée — sera persistée dans Supabase une fois la connexion OneDrive complète.' };
  },

  async listJobs() {
    const { data, error } = await supabase.from('import_jobs').select('*').order('created_at', { ascending: false }).limit(20);
    if (error) return [];
    return data ?? [];
  },
};
