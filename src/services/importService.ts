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

  async persist(target: ImportTarget, extracted: any): Promise<{
    mode?: string;
    target?: ImportTarget;
    job_id?: string;
    inserted?: number;
    updated?: number;
    skipped?: number;
    errors?: string[];
    details?: Array<{ category?: string; name?: string; title?: string; action: 'insert' | 'update' | 'skip' }>;
    error?: string;
  }> {
    const { data, error } = await supabase.functions.invoke('import-persist', {
      body: { target, extracted, human_validated: true },
    });
    if (error) throw error;
    return data;
  },
};
