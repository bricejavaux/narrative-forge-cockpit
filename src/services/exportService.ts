import { supabase } from '@/integrations/supabase/client';

export type ExportFormat = 'text' | 'markdown' | 'json';

export const exportService = {
  async createSimulated(name: string, format: ExportFormat) {
    return {
      mode: 'mock' as const,
      name,
      format,
      preview: `# ${name}\n\n(Simulation — sera persisté dans la table \`exports\` une fois la sélection humaine validée.)`,
    };
  },
  async list() {
    const { data } = await supabase.from('exports').select('*').order('created_at', { ascending: false }).limit(50);
    return data ?? [];
  },
};
