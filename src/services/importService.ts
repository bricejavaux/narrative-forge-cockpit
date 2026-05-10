import { supabase } from '@/integrations/supabase/client';

export type ImportTarget = 'articulation' | 'personnages';

export type ImportPreview = {
  mode: 'mock' | 'live' | 'degraded';
  target: ImportTarget;
  path?: string;
  source_size?: number;
  model?: string;
  extracted?: any;
  raw_preview?: string;
  error?: string;
  message?: string;
};

export const importService = {
  async previewImport(target: ImportTarget): Promise<ImportPreview> {
    const { data, error } = await supabase.functions.invoke('import-source', { body: { target } });
    if (error) throw error;
    return data as ImportPreview;
  },

  async listJobs() {
    const { data, error } = await supabase
      .from('import_jobs')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(20);
    if (error) return [];
    return data ?? [];
  },

  async validate(_importId: string) {
    // Persistence is deferred — once approved by the user, the next phase will
    // write parsed objects into canon_objects / characters with reconcile diffs.
    return { ok: true, message: 'Validation simulée — la persistance Supabase sera activée à la prochaine phase.' };
  },
};
