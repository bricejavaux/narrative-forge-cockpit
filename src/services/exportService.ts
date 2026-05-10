import { supabase } from '@/integrations/supabase/client';

export type ExportFormat = 'txt' | 'md' | 'json';
export type ExportDestination = 'supabase' | 'onedrive' | 'both';

export type ExportResult = {
  mode: 'live' | 'degraded' | 'mock';
  destination: ExportDestination;
  filename: string;
  format: ExportFormat;
  onedrive_status: 'uploaded' | 'unavailable' | 'failed' | 'skipped';
  onedrive_path: string | null;
  onedrive_web_url?: string;
  supabase_status: 'persisted' | 'unavailable' | 'failed' | 'skipped';
  supabase_id: string | null;
  size: number;
  warnings: string[];
};

async function invokeExport(params: {
  filename: string;
  format: ExportFormat;
  content: string;
  destination: ExportDestination;
}): Promise<ExportResult> {
  const { data, error } = await supabase.functions.invoke('export-text', { body: params });
  if (error) throw error;
  return data as ExportResult;
}

export const exportService = {
  createTextExport: (filename: string, content: string, destination: ExportDestination = 'supabase') =>
    invokeExport({ filename: filename.endsWith('.txt') ? filename : `${filename}.txt`, format: 'txt', content, destination }),
  createMarkdownExport: (filename: string, content: string, destination: ExportDestination = 'supabase') =>
    invokeExport({ filename: filename.endsWith('.md') ? filename : `${filename}.md`, format: 'md', content, destination }),
  createJsonExport: (filename: string, content: unknown, destination: ExportDestination = 'supabase') =>
    invokeExport({
      filename: filename.endsWith('.json') ? filename : `${filename}.json`,
      format: 'json',
      content: typeof content === 'string' ? content : JSON.stringify(content, null, 2),
      destination,
    }),
  exportToOneDrive: (filename: string, content: string, format: ExportFormat = 'txt') =>
    invokeExport({ filename, format, content, destination: 'onedrive' }),
  async listExports() {
    const { data } = await supabase
      .from('exports')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(50);
    return data ?? [];
  },
  async createSimulated(name: string, format: ExportFormat) {
    return {
      mode: 'mock' as const,
      name,
      format,
      preview: `# ${name}\n\n(Simulation — sera persisté via export-text une fois validé.)`,
    };
  },
};
